import { useState } from 'react'
import DubUpLogo, { DubUpLogoLarge } from '../components/DubUpLogo'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function WelcomePage() {
  const { signOut, user } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', position: 'relative', overflow: 'hidden' }}>

      {/* Background decorative elements */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-10%', right: '-10%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(193,73,46,0.12) 0%, transparent 70%)' }} />
        <div style={{ position: 'absolute', bottom: '-5%', left: '-10%', width: 350, height: 350, borderRadius: '50%', background: 'radial-gradient(circle, rgba(31,61,43,0.4) 0%, transparent 70%)' }} />
        {/* Subtle hex grid pattern */}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.03 }} xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="hex" x="0" y="0" width="60" height="52" patternUnits="userSpaceOnUse">
              <polygon points="30,2 58,17 58,47 30,62 2,47 2,17" fill="none" stroke="#EDE3D3" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#hex)" />
        </svg>
      </div>

      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', position: 'relative', zIndex: 10 }}>
        <button
          onClick={() => setMenuOpen(true)}
          style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, width: 40, height: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5, cursor: 'pointer' }}
        >
          <div style={{ width: 18, height: 2, background: 'var(--text)', borderRadius: 2 }} />
          <div style={{ width: 14, height: 2, background: 'var(--text)', borderRadius: 2 }} />
          <div style={{ width: 18, height: 2, background: 'var(--text)', borderRadius: 2 }} />
        </button>
        <div style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'var(--font-display)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em' }}>
          {user?.email?.split('@')[0]}
        </div>
      </div>

      {/* Main hero content */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 72px)', padding: '2rem', textAlign: 'center', position: 'relative', zIndex: 5 }}>

        {/* Big DU logo */}
        <div style={{ marginBottom: 8 }}>
          <DubUpLogoLarge size={280} />
        </div>

        {/* Tagline */}
        <div style={{ fontSize: 15, color: 'var(--sand)', marginBottom: 48, letterSpacing: '.04em', textAlign: 'center', lineHeight: 1.7, fontFamily: 'var(--font-display)', fontWeight: 700, textTransform: 'uppercase' }}>
          Play for Pride.<br/>Play for Money.<br/><span style={{ color: 'var(--clay)' }}>Play for Dubs.</span>
        </div>

        {/* Select a game CTA */}
        <div style={{ width: '100%', maxWidth: 360 }}>
          <div style={{ fontSize: 11, fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: 16 }}>
            Select a fantasy game
          </div>

          {/* World Cup Fantasy card */}
          <button
            onClick={() => navigate('/home')}
            style={{
              width: '100%',
              background: 'var(--bg2)',
              border: '1px solid var(--border-clay)',
              borderRadius: 16,
              padding: '1.25rem 1.5rem',
              cursor: 'pointer',
              textAlign: 'left',
              position: 'relative',
              overflow: 'hidden',
              transition: 'all .15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--clay)'; e.currentTarget.style.background = 'var(--bg3)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-clay)'; e.currentTarget.style.background = 'var(--bg2)' }}
          >
            <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 4, background: 'var(--clay)', borderRadius: '0 16px 16px 0' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ fontSize: 36 }}>🏆</div>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 16, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4 }}>
                  World Cup Fantasy
                </div>
                <div style={{ fontSize: 12, color: 'var(--text2)' }}>FIFA World Cup 2026 · June 11</div>
                <div style={{ marginTop: 6 }}>
                  <span style={{ fontSize: 10, background: 'rgba(193,73,46,.15)', color: 'var(--clay-light)', border: '1px solid rgba(193,73,46,.3)', borderRadius: 4, padding: '2px 8px', fontFamily: 'var(--font-display)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em' }}>
                    Active
                  </span>
                </div>
              </div>
              <div style={{ marginLeft: 'auto', color: 'var(--clay)', fontSize: 22 }}>›</div>
            </div>
          </button>

          {/* Coming soon cards */}
          {[
            { emoji: '🏈', name: 'NFL Fantasy', sub: 'Coming soon', season: 'Fall 2026' },
          ].map(item => (
            <button
              key={item.name}
              disabled
              style={{
                width: '100%',
                background: 'var(--bg2)',
                border: '1px solid var(--border)',
                borderRadius: 16,
                padding: '1.25rem 1.5rem',
                cursor: 'not-allowed',
                textAlign: 'left',
                opacity: 0.45,
                marginTop: 10,
                display: 'block',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ fontSize: 36 }}>{item.emoji}</div>
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 16, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4 }}>{item.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text2)' }}>{item.season}</div>
                  <div style={{ marginTop: 6 }}>
                    <span style={{ fontSize: 10, background: 'rgba(255,255,255,.06)', color: 'var(--text3)', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 8px', fontFamily: 'var(--font-display)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em' }}>
                      Coming Soon
                    </span>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Hamburger menu overlay */}
      {menuOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200 }} onClick={() => setMenuOpen(false)}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)' }} />
          <div
            style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 280, background: 'var(--bg2)', borderRight: '1px solid var(--border)', padding: '1.5rem', display: 'flex', flexDirection: 'column' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Menu header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32, paddingBottom: 20, borderBottom: '1px solid var(--border)' }}>
              <DubUpLogoLarge size={44} />
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 18, textTransform: 'uppercase', letterSpacing: '.04em' }}>
                  <span style={{ color: 'var(--clay)' }}>DUB</span>UP
                </div>
                <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-display)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em' }}>Fantasy</div>
              </div>
            </div>

            {/* Menu items */}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: 12 }}>Games</div>

              <button onClick={() => { setMenuOpen(false); navigate('/home') }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'rgba(193,73,46,.08)', border: '1px solid rgba(193,73,46,.2)', borderRadius: 10, cursor: 'pointer', marginBottom: 8, textAlign: 'left' }}>
                <span style={{ fontSize: 22 }}>🏆</span>
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '.04em' }}>World Cup Fantasy</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>WC 2026</div>
                </div>
              </button>

              <button disabled style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 10, cursor: 'not-allowed', marginBottom: 8, opacity: 0.4, textAlign: 'left' }}>
                <span style={{ fontSize: 22 }}>🏈</span>
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '.04em' }}>NFL Fantasy</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>Coming Fall 2026</div>
                </div>
              </button>
            </div>

            {/* Bottom */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20 }}>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 12 }}>{user?.email}</div>
              <button onClick={signOut} style={{ width: '100%', padding: '10px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text2)', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '.06em', cursor: 'pointer' }}>
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
