import { useState } from 'react'
import { DubUpLogoLarge } from '../components/DubUpLogo'
import { useAuth } from '../hooks/useAuth'

export default function AuthPage() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState('login')
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [resetSent, setResetSent] = useState(false)
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
      <div className="auth-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
          <DubUpLogoLarge size={80} />
          <div>
            <div className="logo" style={{ fontSize: 24 }}>
              <span className="clay">DUBUP</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3, fontFamily: 'var(--font-display)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em' }}>Fantasy · WC2026</div>
          </div>
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
          <button className="btn btn-primary" style={{ width: '100%' }} type="submit" disabled={loading}>
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>

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
              I agree to the <a href="/terms" target="_blank" style={{ color: 'var(--clay)' }}>Terms of Service</a>. DubUp Fantasy is not affiliated with FIFA or any official football organization.
            </label>
          </div>
        )}

        {mode === 'login' && (
          <div style={{ textAlign: 'right', marginTop: -8, marginBottom: 12 }}>
            <a onClick={handleReset} style={{ fontSize: 12, color: 'var(--text2)', cursor: 'pointer' }}>
              Forgot password?
            </a>
          </div>
        )}

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
