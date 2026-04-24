import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import DubUpLogo, { DubUpLogoHorizontal } from '../components/DubUpLogo'
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
  const [tab, setTab] = useState('my')

  useEffect(() => { loadMyLeagues() }, [user])

  async function loadMyLeagues() {
    setLoading(true)
    const { data } = await supabase
      .from('league_members')
      .select('league_id, leagues(id, name, code, size, created_at, draft_pos)')
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
        .from('leagues')
        .insert({ name: leagueName.trim(), code, size: leagueSize, creator_id: user.id, draft_pos: 0 })
        .select().single()
      if (le) throw le

      const { error: me } = await supabase
        .from('league_members')
        .insert({ league_id: league.id, user_id: user.id, draft_slot: 0, pts: 0 })
      if (me) throw me

      navigate(`/league/${league.id}`)
    } catch (e) {
      setError(e.message)
    } finally {
      setCreating(false)
    }
  }

  async function joinLeague() {
    if (!joinCode.trim()) return
    setJoining(true); setError('')
    try {
      const { data: league, error: le } = await supabase
        .from('leagues')
        .select('*')
        .eq('code', joinCode.trim().toUpperCase())
        .single()
      if (le || !league) throw new Error('League not found. Check the invite code.')

      // Check if already a member
      const { data: existing } = await supabase
        .from('league_members')
        .select('id')
        .eq('league_id', league.id)
        .eq('user_id', user.id)
        .single()
      if (existing) { navigate(`/league/${league.id}`); return }

      // Get all existing members to find taken slots and check if full
      const { data: existingMembers } = await supabase
        .from('league_members')
        .select('draft_slot')
        .eq('league_id', league.id)
      const memberCount = existingMembers?.length || 0
      if (memberCount >= league.size) throw new Error('This league is full.')

      // Find the next available slot (not already taken)
      const takenSlots = new Set(existingMembers?.map(m => m.draft_slot) || [])
      let nextSlot = 0
      while (takenSlots.has(nextSlot)) nextSlot++

      const { error: me } = await supabase
        .from('league_members')
        .insert({ league_id: league.id, user_id: user.id, draft_slot: nextSlot, pts: 0 })
      if (me) throw me

      navigate(`/league/${league.id}`)
    } catch (e) {
      setError(e.message)
    } finally {
      setJoining(false)
    }
  }

  return (
    <div>
      <div className="app-header">
        <div className="header-inner">
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <button className="btn btn-ghost" onClick={() => navigate('/')} style={{padding:'6px 8px',fontSize:18}}>←</button>
            <DubUpLogoHorizontal height={34} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 13, color: 'var(--text2)' }}>{user?.email}</span>
            <button className="btn btn-ghost" onClick={signOut}>Sign out</button>
          </div>
        </div>
      </div>

      <div className="container page-wrap">
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: 26, fontWeight: 900, marginBottom: 6, fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '.02em' }}>My Leagues</h1>
          <p style={{ color: 'var(--text2)', fontSize: 14 }}>Create a new league or join one with an invite code</p>
        </div>

        <div className="tabs" style={{ marginBottom: '1.5rem' }}>
          <button className={`tab ${tab === 'my' ? 'active' : ''}`} onClick={() => setTab('my')}>My leagues</button>
          <button className={`tab ${tab === 'create' ? 'active' : ''}`} onClick={() => setTab('create')}>Create league</button>
          <button className={`tab ${tab === 'join' ? 'active' : ''}`} onClick={() => setTab('join')}>Join league</button>
        </div>

        {error && <div className="error-msg">{error}</div>}

        {tab === 'my' && (
          loading ? <div className="empty">Loading...</div> :
          myLeagues.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">⚽</div>
              <p>No leagues yet. Create one or join with an invite code.</p>
            </div>
          ) : (
            myLeagues.map(l => (
              <div key={l.id} className="card" style={{ cursor: 'pointer' }} onClick={() => navigate(`/league/${l.id}`)}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>{l.name}</div>
                    <div style={{ fontSize: 13, color: 'var(--text2)' }}>Code: <span style={{ fontFamily: 'var(--mono)', letterSpacing: '.1em' }}>{l.code}</span> · {l.size} players</div>
                  </div>
                  <div style={{ color: 'var(--text3)', fontSize: 20 }}>›</div>
                </div>
              </div>
            ))
          )
        )}

        {tab === 'create' && (
          <div className="card">
            <div className="card-title">New league</div>
            <div className="form-group">
              <label className="form-label">League name</label>
              <input className="input" type="text" placeholder="e.g. Office World Cup 2026" value={leagueName} onChange={e => setLeagueName(e.target.value)} />
            </div>
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">Number of players</label>
              <select className="input" value={leagueSize} onChange={e => setLeagueSize(parseInt(e.target.value))}>
                <option value={4}>4 players — 12 teams each</option>
                <option value={6}>6 players — 8 teams each</option>
                <option value={8}>8 players — 6 teams each</option>
              </select>
            </div>
            <button className="btn btn-primary" onClick={createLeague} disabled={creating || !leagueName.trim()}>
              {creating ? 'Creating...' : 'Create league'}
            </button>
          </div>
        )}

        {tab === 'join' && (
          <div className="card">
            <div className="card-title">Join with invite code</div>
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">Invite code</label>
              <input className="input" type="text" placeholder="e.g. AB12CD" value={joinCode} onChange={e => setJoinCode(e.target.value)} maxLength={6} style={{ textTransform: 'uppercase', letterSpacing: '.12em', fontFamily: 'var(--mono)', fontSize: 18 }} />
            </div>
            <button className="btn btn-primary" onClick={joinLeague} disabled={joining || joinCode.length < 4}>
              {joining ? 'Joining...' : 'Join league'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
