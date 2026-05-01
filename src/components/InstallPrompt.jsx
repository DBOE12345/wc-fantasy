import { useState, useEffect } from 'react'

export default function InstallPrompt() {
  const [prompt, setPrompt] = useState(null)
  const [show, setShow] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      return
    }

    // iOS detection
    const ios = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase())
    const safari = /safari/.test(navigator.userAgent.toLowerCase())
    setIsIOS(ios && safari)

    // Show iOS prompt after 3 seconds if not dismissed
    if (ios && !localStorage.getItem('pwa-dismissed')) {
      setTimeout(() => setShow(true), 3000)
    }

    // Android/Chrome install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault()
      setPrompt(e)
      if (!localStorage.getItem('pwa-dismissed')) {
        setTimeout(() => setShow(true), 3000)
      }
    })
  }, [])

  function dismiss() {
    setShow(false)
    localStorage.setItem('pwa-dismissed', '1')
  }

  async function install() {
    if (prompt) {
      prompt.prompt()
      const result = await prompt.userChoice
      if (result.outcome === 'accepted') {
        setShow(false)
        setIsInstalled(true)
      }
    }
    dismiss()
  }

  if (!show || isInstalled) return null

  return (
    <div style={{
      position: 'fixed',
      bottom: 80,
      left: '1rem',
      right: '1rem',
      background: 'var(--bg2)',
      border: '1px solid var(--border-clay)',
      borderRadius: 16,
      padding: '1rem',
      zIndex: 999,
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      display: 'flex',
      gap: 12,
      alignItems: 'flex-start',
      maxWidth: 480,
      margin: '0 auto',
    }}>
      <img
        src="/icon-96x96.png"
        alt="DubUp Fantasy"
        style={{ width: 48, height: 48, borderRadius: 12, flexShrink: 0 }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 900,
          fontSize: 14,
          color: 'var(--text)',
          textTransform: 'uppercase',
          letterSpacing: '.04em',
          marginBottom: 4
        }}>
          Install DubUp Fantasy
        </div>
        {isIOS ? (
          <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>
            Tap <strong style={{ color: 'var(--text)' }}>Share</strong> then{' '}
            <strong style={{ color: 'var(--text)' }}>Add to Home Screen</strong> to install
          </div>
        ) : (
          <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>
            Add to your home screen for the full app experience
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          {!isIOS && (
            <button
              className="btn btn-primary"
              style={{ fontSize: 12, padding: '7px 14px' }}
              onClick={install}
            >
              Install app
            </button>
          )}
          <button
            className="btn btn-secondary"
            style={{ fontSize: 12, padding: '7px 14px' }}
            onClick={dismiss}
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  )
}
