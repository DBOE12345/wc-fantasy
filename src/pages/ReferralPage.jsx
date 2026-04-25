import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { TIERS, getTier, getNextTier } from '../lib/tiers'
import { useAuth } from '../hooks/useAuth'
import { DubUpLogoHorizontal } from '../components/DubUpLogo'

export default function ReferralPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [myCode, setMyCode] = useState('')
  const [leaderboard, setLeaderboard] = useState([])
  const [myReferrals, setMyReferrals] = useState(0)
  const [myRank, setMyRank] = useState(null)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)
  const [myUsername, setMyUsername] = useState('')

  useEffect(() => { load() }, [user])

  async function load() {
    setLoading(true)

    // Load my profile + referral code
    const { data: profile } = await supabase
      .from('profiles').select('username, referral_code').eq('id', user.id).single()

    let code = profile?.referral_code
    if (!code) {
      // Generate a code if they don't have one
      code = (profile?.username || user.email.split('@')[0]).slice(0, 6).toUpperCase().replace(/[^A-Z0-9]/g, '') + Math.floor(Math.random() * 99)
      await supabase.from('profiles').update({ referral_code: code }).eq('id', user.id)
    }
    setMyCode(code)
    setMyUsername(profile?.username || user.email.split('@')[0])

    // Load leaderboard - count referrals per user
    const { data: leaders } = await supabase
      .from('profiles')
      .select('username, referral_code, referral_count')
      .gt('referral_count', 0)
      .order('referral_count', { ascending: false })
      .limit(20)

    setLeaderboard(leaders || [])

    // My referral count
    const { data: myProfile } = await supabase
      .from('profiles').select('referral_count').eq('id', user.id).single()
    const myCount = myProfile?.referral_count || 0
    setMyReferrals(myCount)

    // My rank
    if (myCount > 0 && leaders) {
      const rank = leaders.findIndex(l => l.referral_code === code) + 1
      setMyRank(rank > 0 ? rank : null)
    }

    setLoading(false)
  }

  const referralLink = `${window.location.origin}/auth?ref=${myCode}`

  function copyLink() {
    navigator.clipboard.writeText(referralLink).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    })
  }

  function shareLink() {
    if (navigator.share) {
      navigator.share({
        title: 'Join my DubUp Fantasy league!',
        text: `Play World Cup 2026 fantasy with me on DubUp Fantasy! Use my link to sign up:`,
        url: referralLink,
      })
    } else {
      copyLink()
    }
  }

  const rankEmoji = (i) => i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`

  return (
    <div>
      <div className="app-header">
        <div className="header-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', color: 'var(--text2)', fontSize: 20, lineHeight: 1 }}>←</button>
            <DubUpLogoHorizontal height={36} />
          </div>
        </div>
      </div>

      <div className="container page-wrap" style={{ paddingLeft: 'max(1rem, env(safe-area-inset-left))', paddingRight: 'max(1rem, env(safe-area-inset-right))' }}>

        <div style={{ marginBottom: '1.75rem' }}>
          <h2 style={{ fontSize: 22, fontWeight: 900, fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '.02em', marginBottom: 4 }}>Refer & Earn</h2>
          <p style={{ fontSize: 14, color: 'var(--text2)' }}>Invite friends to DubUp Fantasy and climb the referral leaderboard</p>
        </div>

        {/* My referral card */}
        <div style={{ background: 'linear-gradient(135deg, rgba(193,73,46,.15), rgba(193,73,46,.05))', border: '1px solid var(--border-clay)', borderRadius: 16, padding: '1.25rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div>
              <div style={{ fontSize: 11, fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--clay-light)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 4 }}>Your referral stats</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ fontSize: 36, fontWeight: 900, fontFamily: 'var(--font-display)', color: 'var(--text)' }}>{myReferrals}</span>
                <span style={{ fontSize: 14, color: 'var(--text2)' }}>friends signed up</span>
              </div>
              {myRank && <div style={{ fontSize: 12, color: 'var(--clay-light)', marginTop: 4 }}>#{myRank} on the leaderboard</div>}
              {(() => {
                const tier = getTier(myReferrals)
                const next = getNextTier(myReferrals)
                if (tier) return <div style={{ fontSize: 12, color: tier.color, fontWeight: 700, marginTop: 4 }}>{tier.emoji} {tier.label}</div>
                if (next) return <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4 }}>{myReferrals}/{next.minReferrals} to {next.label}</div>
                return null
              })()}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4, fontFamily: 'var(--font-display)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em' }}>Your code</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 22, fontWeight: 700, color: 'var(--clay-light)', letterSpacing: '.15em' }}>{myCode}</div>
            </div>
          </div>

          {/* Referral link */}
          <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: '10px 12px', marginBottom: 10, fontSize: 12, color: 'var(--text3)', fontFamily: 'var(--mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {referralLink}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <button className="btn btn-secondary" style={{ fontSize: 13 }} onClick={copyLink}>
              {copied ? '✓ Copied!' : '📋 Copy link'}
            </button>
            <button className="btn btn-primary" style={{ fontSize: 13 }} onClick={shareLink}>
              🔗 Share
            </button>
          </div>
        </div>

        {/* Tier Status */}
        {(() => {
          const currentTier = getTier(myReferrals)
          const nextTier = getNextTier(myReferrals)
          return (
            <div style={{ marginBottom: '1.5rem' }}>
              <div className="card-title">Your Dubber Status</div>

              {/* Current tier */}
              {currentTier ? (
                <div style={{ background: currentTier.bg, border: `1px solid ${currentTier.border}`, borderRadius: 14, padding: '1rem 1.1rem', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ fontSize: 36 }}>{currentTier.emoji}</div>
                    <div>
                      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 18, color: currentTier.color, textTransform: 'uppercase', letterSpacing: '.04em' }}>{currentTier.label}</div>
                      <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>Achieved at {currentTier.minReferrals} referrals</div>
                    </div>
                  </div>
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${currentTier.border}` }}>
                    <div style={{ fontSize: 11, fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>Your perks</div>
                    {currentTier.perks.map((p, i) => (
                      <div key={i} style={{ fontSize: 12, color: 'var(--text2)', padding: '3px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ color: currentTier.color }}>✓</span> {p}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: '1rem', marginBottom: 10, textAlign: 'center' }}>
                  <div style={{ fontSize: 24, marginBottom: 6 }}>🏅</div>
                  <div style={{ fontSize: 14, color: 'var(--text2)', fontWeight: 600 }}>No tier yet</div>
                  <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 3 }}>Refer 20 friends to earn Bronze Dubber status</div>
                </div>
              )}

              {/* Progress to next tier */}
              {nextTier && (
                <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 600 }}>Next: {nextTier.emoji} {nextTier.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--text3)' }}>{myReferrals}/{nextTier.minReferrals}</div>
                  </div>
                  <div style={{ height: 6, background: 'var(--bg3)', borderRadius: 99, overflow: 'hidden', marginBottom: 8 }}>
                    <div style={{ height: 6, width: `${Math.min(100, (myReferrals / nextTier.minReferrals) * 100)}%`, background: `linear-gradient(90deg, var(--clay), ${nextTier.color})`, borderRadius: 99, transition: 'width .4s ease' }} />
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>{nextTier.minReferrals - myReferrals} more referral{nextTier.minReferrals - myReferrals !== 1 ? 's' : ''} needed</div>
                </div>
              )}
            </div>
          )
        })()}

        {/* All tiers overview */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div className="card-title">Dubber Tiers</div>
          {TIERS.slice().reverse().map(tier => {
            const unlocked = myReferrals >= tier.minReferrals
            return (
              <div key={tier.id} style={{ background: unlocked ? tier.bg : 'var(--bg2)', border: `1px solid ${unlocked ? tier.border : 'var(--border)'}`, borderRadius: 12, padding: '12px 14px', marginBottom: 8, opacity: unlocked ? 1 : 0.55, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ fontSize: 28, flexShrink: 0 }}>{tier.emoji}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: unlocked ? tier.color : 'var(--text)', textTransform: 'uppercase', letterSpacing: '.04em' }}>{tier.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{tier.minReferrals}+ referrals required</div>
                </div>
                <div style={{ flexShrink: 0 }}>
                  {unlocked
                    ? <span style={{ fontSize: 11, background: tier.bg, color: tier.color, border: `1px solid ${tier.border}`, borderRadius: 5, padding: '2px 8px', fontFamily: 'var(--font-display)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em' }}>Unlocked</span>
                    : <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-display)', fontWeight: 700 }}>{tier.minReferrals - myReferrals} to go</span>
                  }
                </div>
              </div>
            )
          })}
        </div>

        {/* How it works */}
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-title">How it works</div>
          {[
            { step: '1', text: 'Share your unique referral link with friends' },
            { step: '2', text: 'They sign up using your link' },
            { step: '3', text: 'Your referral count goes up automatically' },
            { step: '4', text: 'Climb the global leaderboard and earn bragging rights 🏆' },
          ].map(item => (
            <div key={item.step} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--clay)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12, color: 'var(--sand)', flexShrink: 0 }}>{item.step}</div>
              <div style={{ fontSize: 13, color: 'var(--text2)', paddingTop: 3, lineHeight: 1.5 }}>{item.text}</div>
            </div>
          ))}
        </div>

        {/* Tier system */}
        <div className="card-title">Dubber Tiers — Earn Your Badge</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: '1.5rem' }}>
          {TIERS.slice().reverse().map(t => {
            const earned = myReferrals >= t.minReferrals
            const isCurrent = getTier(myReferrals)?.id === t.id
            const progress = Math.min(100, (myReferrals / t.minReferrals) * 100)
            return (
              <div key={t.id} style={{ background: earned ? t.bg : 'var(--bg2)', border: `1px solid ${earned ? t.border : 'var(--border)'}`, borderRadius: 12, padding: '14px 16px', opacity: earned ? 1 : 0.65, transition: 'all .2s' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: earned ? 0 : 8 }}>
                  <span style={{ fontSize: 26 }}>{t.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 15, color: earned ? t.color : 'var(--text)', textTransform: 'uppercase', letterSpacing: '.04em' }}>{t.label}</span>
                      {isCurrent && <span style={{ fontSize: 10, background: t.bg, border: `1px solid ${t.border}`, color: t.color, borderRadius: 4, padding: '1px 7px', fontFamily: 'var(--font-display)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em' }}>Your tier</span>}
                      {earned && !isCurrent && <span style={{ fontSize: 10, color: t.color, fontFamily: 'var(--font-display)', fontWeight: 700 }}>✓ Earned</span>}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{t.minReferrals} referrals required</div>
                  </div>
                </div>
                {/* Perks */}
                <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {t.perks.map((perk, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: earned ? t.color : 'var(--text3)' }}>
                      <span style={{ fontSize: 10 }}>{earned ? '✓' : '○'}</span>{perk}
                    </div>
                  ))}
                </div>
                {/* Progress bar if not earned */}
                {!earned && (
                  <div style={{ marginTop: 10 }}>
                    <div style={{ height: 3, background: 'var(--bg3)', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ height: 3, width: `${progress}%`, background: `linear-gradient(90deg, var(--clay), ${t.color})`, borderRadius: 99 }} />
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 4 }}>{myReferrals}/{t.minReferrals} — {t.minReferrals - myReferrals} more to go</div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Global leaderboard */}
        <div className="card-title">Global Leaderboard</div>
        {loading ? (
          <div className="empty" style={{ padding: '2rem 0' }}>Loading...</div>
        ) : leaderboard.length === 0 ? (
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: '2rem', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🌍</div>
            <div style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 4 }}>No referrals yet</div>
            <div style={{ fontSize: 12, color: 'var(--text3)' }}>Be the first to invite friends!</div>
          </div>
        ) : (
          <div className="card">
            {leaderboard.map((entry, i) => {
              const isMe = entry.referral_code === myCode
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderBottom: i < leaderboard.length - 1 ? '1px solid var(--border)' : 'none', background: isMe ? 'rgba(193,73,46,.04)' : 'transparent' }}>
                  <div style={{ width: 28, textAlign: 'center', fontSize: i < 3 ? 18 : 13, fontFamily: 'var(--font-display)', fontWeight: 700, color: i < 3 ? undefined : 'var(--text3)', flexShrink: 0 }}>
                    {rankEmoji(i)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: isMe ? 'var(--clay-light)' : 'var(--text)', textTransform: 'uppercase', letterSpacing: '.03em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {entry.username || 'Player'} {isMe && <span style={{ fontSize: 10, color: 'var(--text3)' }}>(you)</span>}
                      {(() => { const tier = getTier(entry.referral_count || 0); return tier ? <span style={{ fontSize: 9, background: tier.bg, border: `1px solid ${tier.border}`, color: tier.color, borderRadius: 3, padding: '1px 5px', marginLeft: 4, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em' }}>{tier.emoji} {tier.id}</span> : null })()}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16, color: isMe ? 'var(--clay-light)' : 'var(--text)' }}>{entry.referral_count}</span>
                    <span style={{ fontSize: 11, color: 'var(--text3)' }}>referrals</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* My position if not in top 20 */}
        {myReferrals > 0 && myRank && myRank > 20 && (
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border-clay)', borderRadius: 10, padding: '12px 16px', marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 13, color: 'var(--text2)' }}>Your rank</div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: 'var(--clay-light)' }}>#{myRank} · {myReferrals} referrals</div>
          </div>
        )}

      </div>
    </div>
  )
}
