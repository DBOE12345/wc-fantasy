import { useState } from 'react'
import { DubUpLogoLarge } from '../components/DubUpLogo'
import { useAuth } from '../hooks/useAuth'

export default function AuthPage() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState('login')
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [showTermsPopup, setShowTermsPopup] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleReset() {
    if (!email) { setError('Enter your email address first'); return }
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/auth'
    })
    setLoading(false)
    if (error) setError(error.message)
    else { setResetSent(true); setError('') }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(''); setSuccess(''); setLoading(true)
    try {
      if (mode === 'login') {
        const { error } = await signIn(email, password)
        if (error) setError(error.message)
      } else {
        if (!agreedToTerms) { setError('Please accept the Terms of Service to continue'); setLoading(false); return }
        const { error } = await signUp(email, password, { data: { username } })
        if (error) setError(error.message)
        else setSuccess('Account created! Check your email to confirm, then log in.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-wrap">
      {/* Terms of Service Popup */}
      {showTermsPopup && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.85)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '1rem' }} onClick={() => setShowTermsPopup(false)}>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px 16px 0 0', padding: '1.5rem', width: '100%', maxWidth: 500, maxHeight: '80vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 16, textTransform: 'uppercase', letterSpacing: '.04em' }}>Terms of Service</div>
              <button onClick={() => setShowTermsPopup(false)} style={{ background: 'none', border: 'none', color: 'var(--text2)', fontSize: 22, cursor: 'pointer' }}>×</button>
            </div>
            {[
              { title: '1. Independent Platform', body: 'DubUp Fantasy is an independent entertainment platform. We are NOT affiliated with, endorsed by, or sponsored by FIFA, any national football federation, or any official World Cup organizer. Team names and match results are used for entertainment purposes only.' },
              { title: '2. Eligibility', body: 'You must be at least 18 years old to use this app.' },
              { title: '3. No Real Money Gambling', body: 'DubUp Fantasy is free-to-play entertainment. The app does not facilitate real-money gambling or prizes. Any private arrangements between users are solely between those individuals.' },
              { title: '4. Your Account', body: 'You are responsible for your account credentials. Do not share your account. We may suspend accounts that violate these terms.' },
              { title: '5. Privacy', body: 'We collect your email and profile info you provide. We do not sell your data. Data is stored securely. By using the app you consent to this.' },
              { title: '6. User Content', body: 'You own your content (profile photos, chat messages). By posting, you grant us license to display it in the app. No offensive, illegal, or harmful content.' },
              { title: '7. No Warranties', body: 'The app is provided as-is. We do not guarantee uninterrupted service or error-free operation. Point calculations are based on available data and may occasionally be delayed.' },
              { title: '8. Limitation of Liability', body: 'DubUp Fantasy and its creators are not liable for any damages from your use of the app.' },
              { title: '9. Changes', body: 'We may update these terms. Continued use after changes means you accept the new terms.' },
            ].map(s => (
              <div key={s.title} style={{ marginBottom: 12 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12, color: 'var(--clay-light)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>{s.title}</div>
                <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.6 }}>{s.body}</div>
              </div>
            ))}
            <button className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} onClick={() => { setAgreedToTerms(true); setShowTermsPopup(false) }}>
              I Agree
            </button>
          </div>
        </div>
      )}
      <div className="auth-card">
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
          <DubUpLogoLarge size={140} />
        </div>

        <p className="auth-sub">{mode === 'login' ? 'Sign in to your league' : 'Create your account'}</p>

        {error && <div className="error-msg">{error}</div>}
        {success && <div className="success-msg">{success}</div>}

        <form onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <div className="form-group">
              <label className="form-label">Display name</label>
              <input className="input" type="text" placeholder="How you'll appear in the league" value={username} onChange={e => setUsername(e.target.value)} required />
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="input" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label className="form-label">Password</label>
            <input className="input" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
          </div>
          {/* Terms checkbox for signup - inside form above button */}
          {mode === 'signup' && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: '1rem' }}>
              <input
                type="checkbox"
                id="terms"
                checked={agreedToTerms}
                onChange={e => setAgreedToTerms(e.target.checked)}
                style={{ marginTop: 3, accentColor: 'var(--clay)', width: 16, height: 16, flexShrink: 0 }}
              />
              <label htmlFor="terms" style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5, cursor: 'pointer' }}>
                I agree to the <span onClick={() => setShowTermsPopup(true)} style={{ color: 'var(--clay)', cursor: 'pointer', textDecoration: 'underline' }}>Terms of Service</span>. DubUp Fantasy is not affiliated with FIFA.
              </label>
            </div>
          )}

          <button className="btn btn-primary" style={{ width: '100%' }} type="submit" disabled={loading}>
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>

          {/* Forgot password - below sign in button */}
          {mode === 'login' && (
            <div style={{ textAlign: 'center', marginTop: 14 }}>
              <span
                onClick={handleReset}
                style={{ fontSize: 13, color: 'var(--text2)', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Forgot password?
              </span>
            </div>
          )}
        </form>

        {resetSent && (
          <div className="success-msg" style={{ marginBottom: 12 }}>
            Password reset email sent! Check your inbox.
          </div>
        )}

        <div className="auth-switch">
          {mode === 'login' ? (
            <>Don't have an account? <a onClick={() => setMode('signup')}>Sign up</a></>
          ) : (
            <>Already have an account? <a onClick={() => setMode('login')}>Sign in</a></>
          )}
        </div>
      </div>
    </div>
  )
}
