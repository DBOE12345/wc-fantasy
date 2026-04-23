import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { TEAMS, TEAM_MAP, SCORING, STAGE_LABELS } from '../lib/teams'
import { snakeOrder } from '../lib/draft'
import { simulateBracket } from '../lib/bracket'
import { fetchFixtures, calcTotalPoints } from '../lib/api'
import Flag from '../components/Flag'

const AV_BG = ['#1a3a2a','#1a2a3a','#3a2a1a','#2a1a3a','#3a1a1a','#1a3a3a','#2a3a1a','#3a3a1a']
const AV_FG = ['#5DCAA5','#85B7EB','#FAC775','#AFA9EC','#F09595','#5DCAA5','#C0DD97','#FAC775']
const BAR_C = ['#1D9E75','#378ADD','#EF9F27','#D85A30','#7F77DD','#639922','#D4537E','#888780']
const STAGE_CSS = {
  'Champion':'stage-ch','Runner-up':'stage-ru','Semi-final':'stage-sf',
  'Quarter-final':'stage-qf','Round of 16':'stage-r16','Round of 32':'stage-r32','Group stage':'stage-gs'
}
const PICK_TIMER = 60

// Determine whose turn it is given draft position and league size
function getTurn(draftPos, leagueSize) {
  const order = []
  const tpp = 48 / leagueSize
  for (let round = 0; round < tpp; round++) {
    const players = [...Array(leagueSize).keys()]
    if (round % 2 === 1) players.reverse()
    players.forEach(i => order.push(i))
  }
  return order[draftPos] ?? null
}

