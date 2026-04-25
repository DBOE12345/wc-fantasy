import { useNavigate } from 'react-router-dom'
import { DubUpLogoHorizontal } from '../components/DubUpLogo'

export default function HowToPlayPage() {
  const navigate = useNavigate()

  const steps = [
    { num: '01', title: 'Create or Join a League', body: 'Create a league and share your invite code with friends, or enter a code to join someone else\'s league. Leagues support 4, 6, or 8 players.' },
    { num: '02', title: 'Schedule Your Draft', body: 'The league manager sets a draft date and time. All players need to be ready at that time — the draft starts automatically.' },
    { num: '03', title: 'Draft Your Teams', body: 'Players take turns picking World Cup teams in a snake draft order. You have 60 seconds per pick. If you don\'t pick in time, a random team is auto-selected for you.' },
    { num: '04', title: 'Earn Points', body: 'Your teams earn points based on their real World Cup results. Watch the leaderboard update in real time as matches are played.' },
    { num: '05', title: 'Win Your League', body: 'The player with the most points when the World Cup ends wins the league. Brag rights guaranteed.' },
  ]

  const scoring = [
    { label: 'Win', pts: '+5 pts', desc: 'Team wins any match' },
    { label: 'Draw', pts: '+2 pts', desc: 'Team draws any match' },
    { label: 'Goal scored', pts: '+1 pt', desc: 'Per goal your team scores' },
    { label: '4+ goals', pts: '+2 pts', desc: 'Bonus for 4 or more goals in one match' },
    { label: 'Clean sheet', pts: '+3 pts', desc: 'Team keeps a clean sheet (0 goals conceded)' },
    { label: 'Own goal', pts: '-1 pt', desc: 'Per own goal scored by your team', neg: true },
    { label: 'Red card', pts: '-2 pts', desc: 'Per red card received by your team', neg: true },
    { label: 'Round of 32', pts: '+5 pts', desc: 'Team advances to knockout stage' },
    { label: 'Round of 16', pts: '+8 pts', desc: 'Team advances to round of 16' },
    { label: 'Quarter-final', pts: '+12 pts', desc: 'Team reaches quarter-final' },
    { label: 'Semi-final', pts: '+20 pts', desc: 'Team reaches semi-final' },
    { label: 'Runner-up', pts: '+30 pts', desc: 'Team reaches the final' },
    { label: 'Champion', pts: '+40 pts', desc: 'Team wins the World Cup' },
  ]

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
        <h2 style={{ fontSize: 20, fontWeight: 900, fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '.02em', marginBottom: 4 }}>How to Play</h2>
        <p style={{ fontSize: 14, color: 'var(--text2)', marginBottom: '1.5rem' }}>Everything you need to know to compete</p>

        {/* Steps */}
        <div className="card-title">Getting started</div>
        {steps.map(s => (
          <div key={s.num} style={{ display: 'flex', gap: 14, marginBottom: 16, alignItems: 'flex-start' }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8, background: 'var(--clay)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 12,
              color: 'var(--sand)', flexShrink: 0
            }}>{s.num}</div>
            <div style={{ flex: 1, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4 }}>{s.title}</div>
              <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>{s.body}</div>
            </div>
          </div>
        ))}

        {/* Scoring */}
        <div className="card-title" style={{ marginTop: '1rem' }}>Point scoring</div>
        <div className="card">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', color: 'var(--text3)', fontWeight: 700, padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.06em', fontFamily: 'var(--font-display)' }}>Event</th>
                <th style={{ textAlign: 'right', color: 'var(--text3)', fontWeight: 700, padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.06em', fontFamily: 'var(--font-display)' }}>Points</th>
              </tr>
            </thead>
            <tbody>
              {scoring.map(s => (
                <tr key={s.label}>
                  <td style={{ padding: '10px 0', borderBottom: '1px solid var(--border)', color: 'var(--text)' }}>
                    <div style={{ fontWeight: 600 }}>{s.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{s.desc}</div>
                  </td>
                  <td style={{ padding: '10px 0', borderBottom: '1px solid var(--border)', textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: 700, color: s.neg ? '#F09595' : 'var(--clay-light)' }}>{s.pts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Tips */}
        <div className="card-title" style={{ marginTop: '1rem' }}>Draft tips</div>
        <div className="card">
          {[
            '⚡ Pick early — the first few rounds set your foundation. Strong group stage teams mean more guaranteed points.',
            '🏆 Balance your picks — grab a favorite alongside some dark horses with upset potential.',
            '🌍 Spread across groups — teams in different groups can\'t knock each other out early.',
            '⏰ Be ready for your draft — you only have 60 seconds per pick!',
          ].map((tip, i) => (
            <div key={i} style={{ fontSize: 13, color: 'var(--text2)', padding: '10px 0', borderBottom: i < 3 ? '1px solid var(--border)' : 'none', lineHeight: 1.6 }}>{tip}</div>
          ))}
        </div>

        <button className="btn btn-primary" style={{ width: '100%', marginTop: '1.5rem' }} onClick={() => navigate('/home')}>
          Start playing →
        </button>
      </div>
    </div>
  )
}
