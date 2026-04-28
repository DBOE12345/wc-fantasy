import { TEAMS, SCORING } from './teams.js'

function rnd() { return Math.random() }

function playMatch(sa, sb, knockout = false) {
  const w = Math.min(0.85, Math.max(0.15, 0.42 + (sa - sb) / 140))
  let ag = Math.max(0, Math.round(rnd() * 2.5))
  let bg = Math.max(0, Math.round(rnd() * 2.5))
  const r = rnd()
  if (r < w) { if (ag <= bg) ag = bg + 1 }
  else if (r < w + 0.22) { bg = ag }
  else { if (bg <= ag) bg = ag + 1 }

  let penWinner = null
  if (knockout && ag === bg) {
    penWinner = rnd() < w ? 'a' : 'b'
  }

  return { ag, bg, penWinner }
}

export function simulateBracket() {
  const groups = []
  for (let g = 0; g < 12; g++) {
    const groupTeams = TEAMS.filter(t => t.g === String.fromCharCode(65 + g))
    groups.push(groupTeams)
  }

  const top2 = [], thirds = []
  groups.forEach(grp => {
    const rows = grp.map(t => ({ t, gpts: 0, gd: 0, gf: 0 }))
    for (let i = 0; i < 4; i++) {
      for (let j = i + 1; j < 4; j++) {
        const { ag, bg } = playMatch(rows[i].t.s, rows[j].t.s, false)
        rows[i].gd += ag - bg; rows[j].gd += bg - ag
        rows[i].gf += ag; rows[j].gf += bg
        if (ag > bg) rows[i].gpts += 3
        else if (bg > ag) rows[j].gpts += 3
        else { rows[i].gpts++; rows[j].gpts++ }
      }
    }
    rows.sort((a, b) => (b.gpts - a.gpts) || (b.gd - a.gd) || (b.gf - a.gf))
    top2.push(rows[0].t, rows[1].t)
    thirds.push(rows[2])
  })

  thirds.sort((a, b) => (b.gpts - a.gpts) || (b.gd - a.gd))
  const r32teams = [...top2, ...thirds.slice(0, 8).map(r => r.t)]

  function ko(teams) {
    const matches = [], winners = [], losers = []
    for (let i = 0; i + 1 < teams.length; i += 2) {
      const a = teams[i], b = teams[i + 1]
      const { ag, bg, penWinner } = playMatch(a.s, b.s, true)
      const w = ag > bg ? a : bg > ag ? b : penWinner === 'a' ? a : b
      const l = w === a ? b : a
      matches.push({ a, b, ag, bg, penWinner, w })
      winners.push(w)
      losers.push(l)
    }
    return { matches, winners, losers }
  }

  const rd32 = ko(r32teams)
  const rd16 = ko(rd32.winners)
  const rdqf = ko(rd16.winners)
  const rdsf = ko(rdqf.winners)
  const third = ko(rdsf.losers)
  const rdfin = ko(rdsf.winners)
  const champ = rdfin.winners[0]
  const ruTeam = rdfin.losers[0]

  // stageBonus = CUMULATIVE additional points per round advanced
  // R32: +5, R16: +8 more, QF: +12 more, SF: +20 more, Final: +30 more, Champion: +40 more
  const stageBonus = {}
  const add = (t, pts) => { stageBonus[t.n] = (stageBonus[t.n] || 0) + pts }

  r32teams.forEach(t => add(t, SCORING.r32))          // +5 for making R32
  rd16.winners.forEach(t => add(t, SCORING.r16))      // +8 for making R16
  rdqf.winners.forEach(t => add(t, SCORING.qf))       // +12 for making QF
  rdsf.winners.forEach(t => add(t, SCORING.sf))       // +20 for making SF
  if (ruTeam) add(ruTeam, SCORING.ru)                  // +30 for making Final
  if (champ) add(champ, SCORING.ch)                    // +40 for winning it all

  // Champion total: 5+8+12+20+30+40 = 115 pts
  // Runner-up total: 5+8+12+20+30 = 75 pts
  // Semi-finalist total: 5+8+12+20 = 45 pts

  return {
    r32: rd32.matches,
    r16: rd16.matches,
    qf: rdqf.matches,
    sf: rdsf.matches,
    third: third.matches,
    final: rdfin.matches,
    champ,
    ruTeam,
    stageBonus,
  }
}
