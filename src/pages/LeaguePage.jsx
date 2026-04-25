import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { TEAMS, TEAM_MAP, SCORING, STAGE_LABELS } from '../lib/teams'
import { snakeOrder } from '../lib/draft'
import { simulateBracket } from '../lib/bracket'
import { fetchFixtures, calcTotalPoints } from '../lib/api'
import Flag from '../components/Flag'
import DubUpLogo, { DubUpLogoHorizontal } from '../components/DubUpLogo'

const AV_BG = ['#1a3a2a','#1a2a3a','#3a2a1a','#2a1a3a','#3a1a1a','#1a3a3a','#2a3a1a','#3a3a1a']
const AV_FG = ['#5DCAA5','#85B7EB','#FAC775','#AFA9EC','#F09595','#5DCAA5','#C0DD97','#FAC775']
const BAR_C = ['#1D9E75','#378ADD','#EF9F27','#D85A30','#7F77DD','#639922','#D4537E','#888780']
const STAGE_CSS = {
  'Champion':'stage-ch','Runner-up':'stage-ru','Semi-final':'stage-sf',
  'Quarter-final':'stage-qf','Round of 16':'stage-r16','Round of 32':'stage-r32','Group stage':'stage-gs'
}
const PICK_TIMER = 60

// Sound effects using Web Audio API
let audioCtx = null
function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  if (audioCtx.state === 'suspended') audioCtx.resume()
  return audioCtx
}

