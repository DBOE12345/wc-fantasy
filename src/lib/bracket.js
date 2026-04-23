import { TEAMS, SCORING } from './teams.js'

function rnd() { return Math.random() }

function playMatch(sa, sb) {
  const w = Math.min(0.85, Math.max(0.15, 0.42 + (sa - sb) / 140))
  let ag = Math.max(0, Math.round(rnd() * 2.5))
  let bg = Math.max(0, Math.round(rnd() * 2.5))
  const r = rnd()
  if (r < w) { if (ag <= bg) ag = bg + 1 }
  else if (r < w + 0.22) { bg = ag }
  else { if (bg <= ag) bg = ag + 1 }
  return [ag, bg]
}

export function simulateBracket() {
  const shuffled = TEAMS.slice().sort(() => rnd() - 0.5)
  const groups = []
  for (let g = 0; g < 12; g++) groups.push(shuffled.slice(g * 4, g * 4 + 4))

  const top2 = [], thirds = []
  groups.forEach(grp => {
    const rows = grp.map(t => ({ t, gpts: 0, gd: 0, gf: 0 }))
    for (let i = 0; i < 4; i++) {
      for (let j = i + 1; j < 4; j++) {
        const [ag, bg] = playMatch(rows[i].t.s, rows[j].t.s)
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
    const matches = [], winners = []
    for (let i = 0; i + 1 < teams.length; i += 2) {
      const a = teams[i], b = teams[i + 1]
      const [ag, bg] = playMatch(a.s, b.s)
      const w = ag >= bg ? a : b
      matches.push({ a, b, ag, bg, w })
      winners.push(w)
    }
    return { matches, winners }
  }

  const rd32 = ko(r32teams)
  const rd16 = ko(rd32.winners)
  const rdqf = ko(rd16.winners)
  const rdsf = ko(rdqf.winners)
  const rdfin = ko(rdsf.winners)
  const champ = rdfin.winners[0]

  // Build stageBonus map
  const stageBonus = {}
  r32teams.forEach(t => { stageBonus[t.n] = (stageBonus[t.n] || 0) + SCORING.r32 })
  rd16.winners.forEach(t => { stageBonus[t.n] = (stageBonus[t.n] || 0) + SCORING.r16 })
  rdqf.winners.forEach(t => { stageBonus[t.n] = (stageBonus[t.n] || 0) + SCORING.qf })
  rdsf.winners.forEach(t => { stageBonus[t.n] = (stageBonus[t.n] || 0) + SCORING.sf })
  rdfin.winners.forEach(t => { stageBonus[t.n] = (stageBonus[t.n] || 0) + SCORING.ru })
  if (champ) stageBonus[champ.n] = (stageBonus[champ.n] || 0) + (SCORING.ch - SCORING.ru)

  return {
    r32: rd32.matches,
    r16: rd16.matches,
    qf: rdqf.matches,
    sf: rdsf.matches,
    final: rdfin.matches,
    champ,
    stageBonus,
  }
}
