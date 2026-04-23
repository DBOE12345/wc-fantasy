import { SCORING, TEAM_MAP } from './teams.js'

const API_KEY = import.meta.env.VITE_API_FOOTBALL_KEY
const BASE_URL = 'https://v3.football.api-sports.io'
// World Cup 2026 season/league IDs - update once confirmed by API-Football
const WC_LEAGUE_ID = 1 // FIFA World Cup league ID
const WC_SEASON = 2026

async function apiFetch(path) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'x-apisports-key': API_KEY,
    },
  })
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

// Fetch all fixtures for the World Cup
export async function fetchFixtures() {
  try {
    const data = await apiFetch(`/fixtures?league=${WC_LEAGUE_ID}&season=${WC_SEASON}`)
    return data.response || []
  } catch (e) {
    console.error('Failed to fetch fixtures:', e)
    return []
  }
}

// Fetch live fixtures
export async function fetchLiveFixtures() {
  try {
    const data = await apiFetch(`/fixtures?live=all&league=${WC_LEAGUE_ID}`)
    return data.response || []
  } catch (e) {
    console.error('Failed to fetch live fixtures:', e)
    return []
  }
}

// Calculate fantasy points for a completed fixture
export function calcMatchPoints(fixture, teamName) {
  const home = fixture.teams?.home?.name
  const away = fixture.teams?.away?.name
  const homeGoals = fixture.goals?.home ?? 0
  const awayGoals = fixture.goals?.away ?? 0
  const status = fixture.fixture?.status?.short

  if (!['FT', 'AET', 'PEN'].includes(status)) return null // not finished

  const isHome = home === teamName
  const isAway = away === teamName
  if (!isHome && !isAway) return null

  const myGoals = isHome ? homeGoals : awayGoals
  const oppGoals = isHome ? awayGoals : homeGoals

  let pts = 0
  if (myGoals > oppGoals) pts += SCORING.win
  else if (myGoals === oppGoals) pts += SCORING.draw

  pts += myGoals * SCORING.goal
  if (myGoals >= 4) pts += SCORING.goalBonus
  if (oppGoals === 0) pts += SCORING.cleanSheet

  return {
    pts,
    goals: myGoals,
    conceded: oppGoals,
    result: myGoals > oppGoals ? 'W' : myGoals === oppGoals ? 'D' : 'L',
    opponent: isHome ? away : home,
    fixture: fixture.fixture?.date,
  }
}

// Calculate total points for a player's teams from fixture list
export function calcTotalPoints(fixtures, myTeams, stageBonus = {}) {
  let total = 0
  const breakdown = {}

  myTeams.forEach(teamName => {
    let teamPts = 0
    const matches = []

    fixtures.forEach(fix => {
      const result = calcMatchPoints(fix, teamName)
      if (result) {
        teamPts += result.pts
        matches.push(result)
      }
    })

    // Add stage bonus
    const bonus = stageBonus[teamName] || 0
    teamPts += bonus

    breakdown[teamName] = { pts: teamPts, matches, stageBonus: bonus }
    total += teamPts
  })

  return { total, breakdown }
}
