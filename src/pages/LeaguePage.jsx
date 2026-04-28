import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { TEAMS, TEAM_MAP, SCORING, STAGE_LABELS } from '../lib/teams'
import { getTier, getNextTier, TIERS, getTierBadge } from '../lib/tiers'

// Small inline tier badge
function TierBadge({ referralCount, size = 13 }) {
  const tier = getTier(referralCount || 0)
  if (!tier) return null
  return (
    <span
      title={tier.label}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: tier.bg, border: `1px solid ${tier.border}`,
        borderRadius: 4, padding: '1px 5px', marginLeft: 5,
        fontSize: size - 2, fontFamily: 'var(--font-display)', fontWeight: 700,
        color: tier.color, textTransform: 'uppercase', letterSpacing: '.04em',
        verticalAlign: 'middle', lineHeight: 1.4, flexShrink: 0,
      }}
    >
      {tier.emoji} {tier.id}
    </span>
  )
}
import { snakeOrder } from '../lib/draft'
import { simulateBracket } from '../lib/bracket'
import { fetchFixtures, fetchLiveFixtures, calcTotalPoints } from '../lib/api'
import Flag from '../components/Flag'
import DubUpLogo, { DubUpLogoHorizontal } from '../components/DubUpLogo'

const AV_BG = ['#1a3a2a','#1a2a3a','#3a2a1a','#2a1a3a','#3a1a1a','#1a3a3a','#2a3a1a','#3a3a1a']
const AV_FG = ['#5DCAA5','#85B7EB','#FAC775','#AFA9EC','#F09595','#5DCAA5','#C0DD97','#FAC775']
const BAR_C = ['#1D9E75','#378ADD','#EF9F27','#D85A30','#7F77DD','#639922','#D4537E','#888780']
const STAGE_CSS = {
  'Champion':'stage-ch','Final':'stage-ru','Semi-final':'stage-sf',
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
    if (ctx.state === 'suspended') { ctx.resume().catch(() => {}) }

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
  const [mySlot, setMySlot] = useState(null) // null = not loaded yet
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
  const [draftSettingsOpen, setDraftSettingsOpen] = useState(false)
  const [selectedTeam, setSelectedTeam] = useState(null)
  const [liveScores, setLiveScores] = useState([])
  const [liveScoresLoading, setLiveScoresLoading] = useState(false)
  const [manualOrder, setManualOrder] = useState([])
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

  const mySlotRef = useRef(null)
  useEffect(() => { mySlotRef.current = mySlot }, [mySlot])
  const draftPosRef = useRef(0) // tracks draft_pos synchronously
  const navigateRef = useRef(navigate)
  useEffect(() => { navigateRef.current = navigate }, [navigate])

  const load = useCallback(async () => {
    const { data: lg } = await supabase.from('leagues').select('*').eq('id', id).single()
    if (!lg) { navigateRef.current('/'); return }
    setLeague(lg)
    draftPosRef.current = lg.draft_pos || 0
    if (lg.scheduled_at) setScheduledTime(lg.scheduled_at.slice(0, 16))

    // Load members first
    const { data: mems } = await supabase
      .from('league_members')
      .select('*')
      .eq('league_id', id)
      .order('draft_slot')

    // Load all profiles for these members in one query
    const userIds = (mems || []).map(m => m.user_id)
    const { data: profilesData } = userIds.length > 0
      ? await supabase.from('profiles').select('id, username, email, avatar_url, referral_count').in('id', userIds)
      : { data: [] }

    // Map profiles to members
    const profileMap = {}
    ;(profilesData || []).forEach(p => { profileMap[p.id] = p })

    const memsWithProfiles = (mems || []).map(m => ({
      ...m,
      profile: profileMap[m.user_id] || null
    }))
    setMembers(memsWithProfiles)

    const me = memsWithProfiles.find(m => m.user_id === user.id)
    if (me?.draft_slot != null) setMySlot(me.draft_slot)
    // Load picks
    const { data: pickData } = await supabase
      .from('picks').select('*').eq('league_id', id).order('picked_at')
    const pickMap = {}
    pickData?.forEach(p => { pickMap[p.team_name] = p.user_id })
    setPicks(pickMap)
    setPicksOrdered(pickData || [])

    // Set draft started state - trust the DB value
    setDraftStarted(!!lg.draft_started)

    // If draft is already complete when loading, mark prevDraftDoneRef so popup never shows
    const alreadyDone = (lg.draft_pos || 0) >= snakeOrder(lg.size || 4, 48).length || (pickData?.length || 0) >= 48
    if (alreadyDone) prevDraftDoneRef.current = true

    // Bracket
    if (lg.bracket_data) {
      try { setBracket(JSON.parse(lg.bracket_data)) } catch(e) {}
    } else if (pickData?.length >= 48) {
      const b = simulateBracket()
      setBracket(b)
      await supabase.from('leagues').update({ bracket_data: JSON.stringify(b) }).eq('id', id)
    }

    // Chat
    const { data: msgs } = await supabase
      .from('chat_messages').select('*').eq('league_id', id).order('created_at').limit(50)
    setChatMessages(msgs || [])

    // My profile
    const { data: profileData } = await supabase
      .from('profiles').select('username, avatar_url, referral_count').eq('id', user.id).single()
    if (profileData) setMyProfile(profileData)

    // Fixtures after WC starts
    if (new Date() >= new Date('2026-06-11T00:00:00Z')) {
      try { const f = await fetchFixtures(); setFixtures(f) } catch(e) {}
    }

    setLoading(false)
  }, [id, user.id])

  useEffect(() => {
    load()

    const channel = supabase.channel(`league_${id}`, {
      config: { broadcast: { self: true } }
    })

    // PICKS - INSERT: new pick made by anyone
    .on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'picks', filter: `league_id=eq.${id}`
    }, (payload) => {
      const newPick = payload.new
      if (!newPick) return
      setPicks(prev => ({ ...prev, [newPick.team_name]: newPick.user_id }))
      setPicksOrdered(prev => {
        if (prev.some(p => p.team_name === newPick.team_name)) return prev
        return [...prev, newPick]
      })
      playSound('pick')
    })

    // PICKS - DELETE: pick reversed
    .on('postgres_changes', {
      event: 'DELETE', schema: 'public', table: 'picks', filter: `league_id=eq.${id}`
    }, (payload) => {
      const deleted = payload.old
      if (deleted?.team_name) {
        setPicks(prev => { const n = { ...prev }; delete n[deleted.team_name]; return n })
        setPicksOrdered(prev => prev.filter(p => p.team_name !== deleted.team_name))
      }
    })

    // LEAGUE - UPDATE
    .on('postgres_changes', {
      event: 'UPDATE', schema: 'public', table: 'leagues', filter: `id=eq.${id}`
    }, (payload) => {
      // Use payload.new directly - it contains the committed values
      const updated = payload.new
      if (!updated || !updated.id) return

      setLeague(prev => ({ ...prev, ...updated }))
      draftPosRef.current = updated.draft_pos || 0

      const nowStarted = !!updated.draft_started
      const wasReset = !updated.draft_started && updated.draft_pos === 0

      if (wasReset) {
        setPicks({})
        setPicksOrdered([])
        setBracket(null)
        setDraftStarted(false)
        setDraftComplete(false)
        setTimeLeft(PICK_TIMER)
        setScheduledTime('')
        setTab('league')
        return
      }

      setDraftStarted(prev => {
        if (!prev && nowStarted && !didStartRef.current) {
          try { getAudioCtx(); setTimeout(() => playSound('draft_start'), 200) } catch(e) {}
          setTimeout(() => setTab('draft'), 500)
        }
        return nowStarted
      })

      if (updated.bracket_data) {
        try { setBracket(JSON.parse(updated.bracket_data)) } catch(e) {}
      }
    })

    // LEAGUE_MEMBERS - INSERT: new player joined
    .on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'league_members', filter: `league_id=eq.${id}`
    }, () => {
      // Reload members only - don't call full load() which can reset draft_pos
      supabase
        .from('league_members').select('*').eq('league_id', id).order('draft_slot')
        .then(async ({ data: mems }) => {
          if (!mems) return
          const userIds = mems.map(m => m.user_id)
          const { data: profilesData } = await supabase
            .from('profiles').select('id, username, email, avatar_url, referral_count').in('id', userIds)
          const profileMap = {}
          ;(profilesData || []).forEach(p => { profileMap[p.id] = p })
          const memsWithProfiles = mems.map(m => ({ ...m, profile: profileMap[m.user_id] || null }))
          setMembers(memsWithProfiles)
        })
    })

    // LEAGUE_MEMBERS - UPDATE: draft order changed
    .on('postgres_changes', {
      event: 'UPDATE', schema: 'public', table: 'league_members', filter: `league_id=eq.${id}`
    }, () => {
      // Reload members only - don't call full load() which can reset draft_pos
      supabase
        .from('league_members').select('*').eq('league_id', id).order('draft_slot')
        .then(async ({ data: mems }) => {
          if (!mems) return
          const userIds = mems.map(m => m.user_id)
          const { data: profilesData } = await supabase
            .from('profiles').select('id, username, email, avatar_url, referral_count').in('id', userIds)
          const profileMap = {}
          ;(profilesData || []).forEach(p => { profileMap[p.id] = p })
          const memsWithProfiles = mems.map(m => ({ ...m, profile: profileMap[m.user_id] || null }))
          setMembers(memsWithProfiles)
        })
    })

    // CHAT - INSERT
    .on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `league_id=eq.${id}`
    }, (payload) => {
      if (payload.new) setChatMessages(prev => {
        if (prev.some(m => m.id === payload.new.id)) return prev
        return [...prev, payload.new]
      })
    })

    // CHAT - DELETE
    .on('postgres_changes', {
      event: 'DELETE', schema: 'public', table: 'chat_messages', filter: `league_id=eq.${id}`
    }, (payload) => {
      if (payload.old?.id) {
        setChatMessages(prev => prev.filter(m => m.id !== payload.old.id))
      } else {
        setChatMessages([])
      }
    })

    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('✅ Realtime connected')
      } else {
        console.log('Realtime status:', status)
      }
    })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [load, id])

  // Draft countdown timer + auto-start
  useEffect(() => {
    if (!league?.scheduled_at || draftStarted) { setCountdown(null); return }
    const tick = async () => {
      const diff = new Date(league.scheduled_at) - new Date()
      if (diff <= 0) {
        setCountdown(null)
        if (!draftStarted) {
          await supabase.from('leagues').update({
            draft_started: true,
            bracket_data: null,
            pick_started_at: new Date().toISOString()
          }).eq('id', id)
          setDraftStarted(true)
          didStartRef.current = true
          // Switch everyone to the draft tab automatically
          setTab('draft')
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

  // When player returns to tab/app, resync timer from server timestamp
  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === 'visible' && draftStarted) {
        // Force timer to recalculate from pick_started_at
        if (timerRef.current) clearInterval(timerRef.current)
        const pickStarted = league?.pick_started_at ? new Date(league.pick_started_at) : null
        const elapsed = pickStarted ? Math.floor((Date.now() - pickStarted.getTime()) / 1000) : 0
        const remaining = Math.max(1, PICK_TIMER - elapsed)
        setTimeLeft(remaining)
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [draftStarted, league?.pick_started_at])

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  // Timer - synced to server timestamp so all clients show same countdown
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    const draftPos = Math.max(league?.draft_pos || 0, picksOrdered.length)
    const leagueSize = league?.size || 4
    const whoseTurn = getTurn(draftPos, leagueSize)
    const draftDoneNow = draftPos >= (48 / leagueSize) * leagueSize || Object.keys(picks).length >= 48
    const isMyTurnNow = draftStarted && !draftDoneNow && whoseTurn === mySlot

    if (!draftStarted || draftDoneNow) {
      setTimeLeft(PICK_TIMER)
      return
    }

    // Calculate initial time from server timestamp if available
    const pickStarted = league?.pick_started_at ? new Date(league.pick_started_at) : null
    const elapsed = pickStarted ? Math.floor((Date.now() - pickStarted.getTime()) / 1000) : 0
    const initialTime = Math.max(1, PICK_TIMER - elapsed)
    setTimeLeft(initialTime)

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
          // Timer expired — only pick for MYSELF if it's my turn
          setTimeout(async () => {
            const { data: freshLeague } = await supabase
              .from('leagues').select('draft_pos, size, draft_started').eq('id', id).single()
            if (!freshLeague?.draft_started) return

            // Use actual pick count as source of truth - same as display logic
            const { count: totalPicks } = await supabase
              .from('picks').select('id', { count: 'exact', head: true }).eq('league_id', id)
            const effectivePos = Math.max(freshLeague.draft_pos, totalPicks || 0)

            // Only fire if it is actually MY turn right now
            if (getTurn(effectivePos, freshLeague.size) !== mySlot) return

            // Pick random available team for myself
            const { data: existingPicks } = await supabase
              .from('picks').select('team_name').eq('league_id', id)
            const takenNames = new Set(existingPicks?.map(p => p.team_name) || [])
            const available = TEAMS.filter(t => !takenNames.has(t.n))
            if (!available.length) return
            const auto = available[Math.floor(Math.random() * available.length)]
            const tpp = 48 / freshLeague.size
            const { count: myCount } = await supabase
              .from('picks').select('id', { count: 'exact', head: true })
              .eq('league_id', id).eq('user_id', user.id)
            if ((myCount || 0) >= tpp) return
            if (pickingRef.current) return
            pickingRef.current = true
            const { error } = await supabase.from('picks').insert({
              league_id: id, user_id: user.id, team_name: auto.n
            })
            if (!error) {
              const newPos = effectivePos + 1
              draftPosRef.current = newPos
              setLeague(prev => prev ? { ...prev, draft_pos: newPos, pick_started_at: new Date().toISOString() } : prev)
              await supabase.from('leagues').update({
                draft_pos: newPos,
                pick_started_at: new Date().toISOString()
              }).eq('id', id)
            }
            pickingRef.current = false
          }, 100)
          return PICK_TIMER
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [league?.draft_pos, league?.pick_started_at, draftStarted, mySlot, league?.size, picksOrdered.length])

  async function makePick(teamName) {
    if (!draftStarted) return
    if (mySlot === null) return
    if (pickingRef.current) return
    pickingRef.current = true

    try {
      const { data: lg } = await supabase
        .from('leagues').select('draft_pos, size, draft_started').eq('id', id).single()
      if (!lg?.draft_started) return

      // Use the higher of DB draft_pos or actual pick count
      const effectivePos = Math.max(lg.draft_pos, picksOrdered.length)
      const turn = getTurn(effectivePos, lg.size)
      if (turn !== mySlot) return

      const tpp = 48 / lg.size

      const { count: taken } = await supabase
        .from('picks').select('id', { count: 'exact', head: true })
        .eq('league_id', id).eq('team_name', teamName)
      if (taken > 0) return

      const { count: myCount } = await supabase
        .from('picks').select('id', { count: 'exact', head: true })
        .eq('league_id', id).eq('user_id', user.id)
      if (myCount >= tpp) return

      const { error } = await supabase.from('picks').insert({
        league_id: id, user_id: user.id, team_name: teamName
      })
      if (error) return

      const newPos = effectivePos + 1
      draftPosRef.current = newPos
      setPicks(prev => ({ ...prev, [teamName]: user.id }))
      setPicksOrdered(prev => [...prev, { team_name: teamName, user_id: user.id, picked_at: new Date().toISOString() }])
      setLeague(prev => prev ? { ...prev, draft_pos: newPos, pick_started_at: new Date().toISOString() } : prev)
      playSound('pick')

      await supabase.from('leagues').update({
        draft_pos: newPos,
        pick_started_at: new Date().toISOString()
      }).eq('id', id)

      if (newPos >= tpp * lg.size) {
        setDraftComplete(true)
        playSound('complete')
      }

    } finally {
      pickingRef.current = false
    }
  }
  // Push notification registration
  async function registerPushNotifications() {
    if (!('Notification' in window)) return false
    const permission = await Notification.requestPermission()
    return permission === 'granted'
  }

  function sendDraftTurnNotification(playerName) {
    if (Notification.permission !== 'granted') return
    const n = new Notification('Your pick is up! ⚽', {
      body: `It's your turn to pick in ${league?.name}. You have 60 seconds!`,
      icon: '/dubup-icon.png',
      badge: '/dubup-icon.png',
      tag: 'draft-turn',
      requireInteraction: true,
    })
    n.onclick = () => { window.focus(); n.close() }
  }

  function sendDraftStartNotification() {
    if (Notification.permission !== 'granted') return
    const n = new Notification('Draft starting! 🏆', {
      body: `The draft for ${league?.name} has begun!`,
      icon: '/dubup-icon.png',
      tag: 'draft-start',
    })
    n.onclick = () => { window.focus(); n.close() }
  }

  // Live scores fetcher
  async function fetchLiveScores() {
    setLiveScoresLoading(true)
    try {
      const fixtures = await fetchLiveFixtures()
      setLiveScores(fixtures)
    } catch(e) {
      console.error('Live scores error:', e)
    }
    setLiveScoresLoading(false)
  }

  // Generate random draft order
  async function randomizeDraftOrder() {
    if (!window.confirm('Randomize the draft order for all players?')) return
    const shuffled = [...members].sort(() => Math.random() - 0.5)
    const updates = shuffled.map((m, i) =>
      supabase.from('league_members').update({ draft_slot: i }).eq('id', m.id)
    )
    await Promise.all(updates)
    // Reload to reflect new order
    await load()
    setDraftSettingsOpen(false)
    alert('Draft order randomized!')
  }

  // Save manual draft order
  async function saveManualOrder(newOrder) {
    const updates = newOrder.map((memberId, i) => {
      const member = members.find(m => m.user_id === memberId)
      return member ? supabase.from('league_members').update({ draft_slot: i }).eq('id', member.id) : Promise.resolve()
    })
    await Promise.all(updates)
    await load()
    setDraftSettingsOpen(false)
  }

  async function startDraft() {
    // Request notification permission before starting
    await registerPushNotifications()
    getAudioCtx()
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission()
    }
    await supabase.from('leagues').update({
      draft_started: true,
      bracket_data: null,
      pick_started_at: new Date().toISOString()
    }).eq('id', id)
    setDraftStarted(true)
    didStartRef.current = true
    setTimeout(() => playSound('draft_start'), 100)
  }

  // Track whether WE triggered the draft start (vs loading into an already-started draft)
  const didStartRef = useRef(false)

  function sendPickNotification() {
    if (!('Notification' in window) || Notification.permission !== 'granted') return
    const n = new Notification('⚽ Your turn to pick!', {
      body: `It's your pick in ${league?.name || 'your league'}. You have 60 seconds!`,
      icon: '/dubup-icon.png',
      badge: '/dubup-icon.png',
      tag: 'draft-pick',
      requireInteraction: true,
    })
    n.onclick = () => { window.focus(); n.close() }
  }

  async function saveSchedule() {
    if (!scheduledTime) return
    const localDate = new Date(scheduledTime)
    if (localDate <= new Date()) {
      alert('Please choose a future date and time.')
      return
    }
    setSavingSchedule(true)
    const isoTime = localDate.toISOString()
    await supabase.from('leagues').update({ scheduled_at: isoTime }).eq('id', id)
    // Update local league state so countdown starts immediately without refresh
    setLeague(prev => ({ ...prev, scheduled_at: isoTime }))
    setSavingSchedule(false)
  }

  async function sendChat() {
    if (!chatInput.trim() || sendingChat) return
    setSendingChat(true)
    const me = members.find(m => m.user_id === user.id)
    const name = me?.profile?.username || me?.profile?.email?.split('@')[0] || 'Player'
    await supabase.from('chat_messages').insert({
      league_id: id,
      user_id: user.id,
      username: name,
      message: chatInput.trim()
    })
    setChatInput('')
    setSendingChat(false)
  }


  // =============================================
  // TOURNAMENT SIMULATION (Commissioner only)
  // Tests all point calculations with fake match data
  // =============================================
  const [simRunning, setSimRunning] = useState(false)
  const [simResults, setSimResults] = useState(null)

  async function simulateTournament() {
    setSimRunning(true)
    setSimResults(null)

    try {
      // Step 1: Simulate full bracket
      const bracket = simulateBracket()

      // Step 2: Generate fake fixtures for ALL matches
      // Group stage: 12 groups x 6 matches = 72 matches
      // Knockout: 32 + 16 + 8 + 4 + 2 + 1 = 63... actually 32+16+8+4+2+1 = no
      // R32=16 matches, R16=8, QF=4, SF=2, Final=1 = 31 matches
      // Total: 72 + 31 = 103 matches + 3rd place = 104
      const fakeFixtures = []
      let fixtureId = 1

      function makeFixture(homeTeam, awayTeam, homeGoals, awayGoals, round, stage, redCards = [], ownGoals = []) {
        const homeId = TEAMS.find(t => t.n === homeTeam.n)?.apiId || fixtureId * 10
        const awayId = TEAMS.find(t => t.n === awayTeam.n)?.apiId || fixtureId * 10 + 1
        const events = []
        // Add red card events
        redCards.forEach(team => {
          const tId = team === homeTeam.n ? homeId : awayId
          events.push({ team: { id: tId }, detail: 'Red Card', type: 'Card' })
        })
        // Add own goal events
        ownGoals.forEach(team => {
          const tId = team === homeTeam.n ? homeId : awayId
          events.push({ team: { id: tId }, detail: 'Own Goal', type: 'Goal' })
        })
        return {
          fixture: { id: fixtureId++, status: { short: 'FT' }, date: '2026-06-15T18:00:00+00:00' },
          league: { round: round },
          teams: {
            home: { id: homeId, name: homeTeam.n },
            away: { id: awayId, name: awayTeam.n }
          },
          goals: { home: homeGoals, away: awayGoals },
          events,
        }
      }

      // Generate group stage fixtures from bracket data
      // We need to reconstruct group stage results
      // Use the team strength scores to generate realistic group stage results
      const shuffled = TEAMS.slice().sort((a, b) => b.s - a.s)
      const groups = []
      for (let g = 0; g < 12; g++) {
        const groupTeams = TEAMS.filter(t => t.g === String.fromCharCode(65 + g))
        groups.push(groupTeams)
      }

      // Generate group stage matches for all 12 groups
      groups.forEach((grp, gi) => {
        const groupLetter = String.fromCharCode(65 + gi)
        for (let i = 0; i < grp.length; i++) {
          for (let j = i + 1; j < grp.length; j++) {
            const home = grp[i]
            const away = grp[j]
            const strengthDiff = (home.s - away.s) / 140
            const homeWinProb = Math.min(0.75, Math.max(0.25, 0.45 + strengthDiff))
            const r = Math.random()
            let hg = Math.max(0, Math.round(Math.random() * 2.5))
            let ag = Math.max(0, Math.round(Math.random() * 2.5))
            if (r < homeWinProb) { if (hg <= ag) hg = ag + 1 }
            else if (r < homeWinProb + 0.22) { ag = hg }
            else { if (ag <= hg) ag = hg + 1 }
            // Occasionally add red cards and own goals for testing
            const redCards = Math.random() < 0.08 ? [Math.random() < 0.5 ? home.n : away.n] : []
            const ownGoals = Math.random() < 0.05 ? [Math.random() < 0.5 ? home.n : away.n] : []
            fakeFixtures.push(makeFixture(home, away, hg, ag, `Group ${groupLetter}`, 'group', redCards, ownGoals))
          }
        }
      })

      // Generate knockout stage fixtures from bracket
      // In knockout, if teams are tied and there's a penWinner, 
      // we use status 'PEN' so calcMatchPoints gives win to the advancing team
      function makeKOFixture(m, round) {
        if (!m.a || !m.b) return
        const homeId = TEAMS.find(t => t.n === m.a.n)?.apiId || fixtureId * 10
        const awayId = TEAMS.find(t => t.n === m.b.n)?.apiId || fixtureId * 10 + 1
        // If pen winner, adjust goals so winner has 1 more (pens decided it)
        // Actually for scoring: draw in regulation = 2pts each, pen win = counted as win
        // We use status PEN and give winner +1 goal to signal win
        let hg = m.ag, ag2 = m.bg
        const isPen = m.penWinner !== null && m.penWinner !== undefined
        if (isPen) {
          // Keep regulation score equal but add +1 to winner's tally for scoring
          if (m.penWinner === 'a') hg = m.ag + 1
          else ag2 = m.bg + 1
        }
        fakeFixtures.push({
          fixture: { id: fixtureId++, status: { short: isPen ? 'PEN' : 'FT' }, date: '2026-06-28T18:00:00+00:00' },
          league: { round },
          teams: {
            home: { id: homeId, name: m.a.n },
            away: { id: awayId, name: m.b.n }
          },
          goals: { home: hg, away: ag2 },
          events: [],
        })
      }

      const stages = [
        { matches: bracket.r32, round: 'Round of 32' },
        { matches: bracket.r16, round: 'Round of 16' },
        { matches: bracket.qf, round: 'Quarter-finals' },
        { matches: bracket.sf, round: 'Semi-finals' },
        { matches: bracket.third, round: '3rd Place' },
        { matches: bracket.final, round: 'Final' },
      ]

      stages.forEach(({ matches, round }) => {
        if (!matches) return
        matches.forEach(m => makeKOFixture(m, round))
      })

      // Step 3: Calculate points for all members
      const results = members.map(m => {
        const mPicks = Object.entries(picks).filter(([, uid]) => uid === m.user_id).map(([t]) => t)
        const { total, breakdown } = calcTotalPoints(fakeFixtures, mPicks, bracket.stageBonus || {})
        return {
          ...m,
          simPts: total,
          simBreakdown: breakdown,
          simPicks: mPicks,
        }
      }).sort((a, b) => b.simPts - a.simPts)

      setSimResults({ results, bracket, fixtures: fakeFixtures })
      setFixtures(fakeFixtures)

      // Save bracket to DB so bracket tab shows results
      await supabase.from('leagues').update({
        bracket_data: JSON.stringify(bracket)
      }).eq('id', id)
      setBracket(bracket)

    } catch(e) {
      alert('Simulation error: ' + e.message)
    }
    setSimRunning(false)
  }

  function clearSimulation() {
    setSimResults(null)
    setFixtures([])
    setBracket(null)
    supabase.from('leagues').update({ bracket_data: null }).eq('id', id)
  }

  function copyCode() {
    navigator.clipboard.writeText(league?.code || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function getDisplayName(m) {
    if (!m) return 'TBD'
    const p = m.profile
    if (p?.username?.trim()) return p.username.trim()
    if (p?.email) return p.email.split('@')[0]
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

  // Trigger draft complete popup - only fires when draft JUST completed, not on page reload
  const prevDraftDoneRef = useRef(null) // null = not yet initialized
  const draftDoneCalc = (league?.draft_pos || 0) >= snakeOrder(league?.size || 4, 48).length || Object.keys(picks).length >= 48
  useEffect(() => {
    if (loading) return
    if (prevDraftDoneRef.current === null) {
      // First render after load - record state but NEVER show popup
      prevDraftDoneRef.current = draftDoneCalc
      return
    }
    // Only show popup if we transitioned from false → true during this session
    if (draftDoneCalc && !prevDraftDoneRef.current && draftStarted) {
      setDraftComplete(true)
      playSound('complete')
    }
    prevDraftDoneRef.current = draftDoneCalc
  }, [draftDoneCalc, draftStarted, loading])

  if (loading) return <div className="container page-wrap"><div className="empty">Loading league...</div></div>

  const tpp = 48 / (league?.size || 4)
  const order = snakeOrder(league?.size || 4, 48)
  // Use picksOrdered.length as the source of truth for whose turn it is
  // This is more reliable than league.draft_pos because picks INSERT
  // real-time fires correctly on all devices
  const draftPos = Math.max(league?.draft_pos || 0, picksOrdered.length)
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
          'Champion':'stage-ch','Final':'stage-ru','Semi-final':'stage-sf',
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
                  <div style={{ fontSize: 18, fontWeight: 900, fontFamily: "var(--font-display)", textTransform: "uppercase", letterSpacing: ".02em", color: 'var(--text)', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>{getDisplayName(p)}<TierBadge referralCount={p.profile?.referral_count} size={14} /></div>
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
                    else if (bracket.final?.some(m => m.a?.n === n || m.b?.n === n)) stageLabel = 'Final'
                    else if (bracket.sf?.some(m => m.a?.n === n || m.b?.n === n)) stageLabel = 'Semi-final'
                    else if (bracket.qf?.some(m => m.a?.n === n || m.b?.n === n)) stageLabel = 'Quarter-final'
                    else if (bracket.r16?.some(m => m.a?.n === n || m.b?.n === n)) stageLabel = 'Round of 16'
                    else if (bracket.r32?.some(m => m.a?.n === n || m.b?.n === n)) stageLabel = 'Round of 32'
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: 'var(--text)', textTransform: 'uppercase' }}>
                {getDisplayName(members.find(m => m.user_id === user.id))}
                <TierBadge referralCount={myProfile?.referral_count} />
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
              { label: 'Refer Friends', icon: '🌍', action: () => { navigate('/referral'); setProfileMenuOpen(false) } },
              { label: 'Edit Profile', icon: '👤', action: () => { navigate('/profile'); setProfileMenuOpen(false) } },
              { label: 'How to Play', icon: '📖', action: () => { navigate('/how-to-play'); setProfileMenuOpen(false) } },
              { label: 'Privacy Policy', icon: '🔒', action: () => { navigate('/privacy'); setProfileMenuOpen(false) } },
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
                  <div className="avatar" style={{ background: m.profile?.avatar_url ? 'transparent' : AV_BG[m.draft_slot % 8], color: AV_FG[m.draft_slot % 8], overflow: 'hidden' }}>
                    {m.profile?.avatar_url
                      ? <img src={m.profile.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : getDisplayName(m).slice(0, 2).toUpperCase()
                    }
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontWeight: 500, fontSize: 14 }}>
                        {getDisplayName(m)} {m.user_id === user.id && <span style={{ fontSize: 11, color: 'var(--text3)' }}>(you)</span>}
                        <TierBadge referralCount={m.profile?.referral_count} />
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

            {/* Referral Promo Widget */}
            {(() => {
              const nextTier = getNextTier(myProfile?.referral_count || 0)
              const currentTier = getTier(myProfile?.referral_count || 0)
              const count = myProfile?.referral_count || 0
              return (
                <div style={{ background: 'linear-gradient(135deg, rgba(193,73,46,.1), rgba(200,169,106,.06))', border: '1px solid var(--border-clay)', borderRadius: 14, padding: '1rem 1.1rem', marginTop: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div>
                      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 14, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--text)', marginBottom: 2 }}>
                        🌍 Refer Friends
                      </div>
                      {currentTier ? (
                        <div style={{ fontSize: 12, color: currentTier.color, fontWeight: 600 }}>
                          {currentTier.emoji} {currentTier.label}
                        </div>
                      ) : nextTier ? (
                        <div style={{ fontSize: 12, color: 'var(--text2)' }}>
                          {count}/{nextTier.minReferrals} to {nextTier.label}
                        </div>
                      ) : (
                        <div style={{ fontSize: 12, color: 'var(--text2)' }}>Earn badges by inviting friends</div>
                      )}
                    </div>
                    <button
                      className="btn btn-primary"
                      style={{ fontSize: 12, padding: '8px 14px', flexShrink: 0 }}
                      onClick={() => navigate('/referral')}
                    >
                      Invite →
                    </button>
                  </div>
                  {/* Progress bar to next tier */}
                  {nextTier && (
                    <div>
                      <div style={{ height: 4, background: 'var(--bg3)', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{ height: 4, width: `${Math.min(100, (count / nextTier.minReferrals) * 100)}%`, background: `linear-gradient(90deg, var(--clay), ${nextTier.color})`, borderRadius: 99, transition: 'width .4s ease' }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5, fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--font-display)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em' }}>
                        <span>{count} referrals</span>
                        <span>{nextTier.emoji} {nextTier.minReferrals} for {nextTier.label}</span>
                      </div>
                    </div>
                  )}
                  {/* Tier badges preview */}
                  <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                    {TIERS.slice().reverse().map(t => (
                      <div key={t.id} style={{ flex: 1, background: count >= t.minReferrals ? t.bg : 'var(--bg3)', border: `1px solid ${count >= t.minReferrals ? t.border : 'var(--border)'}`, borderRadius: 8, padding: '6px 4px', textAlign: 'center', opacity: count >= t.minReferrals ? 1 : 0.4 }}>
                        <div style={{ fontSize: 16 }}>{t.emoji}</div>
                        <div style={{ fontSize: 9, fontFamily: 'var(--font-display)', fontWeight: 700, color: count >= t.minReferrals ? t.color : 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.04em', marginTop: 2 }}>{t.id}</div>
                        <div style={{ fontSize: 9, color: 'var(--text3)', marginTop: 1 }}>{t.minReferrals}+</div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })()}

            {/* Tournament Simulation — Commissioner only, for testing */}
            {isCommissioner && draftDone && (
              <div style={{ background: 'rgba(93,202,165,.06)', border: '1px solid rgba(93,202,165,.2)', borderRadius: 14, padding: '1rem 1.1rem', marginTop: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 14, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--text)' }}>
                      🧪 Simulate Tournament
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>Commissioner only — generates all 104 matches to test scoring</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    className="btn btn-primary"
                    style={{ fontSize: 12, padding: '8px 14px' }}
                    onClick={simulateTournament}
                    disabled={simRunning}
                  >
                    {simRunning ? '⏳ Simulating...' : '▶ Run simulation'}
                  </button>
                  {simResults && (
                    <button
                      className="btn btn-secondary"
                      style={{ fontSize: 12, padding: '8px 14px', color: '#FF9090' }}
                      onClick={clearSimulation}
                    >
                      ✕ Clear results
                    </button>
                  )}
                </div>

                {simResults && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-display)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>
                      Simulated Final Standings ({simResults.fixtures.length} matches played)
                    </div>
                    {simResults.results.map((m, i) => (
                      <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < simResults.results.length - 1 ? '1px solid var(--border)' : 'none' }}>
                        <span style={{ fontSize: 13, color: i === 0 ? '#FAC775' : 'var(--text3)', fontWeight: 700, minWidth: 20 }}>
                          {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}.`}
                        </span>
                        <div className="avatar" style={{ background: AV_BG[m.draft_slot % 8], color: AV_FG[m.draft_slot % 8], width: 28, height: 28, fontSize: 10 }}>
                          {getDisplayName(m).slice(0,2).toUpperCase()}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                            {getDisplayName(m)} {m.user_id === user.id && <span style={{ fontSize: 10, color: 'var(--text3)' }}>(you)</span>}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                            {m.simPicks.length} teams · champion: {simResults.bracket?.champ?.n && m.simPicks.includes(simResults.bracket.champ.n) ? <span style={{ color: '#FAC775' }}>🏆 {simResults.bracket.champ.n}</span> : 'none'}
                          </div>
                        </div>
                        <div style={{ fontFamily: 'var(--mono)', fontWeight: 900, fontSize: 16, color: '#5DCAA5' }}>
                          {m.simPts} pts
                        </div>
                      </div>
                    ))}
                    <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text3)', lineHeight: 1.6 }}>
                      💡 Check My Teams tab and Bracket tab to see full point breakdowns. Run again for different results.
                    </div>
                  </div>
                )}
              </div>
            )}
            {draftDone && (() => {
              const wcStartDate = new Date('2026-06-11T00:00:00Z')
              const isLive = new Date() >= wcStartDate
              return (
                <div style={{ marginTop: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <div className="card-title" style={{ marginBottom: 0 }}>⚽ Live Scores</div>
                    {isLive && (
                      <button className="btn btn-secondary" style={{ fontSize: 11, padding: '4px 10px' }} onClick={fetchLiveScores} disabled={liveScoresLoading}>
                        {liveScoresLoading ? '...' : 'Refresh'}
                      </button>
                    )}
                  </div>
                  {!isLive ? (
                    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.5rem', textAlign: 'center' }}>
                      <div style={{ fontSize: 24, marginBottom: 8 }}>📅</div>
                      <div style={{ fontSize: 14, color: 'var(--text2)', fontWeight: 600 }}>World Cup starts June 11, 2026</div>
                      <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>Live scores and real-time points will appear here</div>
                    </div>
                  ) : liveScores.length === 0 ? (
                    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.5rem', textAlign: 'center' }}>
                      <div style={{ fontSize: 14, color: 'var(--text2)' }}>No live matches right now</div>
                      <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>Tap Refresh to check for updates</div>
                    </div>
                  ) : liveScores.map((fix, fi) => {
                    const home = fix.teams?.home?.name
                    const away = fix.teams?.away?.name
                    const homeGoals = fix.goals?.home ?? '?'
                    const awayGoals = fix.goals?.away ?? '?'
                    const status = fix.fixture?.status?.elapsed
                    const myTeamsInMatch = myPicks.filter(t => t === home || t === away)
                    return (
                      <div key={fi} style={{ background: myTeamsInMatch.length ? 'rgba(193,73,46,.05)' : 'var(--bg2)', border: `1px solid ${myTeamsInMatch.length ? 'var(--border-clay)' : 'var(--border)'}`, borderRadius: 10, padding: '12px 14px', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, fontSize: 13, color: myPicks.includes(home) ? 'var(--clay-light)' : 'var(--text)', fontWeight: myPicks.includes(home) ? 700 : 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <Flag team={home} size={14} /> {home}
                        </div>
                        <div style={{ textAlign: 'center', minWidth: 60 }}>
                          <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>{homeGoals} - {awayGoals}</div>
                          {status && <div style={{ fontSize: 10, color: '#5DCAA5', fontFamily: 'var(--font-display)', fontWeight: 700 }}>{status}'</div>}
                        </div>
                        <div style={{ flex: 1, fontSize: 13, color: myPicks.includes(away) ? 'var(--clay-light)' : 'var(--text)', fontWeight: myPicks.includes(away) ? 700 : 500, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {away} <Flag team={away} size={14} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })()}
          </>
        )}

        {/* DRAFT TAB */}
        {tab === 'draft' && (() => {
          try { return (
          <>
            {!draftStarted ? (
              <>
                <div style={{ background: 'rgba(255,255,255,.05)', border: '1px solid var(--border)', borderRadius: 10, padding: 16, marginBottom: '1.25rem', textAlign: 'center' }}>
                  <p style={{ fontSize: 14, color: 'var(--text2)', marginBottom: isCommissioner ? 12 : 0 }}>
                    {league?.scheduled_at ? `Draft starts ${new Date(league.scheduled_at).toLocaleString()}` : 'Waiting for commissioner to start the draft'}
                  </p>
                  {isCommissioner && <button className="btn btn-primary" onClick={startDraft}>🚀 Start draft now</button>}
                </div>

                {/* Draft Order Card */}
                <div className="card" style={{ marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <div className="card-title" style={{ marginBottom: 0 }}>Draft Order</div>
                    {isCommissioner && (
                      <button onClick={() => setDraftSettingsOpen(v => !v)} style={{ background: 'none', border: '1px solid var(--border2)', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', fontSize: 13, color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 5 }}>
                        ⚙️ <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.06em' }}>Settings</span>
                      </button>
                    )}
                  </div>

                  {/* Settings panel */}
                  {draftSettingsOpen && isCommissioner && (
                    <div style={{ background: 'var(--bg3)', border: '1px solid var(--border-clay)', borderRadius: 10, padding: '12px', marginBottom: '1rem' }}>
                      <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 10, lineHeight: 1.5 }}>
                        Set the draft pick order. The snake draft reverses each round automatically.
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                        <button className="btn btn-secondary" style={{ fontSize: 12, padding: '8px 14px' }} onClick={randomizeDraftOrder}>
                          🎲 Randomize order
                        </button>
                      </div>
                      {/* Manual order - drag by tapping up/down */}
                      <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 8, fontFamily: 'var(--font-display)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em' }}>Manual order</div>
                      {(() => {
                        const ordered = [...members].sort((a, b) => (a.draft_slot ?? 0) - (b.draft_slot ?? 0))
                        return ordered.map((m, i) => (
                          <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: i < ordered.length - 1 ? '1px solid var(--border)' : 'none' }}>
                            <span style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--clay-light)', width: 20 }}>#{i + 1}</span>
                            <div className="avatar" style={{ width: 28, height: 28, fontSize: 11, background: AV_BG[i % 8], color: AV_FG[i % 8] }}>{getDisplayName(m).slice(0,2).toUpperCase()}</div>
                            <span style={{ flex: 1, fontSize: 13, color: 'var(--text)' }}>{getDisplayName(m)}</span>
                            <div style={{ display: 'flex', gap: 4 }}>
                              {i > 0 && (
                                <button onClick={async () => {
                                  const newOrder = [...ordered]
                                  ;[newOrder[i-1], newOrder[i]] = [newOrder[i], newOrder[i-1]]
                                  await saveManualOrder(newOrder.map(x => x.user_id))
                                }} style={{ background: 'var(--bg4)', border: '1px solid var(--border)', borderRadius: 5, padding: '3px 8px', cursor: 'pointer', color: 'var(--text2)', fontSize: 12 }}>↑</button>
                              )}
                              {i < ordered.length - 1 && (
                                <button onClick={async () => {
                                  const newOrder = [...ordered]
                                  ;[newOrder[i], newOrder[i+1]] = [newOrder[i+1], newOrder[i]]
                                  await saveManualOrder(newOrder.map(x => x.user_id))
                                }} style={{ background: 'var(--bg4)', border: '1px solid var(--border)', borderRadius: 5, padding: '3px 8px', cursor: 'pointer', color: 'var(--text2)', fontSize: 12 }}>↓</button>
                              )}
                            </div>
                          </div>
                        ))
                      })()}
                    </div>
                  )}

                  {/* Current order display for everyone */}
                  {[...members].sort((a, b) => (a.draft_slot ?? 0) - (b.draft_slot ?? 0)).map((m, i) => (
                    <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < members.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--clay-light)', width: 22 }}>#{i + 1}</span>
                      <div className="avatar" style={{ width: 30, height: 30, fontSize: 11, background: AV_BG[i % 8], color: AV_FG[i % 8] }}>{getDisplayName(m).slice(0,2).toUpperCase()}</div>
                      <span style={{ flex: 1, fontSize: 13, color: m.user_id === user.id ? 'var(--clay-light)' : 'var(--text)', fontWeight: m.user_id === user.id ? 700 : 400 }}>
                        {getDisplayName(m)} {m.user_id === user.id && '(you)'}
                      </span>
                      {m.user_id === user.id && <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-display)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em' }}>Pick {i + 1}</span>}
                    </div>
                  ))}
                </div>
              </>
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

            {/* YOUR TURN banner */}
            {draftStarted && !draftDone && isMyTurn && (
              <div style={{
                background: 'rgba(193,73,46,.12)',
                border: '2px solid var(--clay)',
                borderRadius: 12,
                padding: '14px 16px',
                marginBottom: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                animation: 'pulse 1.5s infinite',
              }}>
                <div style={{ fontSize: 28 }}>⚽</div>
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 16, color: 'var(--clay-light)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Your Pick!</div>
                  <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>Tap a team below — {timeLeft}s remaining</div>
                </div>
                <div style={{ marginLeft: 'auto', fontFamily: 'var(--mono)', fontSize: 28, fontWeight: 900, color: timeLeft <= 10 ? '#FF9090' : 'var(--clay-light)' }}>{timeLeft}</div>
              </div>
            )}

            {/* Waiting for others banner */}
            {draftStarted && !draftDone && !isMyTurn && (
              <div style={{
                background: 'var(--bg3)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: '12px 16px',
                marginBottom: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}>
                <div style={{ fontSize: 20 }}>⏳</div>
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '.04em' }}>
                    {getDisplayName(members.find(m => m.draft_slot === currentTurn))}'s turn
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>{timeLeft}s remaining</div>
                </div>
                <div style={{ marginLeft: 'auto', fontFamily: 'var(--mono)', fontSize: 22, fontWeight: 700, color: timeLeft <= 10 ? '#FF9090' : 'var(--text3)' }}>{timeLeft}</div>
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
                      // Step 3: go back 1 draft position and reset timer
                      const newPos = Math.max(0, (league?.draft_pos || 1) - 1)
                      await supabase.from('leagues').update({
                        draft_pos: newPos,
                        pick_started_at: new Date().toISOString()
                      }).eq('id', id)
                      // Real-time will sync other clients via DELETE subscription
                    }}
                  >
                    ↩ Reverse last pick
                  </button>
                  <button
                    className="btn btn-secondary"
                    style={{ fontSize: 12, padding: '8px 14px', color: '#FF9090', borderColor: 'rgba(255,75,75,.3)' }}
                    onClick={async () => {
                      if (!window.confirm('Restart the entire draft? ALL picks will be deleted and the draft will go back to not started.')) return
                      // Step 1: Reset league in DB first — real-time fires for all clients
                      await supabase.from('leagues').update({
                        draft_pos: 0,
                        draft_started: false,
                        bracket_data: null,
                        pick_started_at: null,
                        scheduled_at: null
                      }).eq('id', id)
                      // Step 2: Delete all picks — real-time DELETE fires for all clients
                      await supabase.from('picks').delete().eq('league_id', id)
                      // Step 3: load() is called by the real-time handler — no local state changes here
                      // This prevents the flash caused by multiple rapid state updates
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
                  {/* Team breakdown modal */}
                  {selectedTeam && (() => {
                    const stageBonus = bracket?.stageBonus || {}
                    const bonus = stageBonus[selectedTeam] || 0
                    const breakdown = displayMember?.breakdown?.[selectedTeam]
                    const matches = breakdown?.matches || []
                    let stageLabel = 'Group stage'
                    if (bracket) {
                      if (bracket.champ?.n === selectedTeam) stageLabel = 'Champion'
                      else if (bracket.final?.some(m => m.a?.n === selectedTeam || m.b?.n === selectedTeam)) stageLabel = 'Final'
                      else if (bracket.sf?.some(m => m.a?.n === selectedTeam || m.b?.n === selectedTeam)) stageLabel = 'Semi-final'
                      else if (bracket.qf?.some(m => m.a?.n === selectedTeam || m.b?.n === selectedTeam)) stageLabel = 'Quarter-final'
                      else if (bracket.r16?.some(m => m.a?.n === selectedTeam || m.b?.n === selectedTeam)) stageLabel = 'Round of 16'
                      else if (bracket.r32?.some(m => m.a?.n === selectedTeam || m.b?.n === selectedTeam)) stageLabel = 'Round of 32'
                    }
                    return (
                      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 500, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={() => setSelectedTeam(null)}>
                        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px 16px 0 0', padding: '1.5rem', width: '100%', maxWidth: 600, maxHeight: '80vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <Flag team={selectedTeam} size={24} />
                              <div>
                                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 18, textTransform: 'uppercase', letterSpacing: '.04em' }}>{selectedTeam}</div>
                                <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>{breakdown?.pts || 0} pts total</div>
                              </div>
                            </div>
                            <button onClick={() => setSelectedTeam(null)} style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 24, cursor: 'pointer' }}>×</button>
                          </div>

                          {/* Match breakdown */}
                          {matches.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '1.5rem 0', color: 'var(--text2)', fontSize: 14 }}>
                              {new Date() < new Date('2026-06-11T00:00:00Z')
                                ? '⏳ Match data available from June 11, 2026'
                                : 'No matches played yet'}
                            </div>
                          ) : (
                            <>
                              <div className="card-title">Match Results</div>
                              {matches.map((match, i) => (
                                <div key={i} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                    <div>
                                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                                        <span style={{ color: match.result === 'W' ? '#5DCAA5' : match.result === 'D' ? '#FAC775' : '#F09595', fontFamily: 'var(--font-display)', fontWeight: 700, marginRight: 8 }}>{match.result}</span>
                                        vs {match.opponent}
                                      </div>
                                      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{match.round || ''}</div>
                                    </div>
                                    <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 15, color: match.pts >= 0 ? 'var(--text)' : '#F09595' }}>
                                      {match.pts > 0 ? '+' : ''}{match.pts} pts
                                    </div>
                                  </div>
                                  {/* Per-event breakdown */}
                                  {match.breakdown?.map((ev, j) => (
                                    <div key={j} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text3)', padding: '2px 8px' }}>
                                      <span>{ev.label}</span>
                                      <span style={{ fontFamily: 'var(--mono)', color: ev.pts < 0 ? '#F09595' : 'var(--text3)' }}>{ev.pts > 0 ? '+' : ''}{ev.pts}</span>
                                    </div>
                                  ))}
                                </div>
                              ))}
                            </>
                          )}

                          {/* Stage bonus */}
                          {bonus > 0 && (
                            <div style={{ marginTop: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                  <div style={{ fontSize: 13, fontWeight: 600 }}>Tournament advancement</div>
                                  <div style={{ marginTop: 3 }}><span className={`badge ${STAGE_CSS[stageLabel] || 'stage-gs'}`}>{stageLabel}</span></div>
                                </div>
                                <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 15, color: 'var(--clay-light)' }}>+{bonus} pts</div>
                              </div>
                            </div>
                          )}

                          {/* Total */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, paddingTop: 12, borderTop: '2px solid var(--border2)' }}>
                            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text2)' }}>Total</div>
                            <div style={{ fontFamily: 'var(--mono)', fontWeight: 900, fontSize: 22, color: 'var(--text)' }}>{breakdown?.pts || 0} pts</div>
                          </div>
                        </div>
                      </div>
                    )
                  })()}

                  {/* Team cards — tap to see breakdown */}
                  <div className="card-title">Tap a team for point breakdown</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: '1.5rem' }}>
                    {displayPicks.map(n => {
                      const stageBonus = bracket?.stageBonus || {}
                      const bonus = stageBonus[n] || 0
                      const breakdown = displayMember?.breakdown?.[n]
                      const totalPts = breakdown?.pts || 0
                      let stageLabel = 'Group stage'
                      if (bracket) {
                        if (bracket.champ?.n === n) stageLabel = 'Champion'
                        else if (bracket.final?.some(m => m.a?.n === n || m.b?.n === n)) stageLabel = 'Final'
                        else if (bracket.sf?.some(m => m.a?.n === n || m.b?.n === n)) stageLabel = 'Semi-final'
                        else if (bracket.qf?.some(m => m.a?.n === n || m.b?.n === n)) stageLabel = 'Quarter-final'
                        else if (bracket.r16?.some(m => m.a?.n === n || m.b?.n === n)) stageLabel = 'Round of 16'
                        else if (bracket.r32?.some(m => m.a?.n === n || m.b?.n === n)) stageLabel = 'Round of 32'
                      }
                      return (
                        <div key={n} onClick={() => setSelectedTeam(n)} style={{ background: 'var(--bg2)', border: `1px solid ${selectedTeam === n ? 'var(--clay)' : 'var(--border)'}`, borderRadius: 10, padding: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
                          <Flag team={n} size={22} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '.04em', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
                              <span className={`badge ${STAGE_CSS[stageLabel] || 'stage-gs'}`} style={{ fontSize: 9, padding: '1px 5px' }}>{stageLabel}</span>
                            </div>
                          </div>
                          <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 15, color: 'var(--clay-light)', flexShrink: 0 }}>{totalPts}</div>
                        </div>
                      )
                    })}
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <h2 style={{ fontSize: 20, fontWeight: 900, fontFamily: "var(--font-display)", textTransform: "uppercase", letterSpacing: ".02em" }}>League Chat</h2>
              {isCommissioner && chatMessages.length > 0 && (
                <button
                  className="btn btn-secondary"
                  style={{ fontSize: 11, padding: '5px 10px', color: '#FF9090', borderColor: 'rgba(255,75,75,.25)' }}
                  onClick={async () => {
                    if (!window.confirm('Clear all chat messages?')) return
                    await supabase.from('chat_messages').delete().eq('league_id', id)
                    setChatMessages([])
                  }}
                >🗑 Clear chat</button>
              )}
            </div>
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
                        <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 6 }}>
                          {msg.username}
                          {(isMe || isCommissioner) && (
                            <button onClick={async () => {
                              const { error } = await supabase.from('chat_messages').delete().eq('id', msg.id)
                              if (!error) setChatMessages(prev => prev.filter(m => m.id !== msg.id))
                            }} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 10, padding: '0 2px', lineHeight: 1 }}>✕</button>
                          )}
                        </div>
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
                <tr><td style={{ color: '#FF9090' }}>Own goal</td><td style={{ fontWeight: 600, fontFamily: 'var(--mono)', color: '#FF9090' }}>-1 pt</td></tr>
                <tr><td style={{ color: '#FF9090' }}>Red card</td><td style={{ fontWeight: 600, fontFamily: 'var(--mono)', color: '#FF9090' }}>-2 pts</td></tr>
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
