import { useNavigate } from 'react-router-dom'
import { DubUpLogoHorizontal } from '../components/DubUpLogo'

export default function TermsPage() {
  const navigate = useNavigate()

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
        <h2 style={{ fontSize: 20, fontWeight: 900, fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '.02em', marginBottom: 4 }}>Terms of Service</h2>
        <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: '1.5rem' }}>Last updated: April 2026</p>

        {[
          {
            title: '1. Acceptance of Terms',
            body: 'By creating an account or using DubUp Fantasy ("the App"), you agree to be bound by these Terms of Service. If you do not agree, do not use the App.',
          },
          {
            title: '2. Not Affiliated with FIFA',
            body: 'DubUp Fantasy is an independent fantasy sports platform and is not affiliated with, endorsed by, or sponsored by FIFA, any national football federation, or any official World Cup organizer. World Cup team names and match results are used for informational and entertainment purposes only.',
          },
          {
            title: '3. Eligibility',
            body: 'You must be at least 18 years old to use this App. By registering, you confirm that you meet this requirement.',
          },
          {
            title: '4. User Accounts',
            body: 'You are responsible for maintaining the confidentiality of your account credentials. You agree not to share your account or use another person\'s account. We reserve the right to suspend or terminate accounts that violate these terms.',
          },
          {
            title: '5. User Content',
            body: 'You retain ownership of any content you submit (profile photos, chat messages, league names). By submitting content, you grant DubUp Fantasy a non-exclusive license to display it within the App. You agree not to post content that is offensive, illegal, or harmful.',
          },
          {
            title: '6. No Real Money Gambling',
            body: 'DubUp Fantasy is a free-to-play entertainment platform. The App does not facilitate real-money gambling, wagering, or prizes. Any private arrangements between league members are solely between those individuals and are not facilitated or endorsed by DubUp Fantasy.',
          },
          {
            title: '7. Privacy',
            body: 'We collect your email address and any profile information you voluntarily provide. We do not sell your personal data to third parties. Your data is stored securely using industry-standard practices. By using the App you consent to this data collection.',
          },
          {
            title: '8. Disclaimer of Warranties',
            body: 'The App is provided "as is" without warranties of any kind. We do not guarantee uninterrupted service, accuracy of match data, or that the App will be error-free. Point calculations are based on available data and may occasionally be delayed.',
          },
          {
            title: '9. Limitation of Liability',
            body: 'DubUp Fantasy and its creators shall not be liable for any indirect, incidental, or consequential damages arising from your use of the App. Our total liability to you shall not exceed the amount you paid to use the App (if any).',
          },
          {
            title: '10. Changes to Terms',
            body: 'We may update these terms at any time. Continued use of the App after changes constitutes acceptance of the new terms. We will notify users of significant changes via the App.',
          },
          {
            title: '11. Contact',
            body: 'For questions about these terms, contact us through the App.',
          },
        ].map(section => (
          <div key={section.title} style={{ marginBottom: '1.25rem' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 }}>{section.title}</div>
            <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 14px' }}>{section.body}</div>
          </div>
        ))}

        <button className="btn btn-secondary" style={{ width: '100%', marginTop: '1rem' }} onClick={() => navigate(-1)}>
          Back
        </button>
      </div>
    </div>
  )
}
