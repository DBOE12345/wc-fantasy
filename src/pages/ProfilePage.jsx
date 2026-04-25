import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { DubUpLogoHorizontal } from '../components/DubUpLogo'

export default function ProfilePage() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [avatarUrl, setAvatarUrl] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState(null)
  const fileRef = useRef()

  useEffect(() => {
    if (!user) return
    supabase.from('profiles').select('username, avatar_url').eq('id', user.id).single()
      .then(({ data }) => {
        if (data) {
          setUsername(data.username || '')
          setAvatarUrl(data.avatar_url || null)
        }
        setLoading(false)
      })
  }, [user])

  async function saveProfile() {
    if (!username.trim()) { setMessage({ type: 'error', text: 'Username cannot be empty' }); return }
    setSaving(true)
    const updateData = { id: user.id, username: username.trim(), email: user.email }
    if (avatarUrl) updateData.avatar_url = avatarUrl
    const { error } = await supabase.from('profiles').upsert(updateData)
    setSaving(false)
    if (error) setMessage({ type: 'error', text: error.message })
    else setMessage({ type: 'success', text: 'Profile saved!' })
    setTimeout(() => setMessage(null), 3000)
  }

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 1 * 1024 * 1024) { setMessage({ type: 'error', text: 'Image must be under 1MB' }); return }
    setUploading(true)
    
    // Convert to base64 and store directly in profiles table
    // This avoids all storage bucket / RLS issues
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const base64 = ev.target.result
      setAvatarUrl(base64)
      const { error } = await supabase.from('profiles').upsert({
        id: user.id, username: username.trim() || '', email: user.email, avatar_url: base64
      })
      setUploading(false)
      if (error) setMessage({ type: 'error', text: error.message })
      else setMessage({ type: 'success', text: 'Photo updated!' })
      setTimeout(() => setMessage(null), 3000)
    }
    reader.onerror = () => { setUploading(false); setMessage({ type: 'error', text: 'Failed to read image' }) }
    reader.readAsDataURL(file)
  }

  if (loading) return <div className="container page-wrap"><div className="empty">Loading...</div></div>

  return (
    <div>
      <div className="app-header">
        <div className="header-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button className="btn btn-ghost" onClick={() => navigate(-1)} style={{ padding: '6px 8px', fontSize: 18 }}>←</button>
            <DubUpLogoHorizontal height={56} />
          </div>
        </div>
      </div>

      <div className="container page-wrap" style={{ paddingLeft: 'max(1rem, env(safe-area-inset-left))', paddingRight: 'max(1rem, env(safe-area-inset-right))' }}>
        <h2 style={{ fontSize: 20, fontWeight: 900, fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '.02em', marginBottom: 4 }}>My Profile</h2>
        <p style={{ fontSize: 14, color: 'var(--text2)', marginBottom: '1.5rem' }}>Update your name and photo</p>

        {message && (
          <div className={message.type === 'error' ? 'error-msg' : 'success-msg'} style={{ marginBottom: '1rem' }}>
            {message.text}
          </div>
        )}

        <div className="card" style={{ marginBottom: '1rem' }}>
          <div className="card-title">Profile photo</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div
              onClick={() => fileRef.current?.click()}
              style={{
                width: 72, height: 72, borderRadius: '50%',
                background: avatarUrl ? 'transparent' : 'var(--clay)',
                border: '2px solid var(--border2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', overflow: 'hidden', flexShrink: 0,
                fontSize: 24, fontWeight: 700, color: 'var(--sand)',
                fontFamily: 'var(--font-display)',
              }}
            >
              {avatarUrl
                ? <img src={avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : (username?.[0] || user?.email?.[0] || '?').toUpperCase()
              }
            </div>
            <div>
              <button className="btn btn-secondary" onClick={() => fileRef.current?.click()} disabled={uploading} style={{ fontSize: 13, padding: '8px 16px' }}>
                {uploading ? 'Uploading...' : 'Change photo'}
              </button>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>JPG or PNG, max 1MB</div>
            </div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
        </div>

        <div className="card" style={{ marginBottom: '1rem' }}>
          <div className="card-title">Display name</div>
          <input
            className="input"
            type="text"
            placeholder="Your name"
            value={username}
            onChange={e => setUsername(e.target.value)}
            maxLength={24}
          />
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>This is how you appear in leagues</div>
        </div>

        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-title">Email</div>
          <div style={{ fontSize: 14, color: 'var(--text2)' }}>{user?.email}</div>
        </div>

        <button className="btn btn-primary" style={{ width: '100%', marginBottom: 12 }} onClick={saveProfile} disabled={saving}>
          {saving ? 'Saving...' : 'Save changes'}
        </button>

        <button className="btn btn-secondary" style={{ width: '100%' }} onClick={signOut}>
          Sign out
        </button>
      </div>
    </div>
  )
}
