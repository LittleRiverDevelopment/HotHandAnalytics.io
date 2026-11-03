# LineSnipe

A smaller sports-betting board for finding a better price. Three tabs, one page:

- **Positive EV Finder** — bets priced better than Pinnacle no-vig fair odds, including alternate spreads and totals when Alt lines is on
- **Line Shop** — best vs worst price on the same number across the books
- **Arbitrage** — two-way books whose combined implied probability is under 100%

Odds come from [The Odds API](https://the-odds-api.com/) in the browser. The first visit shows labeled demo data. Refresh pulls live odds and may use API credits. Results stay in this browser until you refresh again.

## Keys

| Variable | Who can use it |
|----------|----------------|
| `NEXT_PUBLIC_ODDS_API_KEY` | The three tabs. No admin password. |
| `NEXT_PUBLIC_ODDS_API_KEY_2` | Backup only, and only after the admin password is entered in this tab. |
| `NEXT_PUBLIC_ADMIN_PASSWORD` | Unlocks Admin so the backup key can be sent. Client-side convenience guard, not real security. |

Same pattern as HotHand: `NEXT_PUBLIC_*` values are compiled into the static site. Do not commit real keys. Put them in `.env` locally (see `.env.example`) or in GitHub Actions secrets for the Pages deploy.

```bash
npm install
cp .env.example .env
npm run dev
```

Open http://localhost:3000. `npm test` runs the odds and admin-key checks.

## Disclaimer

Informational only. Sports betting involves risk. Bet only what you can afford to lose.
