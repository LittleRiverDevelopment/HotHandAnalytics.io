# HotHand Analytics

A sports betting edge finder that helps identify +EV bets and line discrepancies across Colorado-legal sportsbooks.

![Next.js](https://img.shields.io/badge/Next.js-14.1-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8)

## Features

- **+EV Finder** - Identifies positive expected value bets using Pinnacle's sharp lines as the fair odds benchmark
- **Line Shopping** - Compares odds across multiple sportsbooks to find the best prices
- **Player Prop Analysis** - Visualize player performance trends against prop lines
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
git clone https://github.com/yourusername/hothand-analytics.git
cd hothand-analytics

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env and add your ODDS_API_KEY

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `ODDS_API_KEY` | Your API key from The Odds API | Yes |
| `USE_MOCK_DATA` | Set to `true` to use demo data | No |

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Charts**: Chart.js + react-chartjs-2
- **Animations**: Framer Motion
- **Data**: The Odds API

## API Usage

The app implements smart caching to minimize API calls:
- **5-minute server-side cache** - Repeated requests use cached data
- **Manual refresh only** - No automatic polling
- **Remaining calls display** - Shows your API quota in the header

Free tier of The Odds API includes 500 requests/month.

## Project Structure

```
hothand-analytics/
├── app/
│   ├── api/odds/       # API route for fetching odds
│   ├── globals.css     # Global styles
│   ├── layout.tsx      # Root layout
│   └── page.tsx        # Home page
├── components/
│   ├── Dashboard.tsx   # Main dashboard
│   ├── EVCalculator.tsx    # +EV bet finder
│   ├── LineDiscrepancy.tsx # Line shopping table
│   └── PlayerPropAnalyzer.tsx # Player props
├── lib/
│   ├── mock-data.ts    # Demo data
│   ├── odds-api.ts     # API service with caching
│   ├── odds-utils.ts   # Odds calculations
│   └── types.ts        # TypeScript interfaces
└── ...config files
```

## Deployment

### Vercel (Recommended)

```bash
npm install -g vercel
vercel
```

Add your `ODDS_API_KEY` in Vercel's environment variables settings.

### Self-hosted

```bash
npm run build
npm start
```

## Disclaimer

This tool is for informational purposes only. Sports betting involves risk. Always gamble responsibly and only bet what you can afford to lose. Past performance does not guarantee future results.

## License

MIT License - see [LICENSE](LICENSE) for details.
