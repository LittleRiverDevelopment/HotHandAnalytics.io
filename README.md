# HotHand Analytics

A sports betting edge finder that helps identify +EV bets and line discrepancies across Colorado-legal sportsbooks.

![Next.js](https://img.shields.io/badge/Next.js-14.1-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8)

## Features

- **+EV Finder** - Identifies positive expected value bets using Pinnacle's sharp lines as the fair odds benchmark, including **alternate spreads and totals**
- **Line Shopping** - Compares odds across multiple sportsbooks to find the best prices on main and alt numbers
- **Arbitrage Finder** - Flags two-way books where combined implied probability is under 100%
- **Player Prop Analysis** - Visualize player performance trends against prop lines (clearly-labeled sample data — no API calls used)
- **Real-time Data** - Powered by The Odds API with smart caching to minimize API usage

## How It Works

### Fair Odds Calculation
HotHand uses **Pinnacle** (the industry's sharpest sportsbook) to calculate fair odds. Pinnacle's lines have the lowest vig in the market, making them the gold standard for determining true probabilities.

1. Fetch Pinnacle's odds for each market
2. Remove the vig to get no-vig fair probabilities
3. Compare Colorado book odds against fair odds
4. Flag any bet where the book's odds exceed fair value as +EV

### Kelly Criterion
The app calculates optimal bet sizing using quarter-Kelly criterion for conservative bankroll management.

## Supported Sportsbooks

Colorado-legal books included:
- DraftKings
- FanDuel
- BetMGM
- Caesars
- PointsBet
- BetRivers
- Pinnacle (fair odds benchmark only)

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- [The Odds API](https://the-odds-api.com/) key (free tier available)

### Installation

```bash
# Clone the repository
git clone https://github.com/LittleRiverDevelopment/HotHandAnalytics.io.git
cd HotHandAnalytics.io

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env and add your NEXT_PUBLIC_ODDS_API_KEY

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. The first visit shows the board with labeled demo data; click Refresh to fetch live odds using your API key.

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_ODDS_API_KEY` | Your API key from The Odds API — needed for API-backed odds (the board shows labeled demo data without it; a key saved via the in-app Admin screen also works) | For live odds |
| `NEXT_PUBLIC_ODDS_API_KEY_2` | Backup key, used automatically when the first key's monthly credits run out | No |
| `NEXT_PUBLIC_ADMIN_PASSWORD` | Password for the in-app Admin screen that edits the odds key (client-side convenience only — not real security) | No |

Note: this is a fully static site (static export, no server), so `NEXT_PUBLIC_*` values are visible in the browser bundle. Treat any key you embed as public.

### Personal Admin settings

Admin manages two optional key overrides for this browser, not site-wide configuration.
Inputs stay masked; each key shows whether its source is a site default or a browser
override. “Configured” does not mean the API has validated the key.

Save settings does not fetch odds. Use the separate Refresh odds action when you
want a new pull, which may consume API credits. Use site defaults asks for confirmation
before removing both browser overrides; it does not remove site keys, clear cached
odds, or make an API request. Storage errors are shown rather than reported as saves.

The password prompt remains a convenience guard, not secure authentication. Closing
Admin keeps it unlocked in the same tab; Lock admin ends that unlock. This release
does not add accounts, a paywall, or server-side credential protection.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Charts**: Chart.js + react-chartjs-2
- **Animations**: Framer Motion
- **Data**: The Odds API

## API Usage

The app implements smart caching to minimize API calls:
- **Persistent browser cache** - Repeated visits reuse the last pull until you click Refresh
- **Manual refresh only** - No automatic polling
- **Alternate lines** - Off by default. Check **Alt lines** in the freshness strip to fetch alternate spreads/totals **per game** for the **4 games with the highest main-line +EV**, trimmed to numbers near the main line. The board paints main lines first so Refresh stays snappy.

Free tier of The Odds API includes 500 requests/month.

## Testing

```bash
npm test
```

Runs the test suite with Node's built-in test runner. CI runs the same suite on every pull request targeting `main` and again before every deployment.

## Project Structure

```
HotHandAnalytics.io/
├── app/
│   ├── globals.css     # Global styles
│   ├── layout.tsx       # Root layout
│   └── page.tsx         # Home page (client-side dashboard)
├── components/          # Dashboard, EV finder, line shopping, bet tracker, and more
├── lib/
│   ├── bet-history.ts   # Bet tracker data (auto-generated from the Google Sheet — do not hand-edit)
│   ├── mock-data.ts     # Demo data (labeled as demo/sample in the UI)
│   ├── odds-api.ts      # The Odds API client: caching, ETag, dual-key failover
│   ├── odds-utils.ts    # Odds calculations (no-vig, EV, Kelly, arbitrage)
│   └── types.ts         # TypeScript interfaces
├── scripts/
│   └── sync-bet-history.mjs  # Google Sheet → lib/bet-history.ts sync (run by GitHub Actions)
└── .github/workflows/   # CI (tests), deploy (GitHub Pages), and bet-tracker sync
```

The static app fetches odds and scores in the browser. Bet history is fetched separately by GitHub Actions and bundled into the site; there are no server-side application routes.

## Deployment

### GitHub Pages (Automatic)

This repo auto-deploys to GitHub Pages on every push to `main`.

**Setup (one-time):**
1. Go to your repo → Settings → Secrets and variables → Actions
2. Add a new secret: `NEXT_PUBLIC_ODDS_API_KEY` = your API key
3. Go to Settings → Pages → Source: select "GitHub Actions"
4. Push to `main` and the site will deploy automatically

Bet-tracker data syncs from the Google Sheet on a schedule (every three hours; runs may be delayed). After successfully pushing changed bet records, the sync workflow is configured to dispatch the deployment workflow, so the published tracker stays current without a code push. No-op syncs skip publication. If a sync push succeeds but the dispatch fails, recovery is a manual deploy of current `main`.

### Local Development

```bash
npm install
npm run dev
```

## Disclaimer

This tool is for informational purposes only. Sports betting involves risk. Always gamble responsibly and only bet what you can afford to lose. Past performance does not guarantee future results.

## License

MIT License - see [LICENSE](LICENSE) for details.
