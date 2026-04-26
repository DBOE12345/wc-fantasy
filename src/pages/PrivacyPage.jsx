import { useNavigate } from 'react-router-dom'
import { DubUpLogoHorizontal } from '../components/DubUpLogo'

export default function PrivacyPage() {
  const navigate = useNavigate()

  const sections = [
    {
      title: '1. Who We Are',
      body: 'DubUp Fantasy is an independent fantasy sports entertainment platform. We are not affiliated with FIFA, any national football federation, or any official World Cup organizer. Our contact for privacy matters is available through the app.',
    },
    {
      title: '2. Information We Collect',
      body: 'We collect the following information when you use DubUp Fantasy: your email address (required for account creation and login), your display name (chosen by you), your profile photo (optional, uploaded by you), your league activity including draft picks and points, your referral code and referral count, and chat messages you send within leagues.',
    },
    {
      title: '3. How We Use Your Information',
      body: 'We use your information solely to operate the app. This includes authenticating your account, displaying your name and photo to other league members, calculating and displaying fantasy points, enabling the referral system, and sending transactional emails such as account verification and password reset.',
    },
    {
      title: '4. Information We Do Not Collect',
      body: 'We do not collect payment information, physical location data, device contacts, browsing history outside the app, or any biometric data. We do not run advertising and do not collect data for advertising purposes.',
    },
    {
      title: '5. How We Share Your Information',
      body: 'We do not sell, rent, or share your personal information with third parties for their marketing purposes. Your display name, profile photo, draft picks, and points are visible to other members of your leagues. Your referral count is visible on the public referral leaderboard. We use Supabase to store your data securely.',
    },
    {
      title: '6. Data Storage and Security',
      body: 'Your data is stored securely using Supabase, which uses industry-standard encryption at rest and in transit. We use row-level security policies to ensure users can only access data they are authorized to see. Profile photos are stored as encrypted data in our database.',
    },
    {
      title: '7. Data Retention',
      body: 'We retain your account data for as long as your account is active. If you wish to delete your account and all associated data, please contact us through the app and we will process your request within 30 days.',
    },
    {
      title: '8. Your Rights',
      body: 'You have the right to access the personal data we hold about you, correct inaccurate data, request deletion of your data, and withdraw consent at any time. To exercise these rights, contact us through the app.',
    },
    {
      title: '9. Children\'s Privacy',
      body: 'DubUp Fantasy is not intended for users under 18 years of age. We do not knowingly collect personal information from anyone under 18. If we become aware that we have collected data from someone under 18, we will delete it promptly.',
    },
    {
      title: '10. Cookies and Tracking',
      body: 'We use only essential session cookies required for authentication. We do not use tracking cookies, analytics cookies, or advertising cookies. We do not use any third-party tracking services.',
    },
    {
      title: '11. Changes to This Policy',
      body: 'We may update this Privacy Policy from time to time. We will notify you of significant changes through the app. Continued use of the app after changes constitutes acceptance of the updated policy.',
    },
    {
      title: '12. Contact',
      body: 'For any privacy-related questions or requests, please contact us through the DubUp Fantasy app. We aim to respond to all privacy requests within 30 days.',
    },
  ]

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
        <h2 style={{ fontSize: 22, fontWeight: 900, fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '.02em', marginBottom: 4 }}>Privacy Policy</h2>
        <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: '1.75rem' }}>Last updated: May 2026</p>

        <div style={{ background: 'rgba(193,73,46,.06)', border: '1px solid var(--border-clay)', borderRadius: 10, padding: '12px 16px', marginBottom: '1.5rem', fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>
          Your privacy matters to us. DubUp Fantasy collects only what's necessary to run the app and never sells your data.
        </div>

        {sections.map(section => (
          <div key={section.title} style={{ marginBottom: '1.25rem' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: 'var(--clay-light)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>{section.title}</div>
            <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>{section.body}</div>
          </div>
        ))}

        <button className="btn btn-secondary" style={{ width: '100%', marginTop: '1rem' }} onClick={() => navigate(-1)}>
          Back
        </button>
      </div>
    </div>
  )
}