export default function LeaguePage() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [league, setLeague] = useState(null)
  const [members, setMembers] = useState([])
  const [picks, setPicks] = useState({})
  const [mySlot, setMySlot] = useState(0)
  const [bracket, setBracket] = useState(null)
  const [fixtures, setFixtures] = useState([])
  const [tab, setTab] = useState('league')
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [timeLeft, setTimeLeft] = useState(PICK_TIMER)
  const [draftStarted, setDraftStarted] = useState(false)
  const [scheduledTime, setScheduledTime] = useState('')
  const [savingSchedule, setSavingSchedule] = useState(false)
  const timerRef = useRef(null)

  const load = useCallback(async () => {
    const { data: lg } = await supabase.from('leagues').select('*').eq('id', id).single()
    if (!lg) { navigate('/'); return }
    setLeague(lg)
    setDraftStarted(!!lg.draft_started)
    if (lg.scheduled_at) setScheduledTime(lg.scheduled_at.slice(0, 16))

    const { data: mems } = await supabase
      .from('league_members')
      .select('*, profiles(username, email)')
      .eq('league_id', id)
      .order('draft_slot')
    setMembers(mems || [])

    const me = mems?.find(m => m.user_id === user.id)
    setMySlot(me?.draft_slot ?? 0)

    const { data: pickData } = await supabase
      .from('picks').select('team_name, user_id').eq('league_id', id)
    const pickMap = {}
    pickData?.forEach(p => { pickMap[p.team_name] = p.user_id })
    setPicks(pickMap)

    if (lg.bracket_data) setBracket(JSON.parse(lg.bracket_data))
    else if (Object.keys(pickMap).length >= 48) {
      const b = simulateBracket()
      setBracket(b)
      await supabase.from('leagues').update({ bracket_data: JSON.stringify(b) }).eq('id', id)
    }
    setLoading(false)
  }, [id, user.id, navigate])

  useEffect(() => {
    load()
    const channel = supabase.channel(`league_${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'picks', filter: `league_id=eq.${id}` }, () => { load(); setTimeLeft(PICK_TIMER) })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leagues', filter: `id=eq.${id}` }, () => load())
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [load, id])

  // Timer - only counts down when it's MY turn
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    const draftPos = league?.draft_pos || 0
    const leagueSize = league?.size || 4
    const whoseTurn = getTurn(draftPos, leagueSize)
    const draftDoneNow = draftPos >= (48 / leagueSize) * leagueSize || Object.keys(picks).length >= 48
    const isMyTurnNow = draftStarted && !draftDoneNow && whoseTurn === mySlot
    if (!isMyTurnNow) {
      setTimeLeft(PICK_TIMER)
      return
    }
    setTimeLeft(PICK_TIMER)
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current)
          // Auto pick for me since time ran out
          const available = TEAMS.filter(t => !picks[t.n])
          if (available.length > 0) {
            const auto = available[Math.floor(Math.random() * Math.min(available.length, 5))]
            makePick(auto.n, true)
          }
          return PICK_TIMER
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [league?.draft_pos, draftStarted, mySlot, league?.size])

  async function makePick(teamName, isAuto = false) {
    if (!draftStarted) return

    // Always fetch fresh state from DB before making a pick
    const { data: freshLeague } = await supabase
      .from('leagues').select('draft_pos, size, draft_started').eq('id', id).single()
    if (!freshLeague || !freshLeague.draft_started) return

    const tpp = 48 / freshLeague.size
    const whoseTurn = getTurn(freshLeague.draft_pos, freshLeague.size)

    // Only allow picking if it's this player's turn
    if (whoseTurn !== mySlot) return

    // Check team not already picked
    const { data: existingPick } = await supabase
      .from('picks').select('id').eq('league_id', id).eq('team_name', teamName).single()
    if (existingPick) return

    // Check player hasn't exceeded their allotment
    const { count: myCount } = await supabase
      .from('picks').select('id', { count: 'exact' }).eq('league_id', id).eq('user_id', user.id)
    if ((myCount || 0) >= tpp) return

    // Insert pick
    const { error } = await supabase.from('picks').insert({
      league_id: id, user_id: user.id, team_name: teamName
    })
    if (error) return

    // Advance draft position by exactly 1
    await supabase.from('leagues').update({
      draft_pos: freshLeague.draft_pos + 1
    }).eq('id', id)
  }

  async function startDraft() {
    await supabase.from('leagues').update({ draft_started: true }).eq('id', id)
    setDraftStarted(true)
  }

  async function saveSchedule() {
    if (!scheduledTime) return
    setSavingSchedule(true)
    await supabase.from('leagues').update({ scheduled_at: scheduledTime }).eq('id', id)
    setSavingSchedule(false)
    alert('Draft time saved!')
  }

  function copyCode() {
    navigator.clipboard.writeText(league?.code || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function getDisplayName(m) {
    if (!m) return 'TBD'
    return m.profiles?.username || m.profiles?.email?.split('@')[0] || `Player ${(m.draft_slot ?? 0) + 1}`
  }

  function computePoints() {
    const stageBonus = bracket?.stageBonus || {}
    return members.map(m => {
      const mPicks = Object.entries(picks).filter(([, uid]) => uid === m.user_id).map(([t]) => t)
      const { total, breakdown } = calcTotalPoints(fixtures, mPicks, stageBonus)
      return { ...m, computedPts: total, breakdown, teamPicks: mPicks }
    }).sort((a, b) => b.computedPts - a.computedPts)
  }

  if (loading) return <div className="container page-wrap"><div className="empty">Loading league...</div></div>

  const tpp = 48 / (league?.size || 4)
  const order = snakeOrder(league?.size || 4, 48)
  const draftPos = league?.draft_pos || 0
  const currentTurn = order[draftPos]
  const isMyTurn = currentTurn === mySlot
  const draftDone = draftPos >= order.length || Object.keys(picks).length >= 48
  const myPicks = Object.entries(picks).filter(([, uid]) => uid === user.id).map(([t]) => t)
  const rankedMembers = computePoints()
  const maxPts = Math.max(1, rankedMembers[0]?.computedPts || 1)
  const isCommissioner = league?.creator_id === user.id
  const timerColor = timeLeft > 30 ? '#5DCAA5' : timeLeft > 10 ? '#FAC775' : '#F09595'

  return (
    <div>
      <div className="app-header">
        <div className="header-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="btn btn-ghost" onClick={() => navigate('/')} style={{ padding: '6px 8px' }}>←</button>
            <div className="logo"><div className="logo-dot" />{league?.name}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--text3)', letterSpacing: '.1em' }}>{league?.code}</span>
            <button className="btn btn-ghost" onClick={copyCode}>{copied ? '✓' : 'Copy'}</button>
          </div>
        </div>
      </div>

      <div className="container page-wrap">
        <div className="tabs">
          <button className={`tab ${tab==='league'?'active':''}`} onClick={() => setTab('league')}>League</button>
          <button className={`tab ${tab==='draft'?'active':''}`} onClick={() => setTab('draft')}>
            Draft {draftStarted && !draftDone && isMyTurn && <span style={{ marginLeft: 5, width: 7, height: 7, borderRadius: '50%', background: 'var(--green)', display: 'inline-block' }} />}
          </button>
          <button className={`tab ${tab==='myteams'?'active':''}`} onClick={() => setTab('myteams')}>My Teams</button>
          <button className={`tab ${tab==='bracket'?'active':''}`} onClick={() => setTab('bracket')}>Bracket</button>
          <button className={`tab ${tab==='scoring'?'active':''}`} onClick={() => setTab('scoring')}>Scoring</button>
        </div>

        {/* LEAGUE TAB */}
        {tab === 'league' && (
          <>
            <div className="metric-grid">
              <div className="metric"><div className="metric-label">Players</div><div className="metric-value">{members.length}/{league?.size}</div></div>
              <div className="metric"><div className="metric-label">Teams each</div><div className="metric-value">{tpp}</div></div>
              <div className="metric"><div className="metric-label">Drafted</div><div className="metric-value">{Object.keys(picks).length}/48</div></div>
              <div className="metric"><div className="metric-label">Draft</div><div className="metric-value" style={{ fontSize: 14, paddingTop: 4 }}>
                <span className={`badge ${draftDone ? 'badge-green' : draftStarted ? 'badge-amber' : 'badge-gray'}`}>
                  {draftDone ? 'Complete' : draftStarted ? 'Live' : 'Pending'}
                </span>
              </div></div>
            </div>

            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <div className="card-title">Invite code</div>
              <div className="code-box">
                <span className="code-text">{league?.code}</span>
                <button className="btn btn-secondary" style={{ fontSize: 13, padding: '6px 14px' }} onClick={copyCode}>{copied ? 'Copied!' : 'Copy'}</button>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text3)' }}>Share this code with friends to join your league</p>
            </div>

            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <div className="card-title">Draft schedule</div>
              {league?.scheduled_at && (
                <div style={{ marginBottom: 12, fontSize: 14, color: 'var(--text2)' }}>
                  📅 Scheduled for: <strong style={{ color: 'var(--text)' }}>{new Date(league.scheduled_at).toLocaleString()}</strong>
                </div>
              )}
              {isCommissioner && !draftStarted && (
                <>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                    <input type="datetime-local" className="input" style={{ flex: 1 }} value={scheduledTime} onChange={e => setScheduledTime(e.target.value)} />
                    <button className="btn btn-secondary" onClick={saveSchedule} disabled={savingSchedule}>{savingSchedule ? 'Saving...' : 'Save time'}</button>
                  </div>
                  <button className="btn btn-primary" onClick={startDraft} style={{ width: '100%' }}>🚀 Start draft now</button>
                </>
              )}
              {!isCommissioner && !draftStarted && <p style={{ fontSize: 14, color: 'var(--text2)' }}>Waiting for the commissioner to start the draft.</p>}
              {draftStarted && !draftDone && <p style={{ fontSize: 14, color: '#5DCAA5', fontWeight: 500 }}>🟢 Draft is live! Each player has 60 seconds per pick.</p>}
              {draftDone && <p style={{ fontSize: 14, color: '#5DCAA5', fontWeight: 500 }}>✅ Draft complete!</p>}
            </div>

            <div className="card-title">Leaderboard</div>
            <div className="card">
              {rankedMembers.map((m, i) => (
                <div key={m.id} className="row">
                  <span style={{ fontSize: 13, color: 'var(--text3)', minWidth: 20, fontWeight: 500 }}>{i + 1}</span>
                  <div className="avatar" style={{ background: AV_BG[m.draft_slot % 8], color: AV_FG[m.draft_slot % 8] }}>
                    {getDisplayName(m).slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontWeight: 500, fontSize: 14 }}>
                        {getDisplayName(m)} {m.user_id === user.id && <span style={{ fontSize: 11, color: 'var(--text3)' }}>(you)</span>}
                      </span>
                      <span style={{ fontWeight: 600, fontSize: 15 }}>{m.computedPts} pts</span>
                    </div>
                    <div className="lb-bar-wrap">
                      <div className="lb-bar" style={{ width: `${Math.round(m.computedPts / maxPts * 100)}%`, background: BAR_C[m.draft_slot % 8] }} />
                    </div>
                    <div style={{ marginTop: 5, display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
                      {m.teamPicks.slice(0, 6).map(t => <Flag key={t} team={t} size={14} />)}
                      {m.teamPicks.length > 6 && <span style={{ fontSize: 11, color: 'var(--text3)' }}>+{m.teamPicks.length - 6}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* DRAFT TAB */}
        {tab === 'draft' && (
          <>
            {!draftStarted ? (
              <div style={{ background: 'rgba(255,255,255,.05)', border: '1px solid var(--border)', borderRadius: 10, padding: 16, marginBottom: '1.25rem', textAlign: 'center' }}>
                <p style={{ fontSize: 14, color: 'var(--text2)', marginBottom: isCommissioner ? 12 : 0 }}>
                  {league?.scheduled_at ? `Draft starts ${new Date(league.scheduled_at).toLocaleString()}` : 'Waiting for commissioner to start the draft'}
                </p>
                {isCommissioner && <button className="btn btn-primary" onClick={startDraft}>🚀 Start draft now</button>}
              </div>
            ) : draftDone ? (
              <div style={{ background: 'rgba(29,158,117,.1)', border: '1px solid rgba(29,158,117,.3)', borderRadius: 10, padding: '12px 16px', marginBottom: '1.25rem', fontSize: 14, color: '#5DCAA5', fontWeight: 500 }}>
                ✅ Draft complete — all 48 teams assigned!
              </div>
            ) : (
              <div className="turn-banner" style={{ justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div className="turn-dot" />
                  <div className="turn-text">
                    {isMyTurn ? `Your pick — ${myPicks.length + 1} of ${tpp}` : `Waiting for ${getDisplayName(members[currentTurn])}...`}
                  </div>
                </div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 24, fontWeight: 700, color: timerColor }}>{timeLeft}s</div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text3)', marginBottom: 6 }}>
              <span>Draft progress</span><span>{Object.keys(picks).length} / 48</span>
            </div>
            <div className="prog-wrap">
              <div className="prog-fill" style={{ width: `${Math.round(Object.keys(picks).length / 48 * 100)}%` }} />
            </div>

            <div className="card-title" style={{ marginBottom: 10 }}>All 48 teams — tap to pick</div>
            {['A','B','C','D','E','F','G','H','I','J','K','L'].map(group => (
              <div key={group} style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 7 }}>
                  Group {group}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 7 }}>
                  {TEAMS.filter(t => t.g === group).map(t => {
                    const owner = picks[t.n]
                    const isMine = owner === user.id
                    const isTaken = owner && !isMine
                    const canPick = draftStarted && isMyTurn && !draftDone && !isTaken && !isMine
                    return (
                      <div key={t.n} className={`team-card ${isMine ? 'mine' : ''} ${isTaken ? 'taken' : ''}`} onClick={() => canPick && makePick(t.n)} style={{ cursor: canPick ? 'pointer' : isTaken ? 'not-allowed' : 'default' }}>
                        {isMine && <div className="pick-check">✓</div>}
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 5 }}><Flag team={t.n} size={22} /></div>
                        <div className="tname">{t.n}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}

            <div className="card-title">Draft order</div>
            {order.slice(Math.max(0, draftPos - 1), Math.min(order.length, draftPos + (league?.size || 4) + 2)).map((pi, i) => {
              const absPos = Math.max(0, draftPos - 1) + i
              const m = members[pi]
              const isCur = absPos === draftPos && !draftDone && draftStarted
              return (
                <div key={absPos} className={`order-row ${isCur ? 'current' : ''}`}>
                  <span style={{ fontSize: 12, color: 'var(--text3)', minWidth: 20 }}>{absPos + 1}</span>
                  <div className="avatar" style={{ width: 26, height: 26, fontSize: 10, background: AV_BG[pi % 8], color: AV_FG[pi % 8] }}>
                    {m ? getDisplayName(m).slice(0, 2).toUpperCase() : `P${pi + 1}`}
                  </div>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: isCur ? '#5DCAA5' : 'var(--text)' }}>
                    {m ? getDisplayName(m) : `Player ${pi + 1} (TBD)`}
                  </span>
                  {isCur && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: 'rgba(29,158,117,.15)', color: '#5DCAA5' }}>picking now</span>}
                </div>
              )
            })}
          </>
        )}

        {/* MY TEAMS TAB */}
        {tab === 'myteams' && (
          <>
            <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>My Teams</h2>
            <p style={{ fontSize: 14, color: 'var(--text2)', marginBottom: '1.5rem' }}>{myPicks.length} of {tpp} teams drafted</p>
            {myPicks.length === 0 ? (
              <div className="empty"><div className="empty-icon">🏳️</div><p>No picks yet — head to Draft to start</p></div>
            ) : (
              <>
                <div style={{ display: 'flex', flexWrap: 'wrap', marginBottom: '1.5rem', gap: 6 }}>
                  {myPicks.map(n => (
                    <div key={n} className="team-tag">
                      <Flag team={n} size={16} />
                      <span style={{ marginLeft: 4 }}>{n}</span>
                    </div>
                  ))}
                </div>
                <div className="card-title">Points breakdown</div>
                <div className="card">
                  <table className="pts-table">
                    <thead><tr><th>Team</th><th>Stage</th><th>Match pts</th><th>Bonus</th><th>Total</th></tr></thead>
                    <tbody>
                      {myPicks.map(n => {
                        const stageBonus = bracket?.stageBonus || {}
                        const bonus = stageBonus[n] || 0
                        let stageLabel = 'Group stage'
                        if (bracket) {
                          if (bracket.champ?.n === n) stageLabel = 'Champion'
                          else {
                            for (const { d, l } of [
                              { d: bracket.final, l: 'Runner-up' },
                              { d: bracket.sf, l: 'Semi-final' },
                              { d: bracket.qf, l: 'Quarter-final' },
                              { d: bracket.r16, l: 'Round of 16' },
                              { d: bracket.r32, l: 'Round of 32' },
                            ]) { if (d?.some(m => m.w?.n === n)) { stageLabel = l; break } }
                          }
                        }
                        const memberData = rankedMembers.find(m => m.user_id === user.id)
                        const breakdown = memberData?.breakdown?.[n]
                        const matchPts = Math.max(0, (breakdown?.pts || 0) - bonus)
                        return (
                          <tr key={n}>
                            <td><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Flag team={n} size={16} />{n}</div></td>
                            <td><span className={`badge ${STAGE_CSS[stageLabel] || 'stage-gs'}`}>{stageLabel}</span></td>
                            <td style={{ fontFamily: 'var(--mono)' }}>{matchPts > 0 ? `+${matchPts}` : '—'}</td>
                            <td style={{ fontFamily: 'var(--mono)' }}>{bonus > 0 ? `+${bonus}` : '—'}</td>
                            <td style={{ fontWeight: 600, fontFamily: 'var(--mono)' }}>{breakdown?.pts || 0}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}

        {/* BRACKET TAB */}
        {tab === 'bracket' && (
          <>
            <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>Tournament Bracket</h2>
            <p style={{ fontSize: 14, color: 'var(--text2)', marginBottom: '1.5rem' }}>Simulated — your teams are highlighted in green.</p>
            {!bracket ? (
              <div className="empty"><p>Bracket generates once the draft is complete.</p></div>
            ) : (
              <div className="bracket-scroll">
                <div className="bracket">
                  {[
                    { label: 'R32', matches: bracket.r32 },
                    { label: 'R16', matches: bracket.r16 },
                    { label: 'QF', matches: bracket.qf },
                    { label: 'SF', matches: bracket.sf },
                    { label: 'Final', matches: bracket.final },
                  ].map(({ label, matches }) => matches?.length ? (
                    <div key={label} className="b-round">
                      <div className="b-round-title">{label}</div>
                      <div className="b-matches">
                        {matches.map((m, i) => (
                          <div key={i} className="b-match">
                            {[{ team: m.a, goals: m.ag }, { team: m.b, goals: m.bg }].map(({ team, goals }, ti) => (
                              <div key={ti} className={`b-team ${m.w?.n === team?.n ? 'winner' : ''} ${myPicks.includes(team?.n) ? 'my-team' : ''}`}>
                                <Flag team={team?.n} size={12} />
                                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginLeft: 4 }}>{team?.n}</span>
                                <span className="b-score">{goals}</span>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null)}
                  {bracket.champ && (
                    <div className="b-round">
                      <div className="b-round-title">🏆</div>
                      <div className="b-matches">
                        <div className="b-match">
                          <div className={`b-team winner ${myPicks.includes(bracket.champ.n) ? 'my-team' : ''}`}>
                            <Flag team={bracket.champ.n} size={12} />
                            <span style={{ marginLeft: 4 }}>{bracket.champ.n}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* SCORING TAB */}
        {tab === 'scoring' && (
          <>
            <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>Scoring Rules</h2>
            <p style={{ fontSize: 14, color: 'var(--text2)', marginBottom: '1.5rem' }}>Points tallied after every match</p>
            <div className="card" style={{ marginBottom: 12 }}>
              <div className="card-title">Match results</div>
              <table className="pts-table"><tbody>
                <tr><td>Win</td><td style={{ fontWeight: 600, fontFamily: 'var(--mono)' }}>+5 pts</td></tr>
                <tr><td>Draw</td><td style={{ fontWeight: 600, fontFamily: 'var(--mono)' }}>+2 pts</td></tr>
                <tr><td>Loss</td><td style={{ fontWeight: 600, fontFamily: 'var(--mono)' }}>0 pts</td></tr>
              </tbody></table>
            </div>
            <div className="card" style={{ marginBottom: 12 }}>
              <div className="card-title">Goals & defending</div>
              <table className="pts-table"><tbody>
                <tr><td>Each goal scored</td><td style={{ fontWeight: 600, fontFamily: 'var(--mono)' }}>+1 pt</td></tr>
                <tr><td>4+ goals in a match</td><td style={{ fontWeight: 600, fontFamily: 'var(--mono)' }}>+2 bonus</td></tr>
                <tr><td>Clean sheet</td><td style={{ fontWeight: 600, fontFamily: 'var(--mono)' }}>+3 pts</td></tr>
              </tbody></table>
            </div>
            <div className="card">
              <div className="card-title">Tournament advancement</div>
              <table className="pts-table"><tbody>
                {Object.entries(STAGE_LABELS).map(([key, label]) => (
                  <tr key={key}>
                    <td><span className={`badge stage-${key}`}>{label}</span></td>
                    <td style={{ fontWeight: 600, fontFamily: 'var(--mono)' }}>+{SCORING[key]} pts</td>
                  </tr>
                ))}
              </tbody></table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
