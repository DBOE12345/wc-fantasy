# World Cup Fantasy 2026

A full-stack fantasy football app for the 2026 FIFA World Cup. Snake draft all 48 teams, compete in private leagues, and track live scores.

## Features
- Email/password authentication
- Create or join leagues with invite codes
- Snake draft — all 48 teams get drafted
- Real-time draft (picks update instantly for all players)
- Live match scores via API-Football
- Tournament bracket view
- Leaderboard with automatic point calculation

## Stack
- **React + Vite** — frontend
- **Supabase** — auth, database, real-time subscriptions
- **API-Football** — live World Cup match data

---

## Setup (10 minutes)

### 1. Supabase
1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project
3. Go to **SQL Editor** and run the entire contents of `supabase_schema.sql`
4. Go to **Project Settings → API** and copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon/public key** → `VITE_SUPABASE_ANON_KEY`

### 2. API-Football
1. Go to [api-football.com](https://www.api-football.com) and sign up (free tier: 100 requests/day)
2. Copy your API key → `VITE_API_FOOTBALL_KEY`
3. **Note:** The World Cup 2026 League ID will be confirmed closer to the tournament. Update `WC_LEAGUE_ID` in `src/lib/api.js` once available.

### 3. Environment variables
```bash
cp .env.example .env
# Fill in your keys in .env
```

### 4. Install and run
```bash
npm install
npm run dev
```

### 5. Deploy
Works with any static host. Recommended: **Vercel** (free)
```bash
npm run build
# Deploy the dist/ folder to Vercel, Netlify, or any host
```
For Vercel: connect your GitHub repo and it auto-deploys on push.

---

## Scoring system

| Event | Points |
|-------|--------|
| Win | +5 |
| Draw | +2 |
| Loss | 0 |
| Goal scored | +1 |
| 4+ goals in a match | +2 bonus |
| Clean sheet | +3 |
| Round of 32 | +5 |
| Round of 16 | +8 |
| Quarter-final | +12 |
| Semi-final | +20 |
| Runner-up | +30 |
| Champion | +40 |

## Draft format
- **Snake draft** — all 48 teams drafted until none remain
- 4 players: 12 teams each
- 6 players: 8 teams each
- 8 players: 6 teams each

---

## Project structure
```
src/
  lib/
    teams.js      — all 48 teams + scoring constants
    supabase.js   — Supabase client
    api.js        — API-Football integration
    draft.js      — Snake draft logic
    bracket.js    — Tournament bracket simulation
  hooks/
    useAuth.jsx   — Auth context
  pages/
    AuthPage.jsx  — Login / signup
    HomePage.jsx  — Create or join leagues
    LeaguePage.jsx — Main league (draft, leaderboard, bracket, scoring)
  index.css       — Global styles
  App.jsx         — Router
  main.jsx        — Entry point
```