function playSound(type) {
  try {
    const ctx = getAudioCtx()

    if (type === 'draft_start') {
      // Stadium horn + crowd build up
      const hornNotes = [220, 277, 330, 440]
      hornNotes.forEach((freq, i) => {
        const t = ctx.currentTime + i * 0.15
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain); gain.connect(ctx.destination)
        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq, t)
        osc.frequency.linearRampToValueAtTime(freq * 1.02, t + 0.4)
        gain.gain.setValueAtTime(0, t)
        gain.gain.linearRampToValueAtTime(0.22, t + 0.04)
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5)
        osc.start(t); osc.stop(t + 0.5)
        // Add harmonic overtone
        const osc2 = ctx.createOscillator()
        const gain2 = ctx.createGain()
        osc2.connect(gain2); gain2.connect(ctx.destination)
        osc2.type = 'triangle'
        osc2.frequency.value = freq * 2
        gain2.gain.setValueAtTime(0, t)
        gain2.gain.linearRampToValueAtTime(0.06, t + 0.04)
        gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.4)
        osc2.start(t); osc2.stop(t + 0.4)
      })
    }

    if (type === 'pick') {
      // Short crowd cheer burst — noise swell
      const bufferSize = ctx.sampleRate * 0.4
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
      const data = buffer.getChannelData(0)
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1
      const source = ctx.createBufferSource()
      source.buffer = buffer
      const filter = ctx.createBiquadFilter()
      filter.type = 'bandpass'
      filter.frequency.value = 800
      filter.Q.value = 0.8
      const gain = ctx.createGain()
      source.connect(filter); filter.connect(gain); gain.connect(ctx.destination)
      gain.gain.setValueAtTime(0, ctx.currentTime)
      gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.05)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
      source.start(ctx.currentTime); source.stop(ctx.currentTime + 0.4)
    }

    if (type === 'complete') {
      // Victory chime sequence
      const melody = [523, 659, 784, 1047, 784, 1047, 1319]
      const durations = [0.15, 0.15, 0.15, 0.3, 0.1, 0.1, 0.5]
      let t = ctx.currentTime
      melody.forEach((freq, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain); gain.connect(ctx.destination)
        osc.type = 'sine'
        osc.frequency.value = freq
        gain.gain.setValueAtTime(0, t)
        gain.gain.linearRampToValueAtTime(0.2, t + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.001, t + durations[i])
        osc.start(t); osc.stop(t + durations[i])
        // Bell overtone
        const osc2 = ctx.createOscillator()
        const gain2 = ctx.createGain()
        osc2.connect(gain2); gain2.connect(ctx.destination)
        osc2.type = 'triangle'
        osc2.frequency.value = freq * 3
        gain2.gain.setValueAtTime(0, t)
        gain2.gain.linearRampToValueAtTime(0.05, t + 0.01)
        gain2.gain.exponentialRampToValueAtTime(0.001, t + durations[i] * 0.6)
        osc2.start(t); osc2.stop(t + durations[i])
        t += durations[i] * 0.85
      })
    }
  } catch(e) {
    console.log('Sound not supported:', e)
  }
}

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
  const { user, signOut } = useAuth()
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
  const [picksOrdered, setPicksOrdered] = useState([])
  const [draftComplete, setDraftComplete] = useState(false)
  const [selectedPlayer, setSelectedPlayer] = useState(null)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [myProfile, setMyProfile] = useState(null)
  const [viewingPlayer, setViewingPlayer] = useState(null) // for My Teams dropdown
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [sendingChat, setSendingChat] = useState(false)
  const [countdown, setCountdown] = useState(null)
  const chatEndRef = useRef(null)
  const [scheduledTime, setScheduledTime] = useState('')
  const [savingSchedule, setSavingSchedule] = useState(false)
  const timerRef = useRef(null)
  const pickingRef = useRef(false) // prevents double picks

  const load = useCallback(async () => {
    const { data: lg } = await supabase.from('leagues').select('*').eq('id', id).single()
    if (!lg) { navigate('/'); return }
    setLeague(lg)
    if (lg.scheduled_at) setScheduledTime(lg.scheduled_at.slice(0, 16))
    // draft_started will be set after we load picks below

    // Fetch members without profiles join first (more reliable)
    const { data: mems, error: memsError } = await supabase
      .from('league_members')
      .select('*')
      .eq('league_id', id)
      .order('draft_slot')
    
    if (memsError) console.error('Members error:', memsError)
    
    // Try to get profiles separately
    const memsWithProfiles = await Promise.all((mems || []).map(async m => {
      const { data: profile } = await supabase
        .from('profiles').select('username, email').eq('id', m.user_id).single()
      return { ...m, profiles: profile || null }
    }))
    
    setMembers(memsWithProfiles)
    const me = memsWithProfiles.find(m => m.user_id === user.id)
    const myDraftSlot = me?.draft_slot ?? null
    if (myDraftSlot !== null) setMySlot(myDraftSlot)
    console.log('My slot:', myDraftSlot, 'All members:', memsWithProfiles.map(m => ({ slot: m.draft_slot, uid: m.user_id.slice(0,8) })))

    const { data: pickData } = await supabase
      .from('picks').select('team_name, user_id, picked_at').eq('league_id', id).order('picked_at')
    const pickMap = {}
    pickData?.forEach(p => { pickMap[p.team_name] = p.user_id })
    setPicks(pickMap)
    setPicksOrdered(pickData || [])

    // Only treat draft as started if DB says so AND there are actual picks OR draft_pos > 0
    const actuallyStarted = !!lg.draft_started && (lg.draft_pos > 0 || (pickData?.length || 0) > 0)
    setDraftStarted(actuallyStarted)
    // If DB says started but no picks exist, clean up the stale state
    if (!!lg.draft_started && !actuallyStarted) {
      await supabase.from('leagues').update({ draft_started: false, draft_pos: 0 }).eq('id', lg.id)
    }

    if (lg.bracket_data) setBracket(JSON.parse(lg.bracket_data))
    else if (Object.keys(pickMap).length >= 48) {
      const b = simulateBracket()
      setBracket(b)
      await supabase.from('leagues').update({ bracket_data: JSON.stringify(b) }).eq('id', id)
    }
    // Load chat messages
    const { data: msgs } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('league_id', id)
      .order('created_at')
      .limit(50)
    setChatMessages(msgs || [])

    // Load my profile for avatar
    const { data: profileData } = await supabase.from('profiles').select('username, avatar_url').eq('id', user.id).single()
    if (profileData) setMyProfile(profileData)

    setLoading(false)
  }, [id, user.id, navigate])

  useEffect(() => {
    load()
    const channel = supabase.channel(`league_${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'picks', filter: `league_id=eq.${id}` }, (payload) => {
        const newPick = payload.new
        if (newPick) {
          setPicks(prev => ({ ...prev, [newPick.team_name]: newPick.user_id }))
          setPicksOrdered(prev => [...prev, newPick])
          setTimeLeft(PICK_TIMER)
        }
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'picks', filter: `league_id=eq.${id}` }, (payload) => {
        // Pick was reversed — remove it from local state
        const deleted = payload.old
        if (deleted?.team_name) {
          setPicks(prev => {
            const next = { ...prev }
            delete next[deleted.team_name]
            return next
          })
          setPicksOrdered(prev => prev.filter(p => p.team_name !== deleted.team_name))
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'leagues', filter: `id=eq.${id}` }, (payload) => {
        const updated = payload.new
        if (updated) {
          setLeague(updated)
          const nowStarted = !!updated.draft_started
          setDraftStarted(prev => {
            if (!prev && nowStarted && !didStartRef.current) {
              try { getAudioCtx(); setTimeout(() => playSound('draft_start'), 200) } catch(e) {}
            }
            // Draft was restarted — clear all local state
            if (prev && !nowStarted && updated.draft_pos === 0) {
              setPicks({})
              setPicksOrdered([])
              setBracket(null)
              setTimeLeft(PICK_TIMER)
            }
            return nowStarted
          })
          if (updated.bracket_data) {
            try { setBracket(JSON.parse(updated.bracket_data)) } catch(e) {}
          } else if (!updated.draft_started && updated.draft_pos === 0) {
            // Draft was reset
            setBracket(null)
          }
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `league_id=eq.${id}` }, (payload) => {
        if (payload.new) setChatMessages(prev => [...prev, payload.new])
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [load, id])

  // Draft countdown timer + auto-start
  useEffect(() => {
    if (!league?.scheduled_at || draftStarted) { setCountdown(null); return }
    const tick = async () => {
      const diff = new Date(league.scheduled_at) - new Date()
      if (diff <= 0) {
        setCountdown(null)
        // Auto-start the draft!
        if (!draftStarted) {
          await supabase.from('leagues').update({ draft_started: true, bracket_data: null }).eq('id', id)
          setDraftStarted(true)
          didStartRef.current = true
          try { getAudioCtx(); setTimeout(() => playSound('draft_start'), 100) } catch(e) {}
        }
        return
      }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setCountdown(h > 0 ? `${h}h ${m}m ${s}s` : m > 0 ? `${m}m ${s}s` : `${s}s`)
    }
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [league?.scheduled_at, draftStarted, id])

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  // Timer - runs for everyone when draft is active, auto-picks when MY turn expires
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    const draftPos = league?.draft_pos || 0
    const leagueSize = league?.size || 4
    const whoseTurn = getTurn(draftPos, leagueSize)
    const draftDoneNow = draftPos >= (48 / leagueSize) * leagueSize || Object.keys(picks).length >= 48
    const isMyTurnNow = draftStarted && !draftDoneNow && whoseTurn === mySlot
    // Always reset timer when turn changes
    setTimeLeft(PICK_TIMER)
    // Run clock for everyone when draft is active so all players see it ticking
    if (!draftStarted || draftDoneNow) return
    // Send notification when it becomes my turn
    if (isMyTurnNow) sendPickNotification()
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev === 10) {
          // Start ticking sound at 10 seconds
          try {
            const ctx = getAudioCtx()
            let tickCount = 0
            const tickInterval = setInterval(() => {
              if (tickCount >= 9) { clearInterval(tickInterval); return }
              const osc = ctx.createOscillator()
              const gain = ctx.createGain()
              osc.connect(gain); gain.connect(ctx.destination)
              osc.frequency.value = 880
              osc.type = 'sine'
              gain.gain.setValueAtTime(0.06, ctx.currentTime)
              gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08)
              osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.08)
              tickCount++
            }, 1000)
          } catch(e) {}
        }
        if (prev <= 1) {
          clearInterval(timerRef.current)
          // Time ran out — auto pick for whoever's turn it is (works even if they're not on draft tab)
          setTimeout(async () => {
            const { data: freshLeague } = await supabase
              .from('leagues').select('draft_pos, size, draft_started').eq('id', id).single()
            if (!freshLeague?.draft_started) return
            const whoseTurn = getTurn(freshLeague.draft_pos, freshLeague.size)
            // Find the member whose turn it is
            const { data: members2 } = await supabase
              .from('league_members').select('user_id, draft_slot').eq('league_id', id)
            const turnMember = members2?.find(m => m.draft_slot === whoseTurn)
            // Only the first player alphabetically triggers auto-pick to avoid duplicates
            // Use the logged-in user only if it's their slot, OR if no one else will do it (slot 0 always fires as fallback)
            if (whoseTurn !== mySlot && mySlot !== 0) return
            if (whoseTurn !== mySlot && mySlot === 0) {
              // I'm slot 0 acting as fallback — only fire if the real owner hasn't picked
              const { data: recentPick } = await supabase
                .from('picks').select('picked_at').eq('league_id', id)
                .order('picked_at', { ascending: false }).limit(1).single()
              const lastPickTime = recentPick?.picked_at ? new Date(recentPick.picked_at) : null
              if (lastPickTime && (new Date() - lastPickTime) < 58000) return // someone picked recently
            }
            const { data: existingPicks } = await supabase
              .from('picks').select('team_name').eq('league_id', id)
            const takenNames = new Set(existingPicks?.map(p => p.team_name) || [])
            const available = TEAMS.filter(t => !takenNames.has(t.n))
            if (!available.length) return
            const auto = available[Math.floor(Math.random() * available.length)]
            const tpp = 48 / freshLeague.size
            const pickUserId = turnMember?.user_id || user.id
            const { count: theirCount } = await supabase
              .from('picks').select('id', { count: 'exact', head: true })
              .eq('league_id', id).eq('user_id', pickUserId)
            if ((theirCount || 0) >= tpp) return
            const { error } = await supabase.from('picks').insert({
              league_id: id, user_id: pickUserId, team_name: auto.n
            })
            if (!error) {
              await supabase.from('leagues').update({ draft_pos: freshLeague.draft_pos + 1 }).eq('id', id)
            }
          }, 100)
          return PICK_TIMER
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [league?.draft_pos, draftStarted, mySlot, league?.size])

  async function makePick(teamName, isAuto = false) {
    if (!draftStarted) return
    if (pickingRef.current) return
    pickingRef.current = true

    try {
      // Always fetch fresh state from DB
      const { data: freshLeague } = await supabase
        .from('leagues').select('draft_pos, size, draft_started').eq('id', id).single()
      if (!freshLeague || !freshLeague.draft_started) return

      const tpp = 48 / freshLeague.size
      const whoseTurn = getTurn(freshLeague.draft_pos, freshLeague.size)

      // Only allow picking if it's this player's turn
      if (whoseTurn !== mySlot) return

      // Check team not already picked
      const { count: existingCount } = await supabase
        .from('picks').select('id', { count: 'exact', head: true }).eq('league_id', id).eq('team_name', teamName)
      if (existingCount && existingCount > 0) return

      // Check player hasn't exceeded their allotment
      const { count: myCount } = await supabase
        .from('picks').select('id', { count: 'exact', head: true }).eq('league_id', id).eq('user_id', user.id)
      if ((myCount || 0) >= tpp) return

      // Insert pick
      const { error } = await supabase.from('picks').insert({
        league_id: id, user_id: user.id, team_name: teamName
      })
      if (error) return

      setPicksOrdered(prev => [...prev, { team_name: teamName, user_id: user.id, picked_at: new Date().toISOString() }])
      playSound('pick')

      // Advance draft by exactly 1
      await supabase.from('leagues').update({ draft_pos: freshLeague.draft_pos + 1 }).eq('id', id)

      // Check if complete
      const { count: totalCount } = await supabase
        .from('picks').select('id', { count: 'exact', head: true }).eq('league_id', id)
      if ((totalCount || 0) >= 48) { setDraftComplete(true); playSound('complete') }

    } finally {
      // ALWAYS release the lock no matter what
      pickingRef.current = false
    }
  }

  async function startDraft() {
    getAudioCtx()
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission()
    }
    await supabase.from('leagues').update({ draft_started: true, bracket_data: null }).eq('id', id)
    setDraftStarted(true)
    setTimeout(() => playSound('draft_start'), 100)
  }

  // Track whether WE triggered the draft start (vs loading into an already-started draft)
  const didStartRef = useRef(false)

  function sendPickNotification(playerName) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('⚽ Your turn to pick!', {
        body: `It's your pick in ${league?.name}. You have 60 seconds!`,
        icon: '/favicon.ico',
        tag: 'draft-pick'
      })
    }
  }

  async function saveSchedule() {
    if (!scheduledTime) return
    const localDate = new Date(scheduledTime)
    // Validate it's in the future
    if (localDate <= new Date()) {
      alert('Invalid date/time — please enter a future time.')
      return
    }
    setSavingSchedule(true)
    await supabase.from('leagues').update({ scheduled_at: localDate.toISOString() }).eq('id', id)
    setSavingSchedule(false)
    alert('Draft time saved! ' + localDate.toLocaleString())
  }

  async function sendChat() {
    if (!chatInput.trim() || sendingChat) return
    setSendingChat(true)
    const me = members.find(m => m.user_id === user.id)
    const name = me?.profiles?.username || me?.profiles?.email?.split('@')[0] || 'Player'
    await supabase.from('chat_messages').insert({
      league_id: id,
      user_id: user.id,
      username: name,
      message: chatInput.trim()
    })
    setChatInput('')
    setSendingChat(false)
  }

  function copyCode() {
    navigator.clipboard.writeText(league?.code || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function getDisplayName(m) {
    if (!m) return 'TBD'
    // Try username first, then email prefix, then generic player number
    const name = m.profiles?.username || m.profiles?.email?.split('@')[0]
    if (name && name.length > 2) return name
    return `Player ${(m.draft_slot ?? 0) + 1}`
  }

  function computePoints() {
    const stageBonus = bracket?.stageBonus || {}
    return members.map(m => {
      const mPicks = Object.entries(picks).filter(([, uid]) => uid === m.user_id).map(([t]) => t)
      const { total, breakdown } = calcTotalPoints(fixtures, mPicks, stageBonus)
      return { ...m, computedPts: total, breakdown, teamPicks: mPicks }
    }).sort((a, b) => b.computedPts - a.computedPts)
  }

  // Trigger draft complete popup - MUST be before any conditional returns
  const prevDraftDoneRef = useRef(false)
  const draftDoneCalc = (league?.draft_pos || 0) >= snakeOrder(league?.size || 4, 48).length || Object.keys(picks).length >= 48
  useEffect(() => {
    if (draftDoneCalc && !prevDraftDoneRef.current && draftStarted) {
      setDraftComplete(true)
      playSound('complete')
    }
    prevDraftDoneRef.current = draftDoneCalc
  }, [draftDoneCalc, draftStarted])

  if (loading) return <div className="container page-wrap"><div className="empty">Loading league...</div></div>

  const tpp = 48 / (league?.size || 4)
  const order = snakeOrder(league?.size || 4, 48)
  const draftPos = league?.draft_pos || 0
  const currentTurn = order[draftPos]
  const isMyTurn = currentTurn === mySlot
  const draftDone = draftDoneCalc
  const myPicks = Object.entries(picks).filter(([, uid]) => uid === user.id).map(([t]) => t)
  const rankedMembers = computePoints()
  const maxPts = Math.max(1, rankedMembers[0]?.computedPts || 1)
  const isCommissioner = league?.creator_id === user.id
  const timerColor = timeLeft > 30 ? '#5DCAA5' : timeLeft > 10 ? '#FAC775' : '#F09595'

  return (
    <div onClick={() => { try { getAudioCtx() } catch(e) {} }}>
      {/* Draft Complete Popup */}
      {draftComplete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: 'var(--bg2)', border: '1px solid rgba(29,158,117,.4)', borderRadius: 16, padding: '2rem', maxWidth: 400, width: '100%', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🏆</div>
            <h2 style={{ fontSize: 22, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>Draft Complete!</h2>
            <p style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 24 }}>All teams have been drafted. The World Cup starts June 11, 2026. Good luck!</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginBottom: 24 }}>
              {myPicks.map(n => {
                const t = TEAM_MAP[n]
                return (
                  <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(29,158,117,.1)', border: '1px solid rgba(29,158,117,.3)', borderRadius: 20, padding: '4px 10px', fontSize: 12 }}>
                    <Flag team={n} size={14} /><span style={{ color: '#5DCAA5' }}>{n}</span>
                  </div>
                )
              })}
            </div>
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => { setDraftComplete(false); setTab('myteams') }}>View my teams →</button>
          </div>
        </div>
      )}
      {/* Player Detail Modal */}
      {selectedPlayer && (() => {
        // Get fresh data from rankedMembers
        const p = rankedMembers.find(m => m.id === selectedPlayer.id) || selectedPlayer
        const stageBonus = bracket?.stageBonus || {}
        const STAGE_CSS_MAP = {
          'Champion':'stage-ch','Runner-up':'stage-ru','Semi-final':'stage-sf',
          'Quarter-final':'stage-qf','Round of 16':'stage-r16','Round of 32':'stage-r32','Group stage':'stage-gs'
        }
        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={() => setSelectedPlayer(null)}>
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px 16px 0 0', padding: '1.5rem', width: '100%', maxWidth: 600, maxHeight: '80vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.5rem' }}>
                <div className="avatar" style={{ width: 44, height: 44, fontSize: 14, background: AV_BG[p.draft_slot % 8], color: AV_FG[p.draft_slot % 8] }}>
                  {getDisplayName(p).slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 900, fontFamily: "var(--font-display)", textTransform: "uppercase", letterSpacing: ".02em", color: 'var(--text)' }}>{getDisplayName(p)}</div>
                  <div style={{ fontSize: 13, color: 'var(--text2)' }}>{p.computedPts} pts total · {p.teamPicks.length} teams</div>
                </div>
                <button onClick={() => setSelectedPlayer(null)} style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: 'var(--text2)', fontSize: 20, cursor: 'pointer' }}>×</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 8 }}>
                {p.teamPicks.map(n => {
                  const bonus = stageBonus[n] || 0
                  let stageLabel = 'Group stage'
                  if (bracket) {
                    if (bracket.champ?.n === n) stageLabel = 'Champion'
                    else {
                      for (const {d, l} of [
                        {d:bracket.final,l:'Runner-up'},{d:bracket.sf,l:'Semi-final'},
                        {d:bracket.qf,l:'Quarter-final'},{d:bracket.r16,l:'Round of 16'},
                        {d:bracket.r32,l:'Round of 32'}
                      ]) { if (d?.some(m => m.w?.n === n)) { stageLabel = l; break } }
                    }
                  }
                  const teamBreakdown = p.breakdown?.[n]
                  const matchPts = Math.max(0, (teamBreakdown?.pts || 0) - bonus)
                  return (
                    <div key={n} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Flag team={n} size={20} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{n}</div>
                        <span className={`badge ${STAGE_CSS_MAP[stageLabel] || 'stage-gs'}`} style={{ fontSize: 10 }}>{stageLabel}</span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--mono)' }}>{(teamBreakdown?.pts || 0)} pts</div>
                        {bonus > 0 && <div style={{ fontSize: 10, color: 'var(--text3)' }}>+{bonus} bonus</div>}
                      </div>
                    </div>
                  )
                })}
              </div>
              {p.teamPicks.length === 0 && <p style={{ textAlign: 'center', color: 'var(--text2)', fontSize: 14, padding: '2rem' }}>No teams drafted yet</p>}
            </div>
          </div>
        )
      })()}

      <div className="app-header">
        <div className="header-inner">
          {/* Left: back + logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', color: 'var(--text2)', fontSize: 20, lineHeight: 1 }}>←</button>
            <DubUpLogoHorizontal height={36} />
          </div>
          {/* Center: league name */}
          <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '.06em', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {league?.name}
          </div>
          {/* Right: profile avatar */}
          <button
            onClick={() => setProfileMenuOpen(v => !v)}
            style={{ width: 36, height: 36, borderRadius: '50%', background: myProfile?.avatar_url ? 'transparent' : 'var(--clay)', border: '2px solid var(--border2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden', flexShrink: 0, fontSize: 13, fontWeight: 700, color: 'var(--sand)', fontFamily: 'var(--font-display)' }}
          >
            {myProfile?.avatar_url
              ? <img src={myProfile.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : (getDisplayName(members.find(m => m.user_id === user.id)) || 'Me').slice(0,2).toUpperCase()
            }
          </button>
        </div>
      </div>

      {/* Profile dropdown menu */}
      {profileMenuOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200 }} onClick={() => setProfileMenuOpen(false)}>
          <div style={{ position: 'absolute', top: 70, right: 12, background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 14, padding: '8px 0', minWidth: 220, boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }} onClick={e => e.stopPropagation()}>
            {/* User info */}
            <div style={{ padding: '10px 16px 12px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: 'var(--text)', textTransform: 'uppercase' }}>
                {getDisplayName(members.find(m => m.user_id === user.id))}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{user?.email}</div>
            </div>
            {/* League code */}
            <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-display)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>League Code</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 18, fontWeight: 700, color: 'var(--clay-light)', letterSpacing: '.15em' }}>{league?.code}</span>
                <button className="btn btn-secondary" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => { copyCode(); setProfileMenuOpen(false) }}>{copied ? '✓ Copied' : 'Copy'}</button>
              </div>
            </div>
            {/* Menu items */}
            {[
              { label: 'Edit Profile', icon: '👤', action: () => { navigate('/profile'); setProfileMenuOpen(false) } },
              { label: 'How to Play', icon: '📖', action: () => { navigate('/how-to-play'); setProfileMenuOpen(false) } },
              { label: 'Sign Out', icon: '🚪', action: () => { signOut(); setProfileMenuOpen(false) }, danger: true },
            ].map(item => (
              <button key={item.label} onClick={item.action} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: item.danger ? '#FF9090' : 'var(--text)', textAlign: 'left', fontFamily: 'var(--font)' }}>
                <span>{item.icon}</span>{item.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="container page-wrap" style={{ paddingLeft: 'max(1rem, env(safe-area-inset-left))', paddingRight: 'max(1rem, env(safe-area-inset-right))' }}>


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

            {/* Draft in progress banner */}
            {draftStarted && !draftDone && (
              <div style={{ background: 'rgba(193,73,46,.1)', border: '1px solid rgba(193,73,46,.35)', borderRadius: 10, padding: '12px 16px', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 14, color: 'var(--clay-light)', fontWeight: 700, fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 2 }}>⚽ Draft in progress</div>
                  <div style={{ fontSize: 12, color: 'var(--text2)' }}>{isMyTurn ? "It's your turn to pick!" : 'Waiting for other players...'}</div>
                </div>
                <button className="btn btn-primary" style={{ fontSize: 12, padding: '8px 16px' }} onClick={() => setTab('draft')}>
                  Join Draft →
                </button>
              </div>
            )}

            {countdown && !draftStarted && (
              <div style={{ background: 'rgba(200,169,106,.08)', border: '1px solid rgba(200,169,106,.25)', borderRadius: 10, padding: '12px 16px', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 14, color: 'var(--gold)', fontWeight: 600 }}>⏰ Draft starts in</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 20, fontWeight: 700, color: 'var(--gold)' }}>{countdown}</div>
              </div>
            )}

            {!draftDone && !draftStarted && <div className="card" style={{ marginBottom: '1.5rem' }}>
              <div className="card-title">Draft schedule</div>
              {league?.scheduled_at && (
                <div style={{ marginBottom: 12, fontSize: 14, color: 'var(--text2)' }}>
                  📅 Scheduled for: <strong style={{ color: 'var(--text)' }}>{new Date(league.scheduled_at).toLocaleString(undefined, {dateStyle:'medium',timeStyle:'short'})}</strong>
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
            </div>}

            <div className="card-title">Leaderboard <span style={{fontSize:11,color:'var(--text3)',fontWeight:400,textTransform:'none',letterSpacing:0}}>tap a player to see their teams</span></div>
            <div className="card">
              {rankedMembers.map((m, i) => (
                <div key={m.id} className="row" onClick={() => setSelectedPlayer(m)} style={{ cursor: 'pointer' }}>
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
                  <span style={{ fontSize: 18, color: 'var(--text3)' }}>›</span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* DRAFT TAB */}
        {tab === 'draft' && (() => {
          try { return (
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
                ✅ Draft complete — all teams assigned!
              </div>
            ) : (
              <div className="turn-banner" style={{ justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div className="turn-dot" />
                  <div className="turn-text">
                    {isMyTurn
                      ? `Your pick — ${myPicks.length + 1} of ${tpp}`
                      : `${getDisplayName(members.find(m => m.draft_slot === (currentTurn ?? -1)) || null)}'s pick`}
                  </div>
                </div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 24, fontWeight: 700, color: timerColor }}>{timeLeft}s</div>
              </div>
            )}

            {/* Commissioner controls - draft tab only */}
            {isCommissioner && draftStarted && !draftDone && (
              <div style={{ background: 'var(--bg3)', border: '1px solid var(--border-clay)', borderRadius: 10, padding: '12px 16px', marginBottom: 12 }}>
                <div className="card-title" style={{ marginBottom: 8 }}>Commissioner controls</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    className="btn btn-secondary"
                    style={{ fontSize: 12, padding: '8px 14px' }}
                    onClick={async () => {
                      if (!window.confirm('Reverse the last pick? That team returns to the pool and it becomes their turn again.')) return
                      // Get the very last pick
                      const { data: lastPick, error: fetchErr } = await supabase
                        .from('picks').select('id, user_id, team_name')
                        .eq('league_id', id)
                        .order('picked_at', { ascending: false })
                        .limit(1).single()
                      if (fetchErr || !lastPick) { alert('No picks to reverse'); return }
                      // Step 1: delete the pick from DB
                      const { error: delErr } = await supabase.from('picks').delete().eq('id', lastPick.id)
                      if (delErr) { alert('Error: ' + delErr.message); return }
                      // Step 2: remove from local state immediately
                      setPicks(prev => {
                        const next = { ...prev }
                        delete next[lastPick.team_name]
                        return next
                      })
                      setPicksOrdered(prev => prev.filter(p => p.id !== lastPick.id && p.team_name !== lastPick.team_name))
                      // Step 3: go back 1 draft position
                      const newPos = Math.max(0, (league?.draft_pos || 1) - 1)
                      await supabase.from('leagues').update({ draft_pos: newPos }).eq('id', id)
                      // Real-time will sync other clients via DELETE subscription
                    }}
                  >
                    ↩ Reverse last pick
                  </button>
                  <button
                    className="btn btn-secondary"
                    style={{ fontSize: 12, padding: '8px 14px', color: '#FF9090', borderColor: 'rgba(255,75,75,.3)' }}
                    onClick={async () => {
                      if (!window.confirm('Restart the entire draft? ALL picks deleted, everyone starts over.')) return
                      // Delete all picks first
                      await supabase.from('picks').delete().eq('league_id', id)
                      // Reset league state — real-time subscription will sync all clients
                      await supabase.from('leagues')
                        .update({ draft_pos: 0, draft_started: false, bracket_data: null })
                        .eq('id', id)
                    }}
                  >
                    🔄 Restart draft
                  </button>
                </div>
              </div>
            )}

            {/* Last pick made */}
            {draftStarted && picksOrdered.length > 0 && (() => {
              const lastPick = picksOrdered[picksOrdered.length - 1]
              if (!lastPick) return null
              const lastMember = members.find(m => m.user_id === lastPick.user_id)
              return (
                <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 14px', marginBottom: 12, fontSize: 13, color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span>Last pick:</span>
                  <Flag team={lastPick.team_name} size={14} />
                  <span style={{ color: 'var(--text)', fontWeight: 500 }}>{lastPick.team_name}</span>
                  <span>by <strong>{getDisplayName(lastMember)}</strong></span>
                </div>
              )
            })()}

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text3)', marginBottom: 6 }}>
              <span>Draft progress</span><span>{Object.keys(picks).length} / 48</span>
            </div>
            <div className="prog-wrap">
              <div className="prog-fill" style={{ width: `${Math.round(Object.keys(picks).length / 48 * 100)}%` }} />
            </div>

            {/* All players' current picks */}
            {draftStarted && members.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div className="card-title">All players' picks</div>
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(members.length, 2)}, 1fr)`, gap: 8 }}>
                  {members.map(m => {
                    const mPicks = Object.entries(picks).filter(([, uid]) => uid === m.user_id).map(([t]) => t)
                    const isCurrentPicker = m.draft_slot === currentTurn && !draftDone
                    return (
                      <div key={m.id} style={{ background: isCurrentPicker ? 'rgba(29,158,117,.08)' : 'var(--bg3)', border: `1px solid ${isCurrentPicker ? 'rgba(29,158,117,.4)' : 'var(--border)'}`, borderRadius: 8, padding: '10px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                          <div className="avatar" style={{ width: 22, height: 22, fontSize: 9, background: AV_BG[m.draft_slot % 8], color: AV_FG[m.draft_slot % 8], flexShrink: 0 }}>
                            {getDisplayName(m).slice(0, 2).toUpperCase()}
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 600, color: isCurrentPicker ? '#5DCAA5' : 'var(--text)' }}>
                            {getDisplayName(m)} {m.user_id === user.id && '(you)'}
                          </span>
                          {isCurrentPicker && <span style={{ fontSize: 10, color: '#5DCAA5', marginLeft: 'auto' }}>picking...</span>}
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                          {mPicks.length === 0
                            ? <span style={{ fontSize: 11, color: 'var(--text3)' }}>No picks yet</span>
                            : mPicks.map(t => (
                              <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 3, background: 'var(--bg2)', borderRadius: 4, padding: '2px 5px' }}>
                                <Flag team={t} size={12} />
                                <span style={{ fontSize: 10, color: 'var(--text2)' }}>{t}</span>
                              </div>
                            ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="card-title" style={{ marginBottom: 10 }}>All 48 teams — tap to pick</div>
            {['A','B','C','D','E','F','G','H','I','J','K','L'].map(group => (
              <div key={group} style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 7 }}>
                  Group {group}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 7 }}>
                  {TEAMS.filter(t => t.g === group).map(t => {
                    const owner = picks[t.n]
                    const isMine = owner !== undefined && owner === user.id
                    const isBot = owner !== undefined && typeof owner === 'string' && owner.startsWith('bot_')
                    const isTakenByOther = owner !== undefined && !isMine && !isBot
                    const isAnyonePicked = owner !== undefined
                    const ownerMember = isTakenByOther ? members.find(m => m.user_id === owner) : null
                    const canPick = draftStarted && isMyTurn && !draftDone && !isAnyonePicked
                    return (
                      <div key={t.n} className={`team-card ${isMine ? 'mine' : ''} ${isAnyonePicked && !isMine ? 'taken' : ''}`} onClick={() => canPick && makePick(t.n)} style={{ cursor: canPick ? 'pointer' : isAnyonePicked ? 'not-allowed' : 'default' }}>
                        {isMine && <div className="pick-check">✓</div>}
                        {isTakenByOther && ownerMember && (
                          <div style={{ position: 'absolute', top: 4, right: 4, width: 15, height: 15, borderRadius: '50%', background: AV_BG[ownerMember.draft_slot % 8], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 7, fontWeight: 700, color: AV_FG[ownerMember.draft_slot % 8] }}>
                            {getDisplayName(ownerMember).slice(0,1)}
                          </div>
                        )}
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
              const m = members.find(mem => mem.draft_slot === pi)
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
          )} catch(e) { return <div className="card"><p style={{color:'var(--text2)',fontSize:14}}>Error loading draft: {e.message}</p></div> }
        })()}

        {/* MY TEAMS TAB */}
        {tab === 'myteams' && (() => {
          const displayMember = viewingPlayer
            ? rankedMembers.find(m => m.user_id === viewingPlayer) || rankedMembers[0]
            : rankedMembers.find(m => m.user_id === user.id) || rankedMembers[0]
          const displayPicks = displayMember?.teamPicks || []
          const isViewingMe = !viewingPlayer || viewingPlayer === user.id
          return (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <h2 style={{ fontSize: 20, fontWeight: 900, fontFamily: "var(--font-display)", textTransform: "uppercase", letterSpacing: ".02em", marginBottom: 4 }}>
                    {isViewingMe ? 'My Teams' : `${getDisplayName(displayMember)}'s Teams`}
                  </h2>
                  <p style={{ fontSize: 14, color: 'var(--text2)' }}>{displayPicks.length} of {tpp} teams · {displayMember?.computedPts || 0} pts</p>
                </div>
                {members.length > 1 && (
                  <select
                    className="input"
                    style={{ width: 'auto', minWidth: 160 }}
                    value={viewingPlayer || user.id}
                    onChange={e => setViewingPlayer(e.target.value === user.id ? null : e.target.value)}
                  >
                    {rankedMembers.map(m => (
                      <option key={m.user_id} value={m.user_id}>
                        {getDisplayName(m)} {m.user_id === user.id ? '(you)' : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {displayPicks.length === 0 ? (
                <div className="empty"><div className="empty-icon">🏳️</div><p>No picks yet</p></div>
              ) : (
                <>
                  <div style={{ display: 'flex', flexWrap: 'wrap', marginBottom: '1.5rem', gap: 6 }}>
                    {displayPicks.map(n => (
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
                        {displayPicks.map(n => {
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
                          const breakdown = displayMember?.breakdown?.[n]
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
          )
        })()}

        {/* BRACKET TAB */}
        {tab === 'bracket' && (
          <>
            <h2 style={{ fontSize: 20, fontWeight: 900, fontFamily: "var(--font-display)", textTransform: "uppercase", letterSpacing: ".02em", marginBottom: 4 }}>Tournament Bracket</h2>
            <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 8 }}>
              {myPicks.length > 0 && <span>Your teams: <span style={{ color: 'var(--clay-light)', fontWeight: 600 }}>highlighted in orange</span></span>}
            </p>
            {/* My teams legend */}
            {myPicks.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: '1rem' }}>
                {myPicks.map(n => (
                  <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(193,73,46,.15)', border: '1px solid rgba(193,73,46,.35)', borderRadius: 6, padding: '3px 8px', fontSize: 11, color: 'var(--clay-light)', fontWeight: 600 }}>
                    <Flag team={n} size={10} />{n}
                  </div>
                ))}
              </div>
            )}
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
                            {[{ team: m.a, goals: m.ag }, { team: m.b, goals: m.bg }].map(({ team, goals }, ti) => {
                              const isMine = myPicks.includes(team?.n)
                              const isWinner = m.w?.n === team?.n
                              return (
                                <div key={ti}
                                  className={`b-team ${isWinner ? 'winner' : ''} ${isMine ? 'my-team' : ''}`}
                                  style={{
                                    background: isMine ? 'rgba(193,73,46,0.18)' : undefined,
                                    borderLeft: isMine ? '3px solid var(--clay)' : undefined,
                                    paddingLeft: isMine ? 4 : undefined,
                                  }}>
                                  <Flag team={team?.n} size={12} />
                                  <span style={{
                                    flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginLeft: 4,
                                    color: isMine ? 'var(--clay-light)' : undefined,
                                    fontWeight: isMine ? 700 : undefined,
                                  }}>{team?.n}</span>
                                  <span className="b-score">{goals}</span>
                                </div>
                              )
                            })}
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
                          <div className={`b-team winner ${myPicks.includes(bracket.champ.n) ? 'my-team' : ''}`}
                            style={myPicks.includes(bracket.champ.n) ? { background: 'rgba(193,73,46,0.3)', borderLeft: '3px solid var(--clay)', paddingLeft: 5, color: 'var(--clay-light)', fontWeight: 700 } : {}}>
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

        {/* CHAT TAB */}
        {tab === 'chat' && (
          <>
            <h2 style={{ fontSize: 20, fontWeight: 900, fontFamily: "var(--font-display)", textTransform: "uppercase", letterSpacing: ".02em", marginBottom: 4 }}>League Chat</h2>
            <p style={{ fontSize: 14, color: 'var(--text2)', marginBottom: '1.5rem' }}>Talk trash, celebrate picks, and hype each other up</p>
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, display: 'flex', flexDirection: 'column', height: 400 }}>
              <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {chatMessages.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--text3)', fontSize: 14, margin: 'auto' }}>
                    No messages yet. Say something! 👋
                  </div>
                ) : (
                  chatMessages.map((msg, i) => {
                    const isMe = msg.user_id === user.id
                    return (
                      <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                        <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 3 }}>{msg.username}</div>
                        <div style={{
                          background: isMe ? 'rgba(29,158,117,.2)' : 'var(--bg3)',
                          border: `1px solid ${isMe ? 'rgba(29,158,117,.3)' : 'var(--border)'}`,
                          borderRadius: isMe ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                          padding: '8px 12px',
                          fontSize: 14,
                          color: 'var(--text)',
                          maxWidth: '75%',
                          wordBreak: 'break-word'
                        }}>
                          {msg.message}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 3 }}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    )
                  })
                )}
                <div ref={chatEndRef} />
              </div>
              <div style={{ padding: '12px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
                <input
                  className="input"
                  type="text"
                  placeholder="Say something..."
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendChat()}
                  style={{ flex: 1 }}
                />
                <button className="btn btn-primary" onClick={sendChat} disabled={sendingChat || !chatInput.trim()}>
                  Send
                </button>
              </div>
            </div>
          </>
        )}

        {/* SCORING TAB */}
        {tab === 'scoring' && (
          <>
            <h2 style={{ fontSize: 20, fontWeight: 900, fontFamily: "var(--font-display)", textTransform: "uppercase", letterSpacing: ".02em", marginBottom: 4 }}>Scoring Rules</h2>
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
      {/* Bottom Navigation */}
      <div className="bottom-nav">
        {[
          { id: 'league', label: 'Home', icon: (active) => (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? 'var(--clay)' : 'var(--text3)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          )},
          { id: 'draft', label: 'Draft', icon: (active) => (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? 'var(--clay)' : 'var(--text3)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>
            </svg>
          ), badge: draftStarted && !draftDone && isMyTurn },
          { id: 'myteams', label: 'My Teams', icon: (active) => (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? 'var(--clay)' : 'var(--text3)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/>
            </svg>
          )},
          { id: 'bracket', label: 'Bracket', icon: (active) => (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? 'var(--clay)' : 'var(--text3)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="5" x2="3" y2="19"/><line x1="3" y1="5" x2="7" y2="5"/><line x1="3" y1="19" x2="7" y2="19"/>
              <line x1="3" y1="12" x2="12" y2="12"/>
              <line x1="12" y1="8" x2="12" y2="16"/><line x1="12" y1="8" x2="16" y2="8"/><line x1="12" y1="16" x2="16" y2="16"/>
              <line x1="16" y1="12" x2="21" y2="12"/>
            </svg>
          )},
          { id: 'chat', label: 'Chat', icon: (active) => (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? 'var(--clay)' : 'var(--text3)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
            </svg>
          ), badge: chatMessages.length > 0 && tab !== 'chat' },
          { id: 'scoring', label: 'Rules', icon: (active) => (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? 'var(--clay)' : 'var(--text3)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          )},
        ].map(item => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            style={{
              flex: 1,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 3,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              position: 'relative',
              padding: '8px 0',
            }}
          >
            {item.badge && (
              <div style={{ position: 'absolute', top: 6, right: '50%', transform: 'translateX(8px)', width: 8, height: 8, borderRadius: '50%', background: 'var(--clay)', boxShadow: '0 0 6px var(--clay)' }} />
            )}
            {item.icon(tab === item.id)}
            <span style={{
              fontSize: 9,
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '.06em',
              color: tab === item.id ? 'var(--clay)' : 'var(--text3)',
            }}>
              {item.label}
            </span>
            {tab === item.id && (
              <div style={{ position: 'absolute', top: 0, left: '15%', right: '15%', height: 2, background: 'var(--clay)', borderRadius: '0 0 2px 2px' }} />
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
