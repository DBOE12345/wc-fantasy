import { useNavigate } from 'react-router-dom'
import { DubUpLogoHorizontal } from '../components/DubUpLogo'

export default function TermsPage() {
  const navigate = useNavigate()

  const sections = [
    {
      title: '1. Acceptance of Terms',
      body: 'By creating an account or using DubUp Fantasy ("the App"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, do not use the App. These Terms form a binding agreement between you and DubUp Fantasy.',
    },
    {
      title: '2. Not Affiliated with FIFA',
      body: 'DubUp Fantasy is an independent fantasy sports platform and is not affiliated with, endorsed by, or sponsored by FIFA, any national football federation, or any official World Cup organizer. World Cup team names, match data, and tournament results are used for informational and entertainment purposes only.',
    },
    {
      title: '3. Eligibility',
      body: 'You must be at least 13 years old to use this App. If you are between 13 and 18 (or the age of majority in your jurisdiction), you confirm that your parent or legal guardian has reviewed these Terms and agrees on your behalf. By registering, you confirm you meet these requirements.',
    },
    {
      title: '4. User Accounts',
      body: 'You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. You agree to:\n\n• Provide accurate information at signup\n• Maintain only one account per person\n• Not share your account or use another person\'s account\n• Notify us immediately of any unauthorized access\n\nWe reserve the right to suspend or terminate accounts that violate these Terms, at our sole discretion.',
    },
    {
      title: '5. User Content',
      body: 'You retain ownership of any content you submit to the App, including profile photos, display names, league names, and chat messages ("User Content"). By submitting User Content, you grant DubUp Fantasy a non-exclusive, worldwide, royalty-free license to use, display, and distribute that content within the App for the purpose of operating the service.\n\nYou represent that you own or have the necessary rights to all content you submit, and that your content does not infringe on the rights of any third party.',
    },
    {
      title: '6. Acceptable Use',
      body: 'You agree NOT to use the App to:\n\n• Post hateful, harassing, threatening, or discriminatory content\n• Post sexually explicit, violent, or obscene material\n• Impersonate another person or misrepresent your identity\n• Post content that infringes copyright, trademark, or other intellectual property rights\n• Post spam, advertising, or promotional content\n• Use automated systems, bots, scrapers, or scripts to access the App\n• Attempt to hack, disrupt, reverse engineer, or compromise the App or its security\n• Cheat, exploit bugs, or manipulate league outcomes\n• Use the App for any illegal purpose or in violation of any applicable law\n\nWe have zero tolerance for objectionable content and abusive behavior. Reported violations are reviewed promptly and may result in content removal or account termination.',
    },
    {
      title: '7. Reporting Objectionable Content',
      body: 'If you encounter content or behavior in the App that violates these Terms, please report it by emailing support@dubupfantasy.com with details. We commit to reviewing reports within 24 hours and taking appropriate action, which may include removing content or banning offending users.',
    },
    {
      title: '8. No Real Money Gambling',
      body: 'DubUp Fantasy is a free-to-play entertainment platform. The App does not facilitate real-money gambling, wagering, paid contests, or prizes of any kind. Any private arrangements between league members are solely between those individuals and are not facilitated, endorsed, or supported by DubUp Fantasy.',
    },
    {
      title: '9. Privacy',
      body: 'Your use of the App is also governed by our Privacy Policy, which describes how we collect, use, and protect your information. By using the App, you agree to the practices described in the Privacy Policy.',
    },
    {
      title: '10. Termination',
      body: 'We reserve the right to suspend or terminate your account at any time, with or without notice, if we believe you have violated these Terms or engaged in conduct harmful to other users or the App. Upon termination:\n\n• Your access to the App will end\n• Your User Content may be removed\n• Sections of these Terms that by their nature should survive termination (such as ownership, disclaimers, limitation of liability, and dispute resolution) will remain in effect\n\nYou may terminate your account at any time by requesting account deletion as described in our Privacy Policy.',
    },
    {
      title: '11. Disclaimer of Warranties',
      body: 'THE APP IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT.\n\nWe do not guarantee uninterrupted service, accuracy of match data, point calculations, or that the App will be error-free. Match scores and points are based on third-party data sources and may occasionally be delayed, incomplete, or contain errors.',
    },
    {
      title: '12. Limitation of Liability',
      body: 'TO THE MAXIMUM EXTENT PERMITTED BY LAW, DUBUP FANTASY AND ITS CREATORS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM OR RELATED TO YOUR USE OF THE APP, INCLUDING BUT NOT LIMITED TO LOSS OF DATA, LOSS OF GOODWILL, OR LOSS OF PROFITS.\n\nOur total cumulative liability to you for any and all claims shall not exceed the greater of one hundred US dollars ($100) or the amount you paid to use the App (if any).',
    },
    {
      title: '13. Apple App Store Terms',
      body: 'If you accessed or downloaded the App from the Apple App Store, you acknowledge and agree that:\n\n• These Terms are between you and DubUp Fantasy, not Apple. Apple is not responsible for the App or its content.\n• Apple has no obligation to provide maintenance or support services for the App.\n• In the event of any failure of the App to conform to any applicable warranty, you may notify Apple, and Apple will refund the purchase price (if any). To the maximum extent permitted by law, Apple has no other warranty obligation regarding the App.\n• Apple is not responsible for addressing any claims by you or any third party relating to the App or your possession or use of the App, including product liability claims, claims that the App fails to conform to any legal or regulatory requirement, or claims arising under consumer protection or similar legislation.\n• Apple is not responsible for the investigation, defense, settlement, or discharge of any third-party intellectual property claims relating to the App.\n• You represent that you are not located in a country subject to a U.S. Government embargo or designated as a "terrorist supporting" country, and you are not on any U.S. Government list of prohibited or restricted parties.\n• Apple and Apple\'s subsidiaries are third-party beneficiaries of these Terms, and upon your acceptance, Apple will have the right (and will be deemed to have accepted the right) to enforce these Terms against you.',
    },
    {
      title: '14. Changes to Terms',
      body: 'We may update these Terms from time to time. We will notify users of material changes through the App, and the "Last Updated" date at the top will reflect the most recent revision. Continued use of the App after changes constitutes acceptance of the updated Terms. If you do not agree to the changes, you must stop using the App.',
    },
    {
      title: '15. Governing Law and Dispute Resolution',
      body: 'These Terms are governed by the laws of the State of Florida, United States, without regard to conflict of law principles. Any dispute arising from or related to these Terms or the App will be resolved exclusively in the state or federal courts located in Florida, and you consent to personal jurisdiction in those courts.',
    },
    {
      title: '16. Severability',
      body: 'If any provision of these Terms is found to be unenforceable or invalid, that provision will be modified to the minimum extent necessary to make it enforceable, and the remaining provisions will continue in full force and effect.',
    },
    {
      title: '17. Contact',
      body: 'For questions about these Terms, account issues, or to report violations, contact us at:\n\nEmail: support@dubupfantasy.com\nWebsite: dubupfantasy.com',
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
        <h2 style={{ fontSize: 22, fontWeight: 900, fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '.02em', marginBottom: 4 }}>Terms of Service</h2>
        <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: '1.75rem' }}>Last updated: May 2026</p>

        <div style={{ background: 'rgba(193,73,46,.06)', border: '1px solid var(--border-clay)', borderRadius: 10, padding: '12px 16px', marginBottom: '1.5rem', fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>
          Welcome to DubUp Fantasy. By using the App you agree to these Terms. For questions or to report violations, email <strong style={{ color: 'var(--text)' }}>support@dubupfantasy.com</strong>
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
