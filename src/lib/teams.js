export const TEAMS = [
  // Group A: Mexico, South Korea, South Africa, Czechia
  { n: 'Mexico',       f: '🇲🇽', g: 'A', s: 71, apiId: 16  },
  { n: 'South Korea',  f: '🇰🇷', g: 'A', s: 64, apiId: 30  },
  { n: 'South Africa', f: '🇿🇦', g: 'A', s: 44, apiId: 48  },
  { n: 'Czech Rep.',   f: '🇨🇿', g: 'A', s: 42, apiId: 20  },
  // Group B: Canada, Switzerland, Qatar, Bosnia-Herzegovina
  { n: 'Canada',       f: '🇨🇦', g: 'B', s: 61, apiId: 94  },
  { n: 'Switzerland',  f: '🇨🇭', g: 'B', s: 70, apiId: 15  },
  { n: 'Qatar',        f: '🇶🇦', g: 'B', s: 38, apiId: 160 },
  { n: 'Bosnia',       f: '🇧🇦', g: 'B', s: 40, apiId: 841 },
  // Group C: Brazil, Morocco, Scotland, Haiti
  { n: 'Brazil',       f: '🇧🇷', g: 'C', s: 90, apiId: 6   },
  { n: 'Morocco',      f: '🇲🇦', g: 'C', s: 69, apiId: 32  },
  { n: 'Scotland',     f: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', g: 'C', s: 50, apiId: 1108},
  { n: 'Haiti',        f: '🇭🇹', g: 'C', s: 30, apiId: 514 },
  // Group D: USA, Paraguay, Australia, Turkiye
  { n: 'USA',          f: '🇺🇸', g: 'D', s: 72, apiId: 6   },
  { n: 'Paraguay',     f: '🇵🇾', g: 'D', s: 48, apiId: 35  },
  { n: 'Australia',    f: '🇦🇺', g: 'D', s: 62, apiId: 25  },
  { n: 'Turkiye',      f: '🇹🇷', g: 'D', s: 60, apiId: 19  },
  // Group E: Germany, Ecuador, Ivory Coast, Curacao
  { n: 'Germany',      f: '🇩🇪', g: 'E', s: 84, apiId: 25  },
  { n: 'Ecuador',      f: '🇪🇨', g: 'E', s: 53, apiId: 36  },
  { n: 'Ivory Coast',  f: '🇨🇮', g: 'E', s: 48, apiId: 46  },
  { n: 'Curacao',      f: '🇨🇼', g: 'E', s: 28, apiId: 1928},
  // Group F: Netherlands, Japan, Tunisia, Sweden
  { n: 'Netherlands',  f: '🇳🇱', g: 'F', s: 82, apiId: 1   },
  { n: 'Japan',        f: '🇯🇵', g: 'F', s: 65, apiId: 29  },
  { n: 'Tunisia',      f: '🇹🇳', g: 'F', s: 43, apiId: 41  },
  { n: 'Sweden',       f: '🇸🇪', g: 'F', s: 56, apiId: 13  },
  // Group G: Belgium, Iran, Egypt, New Zealand
  { n: 'Belgium',      f: '🇧🇪', g: 'G', s: 78, apiId: 1   },
  { n: 'Iran',         f: '🇮🇷', g: 'G', s: 37, apiId: 529 },
  { n: 'Egypt',        f: '🇪🇬', g: 'G', s: 47, apiId: 40  },
  { n: 'New Zealand',  f: '🇳🇿', g: 'G', s: 32, apiId: 102 },
  // Group H: Spain, Uruguay, Saudi Arabia, Cape Verde
  { n: 'Spain',        f: '🇪🇸', g: 'H', s: 85, apiId: 9   },
  { n: 'Uruguay',      f: '🇺🇾', g: 'H', s: 75, apiId: 28  },
  { n: 'Saudi Arabia', f: '🇸🇦', g: 'H', s: 38, apiId: 523 },
  { n: 'Cape Verde',   f: '🇨🇻', g: 'H', s: 30, apiId: 1054},
  // Group I: France, Senegal, Norway, Iraq
  { n: 'France',       f: '🇫🇷', g: 'I', s: 88, apiId: 2   },
  { n: 'Senegal',      f: '🇸🇳', g: 'I', s: 67, apiId: 33  },
  { n: 'Norway',       f: '🇳🇴', g: 'I', s: 58, apiId: 23  },
  { n: 'Iraq',         f: '🇮🇶', g: 'I', s: 30, apiId: 531 },
  // Group J: Argentina, Austria, Algeria, Jordan
  { n: 'Argentina',    f: '🇦🇷', g: 'J', s: 87, apiId: 26  },
  { n: 'Austria',      f: '🇦🇹', g: 'J', s: 55, apiId: 17  },
  { n: 'Algeria',      f: '🇩🇿', g: 'J', s: 45, apiId: 42  },
  { n: 'Jordan',       f: '🇯🇴', g: 'J', s: 28, apiId: 530 },
  // Group K: Portugal, Colombia, Uzbekistan, DR Congo
  { n: 'Portugal',     f: '🇵🇹', g: 'K', s: 83, apiId: 27  },
  { n: 'Colombia',     f: '🇨🇴', g: 'K', s: 66, apiId: 31  },
  { n: 'Uzbekistan',   f: '🇺🇿', g: 'K', s: 35, apiId: 3008},
  { n: 'DR Congo',     f: '🇨🇩', g: 'K', s: 35, apiId: 49  },
  // Group L: England, Croatia, Panama, Ghana
  { n: 'England',      f: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', g: 'L', s: 86, apiId: 10  },
  { n: 'Croatia',      f: '🇭🇷', g: 'L', s: 77, apiId: 3   },
  { n: 'Panama',       f: '🇵🇦', g: 'L', s: 40, apiId: 88  },
  { n: 'Ghana',        f: '🇬🇭', g: 'L', s: 50, apiId: 43  },
]

export const TEAM_MAP = Object.fromEntries(TEAMS.map(t => [t.n, t]))

export const SCORING = {
  win: 5, draw: 2, loss: 0,
  goal: 1, goalBonus: 2, cleanSheet: 3,
  r32: 5, r16: 8, qf: 12, sf: 20, ru: 30, ch: 40,
}

export const STAGE_LABELS = {
  r32: 'Round of 32', r16: 'Round of 16',
  qf: 'Quarter-final', sf: 'Semi-final',
  ru: 'Runner-up', ch: 'Champion',
}