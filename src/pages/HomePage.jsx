import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { DubUpLogoHorizontal } from '../components/DubUpLogo'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

function genCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase()
}

export default function HomePage() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [myLeagues, setMyLeagues] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [joining, setJoining] = useState(false)
  const [leagueName, setLeagueName] = useState('')
  const [leagueSize, setLeagueSize] = useState(4)
  const [joinCode, setJoinCode] = useState('')
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [showJoin, setShowJoin] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    loadMyLeagues()
    loadProfile()

    // Subscribe to league_members changes so home page updates when someone joins a league
    const channel = supabase.channel('home_members')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'league_members'
      }, () => { loadMyLeagues() })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'leagues'
      }, () => { loadMyLeagues() })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [user])

  async function loadProfile() {
    const { data } = await supabase.from('profiles').select('username, avatar_url').eq('id', user.id).single()
    if (data) setProfile(data)
  }

  async function loadMyLeagues() {
    setLoading(true)
    const { data } = await supabase
      .from('league_members')
      .select('league_id, leagues(id, name, code, size, created_at, draft_pos, draft_started)')
      .eq('user_id', user.id)
    setMyLeagues(data?.map(d => d.leagues).filter(Boolean) || [])
    setLoading(false)
  }

  async function createLeague() {
    if (!leagueName.trim()) return
    setCreating(true); setError('')
    try {
      const code = genCode()
      const { data: league, error: le } = await supabase
        .from('leagues').insert({ name: leagueName.trim(), code, size: leagueSize, creator_id: user.id, draft_pos: 0 }).select().single()
      if (le) throw le
      await supabase.from('league_members').insert({ league_id: league.id, user_id: user.id, draft_slot: 0, pts: 0 })
      navigate(`/league/${league.id}`)
    } catch (e) { setError(e.message) }
    finally { setCreating(false) }
  }

  async function joinLeague() {
    setJoining(true); setError('')
    try {
      const { data: league, error: le } = await supabase.from('leagues').select('*').eq('code', joinCode.toUpperCase().trim()).single()
      if (le || !league) throw new Error('League not found. Check the invite code.')
      const { data: existingMembers } = await supabase.from('league_members').select('draft_slot, user_id').eq('league_id', league.id)
      if ((existingMembers?.length || 0) >= league.size) throw new Error('This league is full.')
      if (existingMembers?.some(m => m.user_id === user.id)) { navigate(`/league/${league.id}`); return }
      const takenSlots = new Set(existingMembers?.map(m => m.draft_slot) || [])
      let nextSlot = 0
      while (takenSlots.has(nextSlot)) nextSlot++
      await supabase.from('league_members').insert({ league_id: league.id, user_id: user.id, draft_slot: nextSlot, pts: 0 })
      navigate(`/league/${league.id}`)
    } catch (e) { setError(e.message) }
    finally { setJoining(false) }
  }

  const displayName = profile?.username || user?.email?.split('@')[0] || 'You'

  return (
    <div>
      <div className="app-header">
        <div className="header-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', color: 'var(--text2)', fontSize: 20, lineHeight: 1 }}>←</button>
            <DubUpLogoHorizontal height={36} />
          </div>
          <button onClick={() => navigate('/how-to-play')} style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.1em' }}>
            How to Play
          </button>
          <button onClick={() => setProfileOpen(v => !v)} style={{ width: 34, height: 34, borderRadius: '50%', background: profile?.avatar_url ? 'transparent' : 'var(--clay)', border: '2px solid var(--border2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden', flexShrink: 0, fontSize: 12, fontWeight: 700, color: 'var(--sand)', fontFamily: 'var(--font-display)' }}>
            {profile?.avatar_url ? <img src={profile.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : displayName.slice(0,2).toUpperCase()}
          </button>
        </div>
      </div>

      {profileOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200 }} onClick={() => setProfileOpen(false)}>
          <div style={{ position: 'absolute', top: 60, right: 12, background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 14, padding: '8px 0', minWidth: 200, boxShadow: '0 8px 32px rgba(0,0,0,.5)' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '10px 16px 12px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: 'var(--text)', textTransform: 'uppercase' }}>{displayName}</div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{user?.email}</div>
            </div>
            {[
              { label: 'Refer Friends', icon: '🌍', action: () => { navigate('/referral'); setProfileOpen(false) } },
              { label: 'Edit Profile', icon: '👤', action: () => { navigate('/profile'); setProfileOpen(false) } },
              { label: 'How to Play', icon: '📖', action: () => { navigate('/how-to-play'); setProfileOpen(false) } },
              { label: 'Sign Out', icon: '🚪', action: () => { signOut(); setProfileOpen(false) }, danger: true },
            ].map(item => (
              <button key={item.label} onClick={item.action} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: item.danger ? '#FF9090' : 'var(--text)', textAlign: 'left', fontFamily: 'var(--font)' }}>
                <span>{item.icon}</span>{item.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="container page-wrap" style={{ paddingLeft: 'max(1rem, env(safe-area-inset-left))', paddingRight: 'max(1rem, env(safe-area-inset-right))' }}>
        <div style={{ marginBottom: '1.75rem' }}>
          <div style={{ fontSize: 22, fontWeight: 900, fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '.02em', color: 'var(--text)', marginBottom: 4 }}>Hey, {displayName} 👋</div>
          <div style={{ fontSize: 14, color: 'var(--text2)' }}>World Cup 2026 · June 11</div>
        </div>

        {error && <div className="error-msg">{error}</div>}

        <div style={{ marginBottom: '1.5rem' }}>
          <div className="card-title">My Leagues</div>
          {loading ? <div className="empty" style={{ padding: '2rem 0' }}>Loading...</div>
          : myLeagues.length === 0 ? (
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: '2rem', textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>⚽</div>
              <div style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 4 }}>No leagues yet</div>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>Create one or join with an invite code below</div>
            </div>
          ) : myLeagues.map(l => {
            const isDraftLive = l.draft_started && l.draft_pos > 0
            const isDraftDone = l.draft_pos >= (48 / l.size) * l.size
            return (
              <div key={l.id} onClick={() => navigate(`/league/${l.id}`)} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', marginBottom: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--clay)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>🏆</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 3, fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.name}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text3)', letterSpacing: '.1em' }}>{l.code}</span>
                    <span style={{ fontSize: 11, color: 'var(--text3)' }}>· {l.size} players</span>
                    {isDraftDone && <span style={{ fontSize: 10, background: 'rgba(200,169,106,.12)', color: '#d4b87a', border: '1px solid rgba(200,169,106,.2)', borderRadius: 4, padding: '1px 7px', fontFamily: 'var(--font-display)', fontWeight: 700, textTransform: 'uppercase' }}>Done</span>}
                    {isDraftLive && !isDraftDone && <span style={{ fontSize: 10, background: 'rgba(193,73,46,.12)', color: 'var(--clay-light)', border: '1px solid rgba(193,73,46,.2)', borderRadius: 4, padding: '1px 7px', fontFamily: 'var(--font-display)', fontWeight: 700, textTransform: 'uppercase' }}>Live</span>}
                  </div>
                </div>
                <div style={{ color: 'var(--text3)', fontSize: 18 }}>›</div>
              </div>
            )
          })}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: '1.5rem' }}>
          <button onClick={() => { setShowCreate(v => !v); setShowJoin(false); setError('') }} style={{ background: showCreate ? 'var(--clay-dark)' : 'var(--clay)', border: 'none', borderRadius: 12, padding: '16px 12px', cursor: 'pointer', textAlign: 'center', color: 'var(--sand)' }}>
            <div style={{ fontSize: 24, marginBottom: 6 }}>➕</div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 13, textTransform: 'uppercase', letterSpacing: '.04em' }}>Create League</div>
            <div style={{ fontSize: 11, color: 'rgba(237,227,211,.65)', marginTop: 3 }}>Start a new league</div>
          </button>
          <button onClick={() => { setShowJoin(v => !v); setShowCreate(false); setError('') }} style={{ background: showJoin ? 'var(--bg3)' : 'var(--bg2)', border: `1px solid ${showJoin ? 'var(--clay)' : 'var(--border2)'}`, borderRadius: 12, padding: '16px 12px', cursor: 'pointer', textAlign: 'center', color: 'var(--text)' }}>
            <div style={{ fontSize: 24, marginBottom: 6 }}>🔗</div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 13, textTransform: 'uppercase', letterSpacing: '.04em' }}>Join League</div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>Enter invite code</div>
          </button>
        </div>

        {showCreate && (
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border-clay)', borderRadius: 14, padding: '1.25rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15, textTransform: 'uppercase', letterSpacing: '.04em' }}>Create League</div>
              <button onClick={() => setShowCreate(false)} style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 22, cursor: 'pointer' }}>×</button>
            </div>
            <div className="form-group">
              <label className="form-label">League name</label>
              <input className="input" type="text" placeholder="e.g. Office World Cup 2026" value={leagueName} onChange={e => setLeagueName(e.target.value)} />
            </div>
            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label className="form-label">Players</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {[4, 6, 8].map(n => (
                  <button key={n} onClick={() => setLeagueSize(n)} style={{ padding: '10px 0', borderRadius: 8, border: `1px solid ${leagueSize === n ? 'var(--clay)' : 'var(--border2)'}`, background: leagueSize === n ? 'rgba(193,73,46,.12)' : 'var(--bg3)', color: leagueSize === n ? 'var(--clay-light)' : 'var(--text2)', cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13 }}>
                    {n}
                    <div style={{ fontSize: 10, fontWeight: 500, marginTop: 2, opacity: .7 }}>{48/n} teams each</div>
                  </button>
                ))}
              </div>
            </div>
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={createLeague} disabled={creating || !leagueName.trim()}>
              {creating ? 'Creating...' : 'Create League →'}
            </button>
          </div>
        )}

        {showJoin && (
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 14, padding: '1.25rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15, textTransform: 'uppercase', letterSpacing: '.04em' }}>Join League</div>
              <button onClick={() => setShowJoin(false)} style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 22, cursor: 'pointer' }}>×</button>
            </div>
            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label className="form-label">Invite code</label>
              <input className="input" type="text" placeholder="ABC123" value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} maxLength={6} style={{ textTransform: 'uppercase', letterSpacing: '.2em', fontFamily: 'var(--mono)', fontSize: 22, textAlign: 'center' }} autoFocus />
            </div>
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={joinLeague} disabled={joining || joinCode.length < 4}>
              {joining ? 'Joining...' : 'Join League →'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
