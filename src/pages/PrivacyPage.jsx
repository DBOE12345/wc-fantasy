import { useNavigate } from 'react-router-dom'
import { DubUpLogoHorizontal } from '../components/DubUpLogo'

export default function PrivacyPage() {
  const navigate = useNavigate()

  const sections = [
    {
      title: '1. Who We Are',
      body: 'DubUp Fantasy ("we", "us", "our") is an independent fantasy sports entertainment platform operated at dubupfantasy.com. We are not affiliated with FIFA, any national football federation, or any official World Cup organizer. For privacy matters, contact us at: privacy@dubupfantasy.com',
    },
    {
      title: '2. Information We Collect',
      body: 'We collect only what is necessary to operate the app:\n\n• Email address — required for account creation and login\n• Display name — chosen by you at signup\n• Profile photo — optional, uploaded by you\n• Draft picks, league points, and chat messages — your activity within leagues\n• Referral code and referral count — for the referral rewards system\n\nWe do NOT collect: payment information, physical location, device contacts, browsing history, biometric data, or any advertising identifiers.',
    },
    {
      title: '3. How We Use Your Information',
      body: 'Your information is used solely to operate DubUp Fantasy:\n\n• Authenticating your account securely\n• Displaying your name and photo to league members\n• Calculating and showing fantasy points\n• Enabling the referral system\n• Sending transactional emails (verification codes, password resets)\n\nWe do not use your data for advertising, profiling, or any purpose beyond running the app.',
    },
    {
      title: '4. How We Share Your Information',
      body: 'We do not sell, rent, or share your personal information with third parties for marketing. The following is visible to other users within your leagues: your display name, profile photo, draft picks, and league points. Your referral count appears on the public referral leaderboard.\n\nWe use Supabase (supabase.com) as our database and authentication provider. Your data is stored on their infrastructure under their security standards.',
    },
    {
      title: '5. Data Storage and Security',
      body: 'Your data is stored using Supabase with industry-standard encryption at rest and in transit (TLS). We enforce row-level security so users can only access data they are authorized to see. We do not store passwords in plain text — authentication is handled via secure email OTP.',
    },
    {
      title: '6. Account Deletion',
      body: 'You have the right to delete your account and all associated data at any time. To request deletion, email us at privacy@dubupfantasy.com with the subject "Account Deletion Request" and the email address associated with your account. We will permanently delete your account and all data within 30 days and confirm when complete.',
    },
    {
      title: '7. Data Retention',
      body: 'We retain your account data for as long as your account is active. When you request account deletion, all personal data including your email, display name, profile photo, picks, and chat messages will be permanently deleted within 30 days.',
    },
    {
      title: '8. Your Rights',
      body: 'Depending on your location, you may have the following rights regarding your data:\n\n• Access — request a copy of data we hold about you\n• Correction — request we fix inaccurate data\n• Deletion — request permanent deletion of your data\n• Portability — request your data in a portable format\n• Objection — object to certain uses of your data\n\nTo exercise any of these rights, email privacy@dubupfantasy.com. We will respond within 30 days.',
    },
    {
      title: '9. Children\'s Privacy',
      body: 'DubUp Fantasy is not directed at children under 18 years of age. We do not knowingly collect personal information from anyone under 18. If we become aware that we have collected data from a person under 18, we will delete it immediately. If you believe we have inadvertently collected such information, please contact us at privacy@dubupfantasy.com.',
    },
    {
      title: '10. Cookies and Tracking',
      body: 'We use only essential session cookies required for authentication. We do not use advertising cookies, analytics cookies, or any third-party tracking. We do not use Google Analytics, Facebook Pixel, or any similar services.',
    },
    {
      title: '11. Changes to This Policy',
      body: 'We may update this Privacy Policy from time to time. We will notify users of material changes through the app. The "Last Updated" date at the top reflects the most recent version. Continued use of the app after changes constitutes acceptance of the updated policy.',
    },
    {
      title: '12. Contact Us',
      body: 'For any privacy-related questions, data requests, or account deletion:\n\nEmail: privacy@dubupfantasy.com\nWebsite: dubupfantasy.com\n\nWe aim to respond to all privacy requests within 30 days.',
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
          Your privacy matters to us. DubUp Fantasy collects only what's necessary to run the app and never sells your data. For questions or account deletion requests, email <strong style={{ color: 'var(--text)' }}>privacy@dubupfantasy.com</strong>
        </div>

        {sections.map(section => (
          <div key={section.title} style={{ marginBottom: '1.25rem' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: 'var(--clay-light)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>{section.title}</div>
            <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', whiteSpace: 'pre-line' }}>{section.body}</div>
          </div>
        ))}

        <button className="btn btn-secondary" style={{ width: '100%', marginTop: '1rem' }} onClick={() => navigate(-1)}>
          Back
        </button>
      </div>
    </div>
  )
}
