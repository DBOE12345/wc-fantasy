import { useState } from 'react'
import { DubUpLogoLarge } from '../components/DubUpLogo'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'

export default function AuthPage() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState('login')
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [showTermsPopup, setShowTermsPopup] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [pendingEmail, setPendingEmail] = useState('')
  const [resetMode, setResetMode] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [refCode] = useState(() => new URLSearchParams(window.location.search).get('ref') || '')

  async function handleSubmit(e) {
    e.preventDefault()
    setError(''); setSuccess(''); setLoading(true)
    try {
      if (mode === 'login') {
        const { error } = await signIn(email, password)
        if (error) setError(error.message)
      } else {
        if (!username.trim()) { setError('Please enter a display name'); return }
        if (!agreedToTerms) { setError('Please accept the Terms of Service'); return }
        const { error, data } = await signUp(email, password, { data: { username: username.trim() } })
        if (error) { setError(error.message) }
        else {
          setPendingEmail(email)
          setOtpSent(true)
        }
      }
    } finally {
      setLoading(false)
    }
  }

  async function verifyOtp() {
    if (!otpCode || otpCode.length < 6) { setError('Enter the 6-digit code from your email'); return }
    setLoading(true); setError('')
    const { error, data } = await supabase.auth.verifyOtp({
      email: pendingEmail,
      token: otpCode,
      type: 'signup',
    })
    setLoading(false)
    if (error) setError(error.message)
    else {
      // After OTP verified, user and profile now exist
      // Process referral now that profile is confirmed
      if (refCode && data?.user) {
        try {
          // Find referrer by code
          const { data: referrer } = await supabase
            .from('profiles').select('id, referral_count').eq('referral_code', refCode.toUpperCase()).single()
          if (referrer) {
            // Increment referrer's count
            await supabase.from('profiles')
              .update({ referral_count: (referrer.referral_count || 0) + 1 })
              .eq('id', referrer.id)
          }
        } catch(e) {}
      }

      // Generate referral_code for the new user if they don't have one
      if (data?.user) {
        try {
          const { data: newProfile } = await supabase
            .from('profiles').select('referral_code, username').eq('id', data.user.id).single()
          if (!newProfile?.referral_code) {
            const base = (newProfile?.username || pendingEmail.split('@')[0]).slice(0, 6).toUpperCase().replace(/[^A-Z0-9]/g, '')
            const code = base + Math.floor(Math.random() * 999).toString().padStart(2, '0')
            await supabase.from('profiles').update({ referral_code: code }).eq('id', data.user.id)
          }
        } catch(e) {}
      }

      setOtpSent(false)
      setSuccess('Email verified! You can now sign in.')
      setMode('login')
      setOtpCode('')
    }
  }

  async function handlePasswordReset(e) {
    e.preventDefault()
    if (!email.trim()) { setError('Enter your email address'); return }
    setLoading(true); setError('')
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.origin + '/auth',
    })
    setLoading(false)
    if (error) setError(error.message)
    else setResetSent(true)
  }

  // OTP screen
  if (otpSent) {
    return (
      <div className="auth-wrap">
        <div className="auth-card">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
            <DubUpLogoLarge size={140} />
          </div>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📧</div>
            <div className="auth-title" style={{ fontSize: 18 }}>Check your email</div>
            <div className="auth-sub">We sent a 6-digit code to<br/><strong style={{ color: 'var(--text)' }}>{pendingEmail}</strong></div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 8, background: 'rgba(255,200,0,.06)', border: '1px solid rgba(255,200,0,.2)', borderRadius: 8, padding: '8px 12px' }}>
              📬 If you don't see it, check your <strong style={{ color: 'var(--text2)' }}>spam or junk folder</strong>
            </div>
          </div>
          {error && <div className="error-msg">{error}</div>}
          <div className="form-group">
            <label className="form-label">Verification code</label>
            <input
              className="input"
              type="number"
              placeholder="000000"
              value={otpCode}
              onChange={e => setOtpCode(e.target.value.slice(0, 6))}
              style={{ textAlign: 'center', letterSpacing: '.3em', fontFamily: 'var(--mono)', fontSize: 28, fontWeight: 700 }}
              autoFocus
            />
          </div>
          <button className="btn btn-primary" style={{ width: '100%', marginBottom: 12 }} onClick={verifyOtp} disabled={loading || otpCode.length < 6}>
            {loading ? 'Verifying...' : 'Verify Email →'}
          </button>
          <button className="btn btn-secondary" style={{ width: '100%', fontSize: 13, marginBottom: 12 }} onClick={async () => {
            setLoading(true)
            await supabase.auth.resend({ type: 'signup', email: pendingEmail })
            setLoading(false)
            setError(''); setSuccess('New code sent! Check your email.')
          }} disabled={loading}>
            Resend code
          </button>
          {success && <div className="success-msg">{success}</div>}
          <div style={{ textAlign: 'center', marginTop: 8 }}>
            <span onClick={() => setOtpSent(false)} style={{ fontSize: 13, color: 'var(--text3)', cursor: 'pointer' }}>← Back to sign up</span>
          </div>
        </div>
      </div>
    )
  }

  // Password reset screen
  if (resetMode) {
    return (
      <div className="auth-wrap">
        <div className="auth-card">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
            <DubUpLogoLarge size={140} />
          </div>
          {!resetSent ? (
            <>
              <div className="auth-title" style={{ textAlign: 'center', marginBottom: 4 }}>Reset Password</div>
              <div className="auth-sub" style={{ textAlign: 'center', marginBottom: '1.5rem' }}>Enter your email and we'll send you a reset link</div>
              {error && <div className="error-msg">{error}</div>}
              <form onSubmit={handlePasswordReset}>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input className="input" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
                </div>
                <button className="btn btn-primary" style={{ width: '100%' }} type="submit" disabled={loading}>
                  {loading ? 'Sending...' : 'Send reset link'}
                </button>
              </form>
            </>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>✉️</div>
              <div className="auth-title" style={{ fontSize: 18, marginBottom: 8 }}>Check your email</div>
              <div className="auth-sub">We sent a password reset link to<br/><strong style={{ color: 'var(--text)' }}>{email}</strong></div>
              <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 12 }}>Click the link in the email to reset your password, then come back to sign in.</div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 8, background: 'rgba(255,200,0,.06)', border: '1px solid rgba(255,200,0,.2)', borderRadius: 8, padding: '8px 12px' }}>
                📬 If you don't see it, check your <strong style={{ color: 'var(--text2)' }}>spam or junk folder</strong>
              </div>
            </div>
          )}
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <span onClick={() => { setResetMode(false); setResetSent(false); setError('') }} style={{ fontSize: 13, color: 'var(--text3)', cursor: 'pointer' }}>← Back to sign in</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-wrap">
      {/* Terms popup */}
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
              { title: '7. No Warranties', body: 'The app is provided as-is. We do not guarantee uninterrupted service or error-free operation.' },
              { title: '8. Limitation of Liability', body: 'DubUp Fantasy and its creators are not liable for any damages from your use of the app.' },
              { title: '9. Changes', body: 'We may update these terms. Continued use after changes means you accept the new terms.' },
            ].map(s => (
              <div key={s.title} style={{ marginBottom: 12 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12, color: 'var(--clay-light)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>{s.title}</div>
                <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.6 }}>{s.body}</div>
              </div>
            ))}
            <button className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} onClick={() => { setAgreedToTerms(true); setShowTermsPopup(false) }}>I Agree</button>
          </div>
        </div>
      )}

      <div className="auth-card">
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
          <DubUpLogoLarge size={140} />
        </div>

        <p className="auth-sub" style={{ textAlign: 'center' }}>{mode === 'login' ? 'Sign in to your league' : 'Create your account'}</p>

        {error && <div className="error-msg">{error}</div>}
        {success && <div className="success-msg">{success}</div>}

        <form onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <div className="form-group">
              <label className="form-label">Display name</label>
              <input className="input" type="text" placeholder="How you'll appear in leagues" value={username} onChange={e => setUsername(e.target.value)} required />
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="input" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label className="form-label">Password</label>
            <input className="input" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
          </div>

          {mode === 'signup' && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: '1rem' }}>
              <input type="checkbox" id="terms" checked={agreedToTerms} onChange={e => setAgreedToTerms(e.target.checked)} style={{ marginTop: 3, accentColor: 'var(--clay)', width: 16, height: 16, flexShrink: 0 }} />
              <label htmlFor="terms" style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5, cursor: 'pointer' }}>
                I agree to the <span onClick={() => setShowTermsPopup(true)} style={{ color: 'var(--clay)', cursor: 'pointer', textDecoration: 'underline' }}>Terms of Service</span>. DubUp Fantasy is not affiliated with FIFA.
              </label>
            </div>
          )}

          <button className="btn btn-primary" style={{ width: '100%' }} type="submit" disabled={loading}>
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>

          {mode === 'login' && (
            <div style={{ textAlign: 'center', marginTop: 14 }}>
              <span onClick={() => { setResetMode(true); setError('') }} style={{ fontSize: 13, color: 'var(--text2)', cursor: 'pointer', textDecoration: 'underline' }}>
                Forgot password?
              </span>
            </div>
          )}
        </form>

        <div className="auth-switch">
          {mode === 'login' ? (
            <>Don't have an account? <a onClick={() => { setMode('signup'); setError(''); setSuccess('') }}>Sign up</a></>
          ) : (
            <>Already have an account? <a onClick={() => { setMode('login'); setError(''); setSuccess('') }}>Sign in</a></>
          )}
        </div>
        <div style={{ textAlign: 'center', marginTop: 16, display: 'flex', justifyContent: 'center', gap: 16 }}>
          <a href="/terms" style={{ fontSize: 11, color: 'var(--text3)', textDecoration: 'none' }}>Terms of Service</a>
          <a href="/privacy" style={{ fontSize: 11, color: 'var(--text3)', textDecoration: 'none' }}>Privacy Policy</a>
        </div>
      </div>
    </div>
  )
}
