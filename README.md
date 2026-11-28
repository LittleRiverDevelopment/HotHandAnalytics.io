# LineSnipe

A sports-betting board for finding a better price. One page:

- **Positive EV Finder** — bets priced better than Pinnacle no-vig fair odds, including alternate spreads and totals when Alt lines is on
- **Line Shop** — best vs worst price on the same number across the books
- **Arbitrage** — two-way books whose combined implied probability is under 100%
- **Overview** — counts and the top prices from the same odds already loaded
- **Bonus** — same-game parlays built from those prices
- **Analytics** — edge heatmap and line movement saved in this browser
- **Player Props** — recent NBA game logs for the players in `scripts/fetch_gamelogs.py`. The line starts at the recent average. It is not a sportsbook price, and it does not call the odds API
- **Bet Tracker** — the saved bet history
- **Bankroll Sim** — a bankroll projection from that history
- **Trends** — today's TrendsCenter trends for one sport. Needs `NEXT_PUBLIC_TRENDSCENTER_KEY`

Odds come from [The Odds API](https://the-odds-api.com/) in the browser. The first visit shows labeled demo data. Refresh pulls live odds and may use API credits. Results stay in this browser until you refresh again.

Polymarket on the boards is Polymarket US. The price includes the small-account taker fee, so a 50¢ contract is shown near -110 instead of +100.

## Keys

| Variable | Who can use it |
|----------|----------------|
| `NEXT_PUBLIC_ODDS_API_KEY` | The three tabs. No admin password. |
| `NEXT_PUBLIC_ODDS_API_KEY_2` | Backup only, and only after the admin password is entered in this tab. |
| `NEXT_PUBLIC_ADMIN_PASSWORD` | Older shared password. The admin screen now opens for an admin account and does not ask for this password. |
| `NEXT_PUBLIC_SUPABASE_URL` | Public Supabase project URL for email/password accounts. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon or publishable key. Never the service-role key or database password. |
| `NEXT_PUBLIC_TRENDSCENTER_KEY` | Trends tab only. A `tc_test_` sandbox key is the one to try. Compiled into the page. |

Same pattern as HotHand: `NEXT_PUBLIC_*` values are compiled into the static site. Do not commit real keys. Put them in `.env` locally (see `.env.example`) or in GitHub Actions secrets for the Pages deploy.

Email login uses the Supabase JS client. Sign in, sign up, and sign out sit in the header. The Positive EV, Line Shop, and Arbitrage tabs stay available when you are signed out. If the Supabase URL or anon key is blank, the header stays on Signed out and the boards still load.

The gear for Admin stays hidden until someone is signed in with an admin account. Creating an account does not make that person an admin. In the Supabase dashboard, open Authentication → Users, select the account, and set raw app metadata to `{"role":"admin"}`. That person signs out and signs in again, and the gear appears for that account only. The backup odds key can be sent while that admin screen is open. `user_metadata` is not used, because the account holder can edit it.

In the Supabase project, turn on the Email provider. Under Authentication → URL configuration, set the Site URL to this site and add redirect URLs for the deployed address and for `http://localhost:3000`. Sign-up returns to the current page. If email confirmation is on, a new account stays signed out until that message is confirmed. The anon key is compiled into the site. Never put a service-role key or database password in `NEXT_PUBLIC_SUPABASE_ANON_KEY` or anywhere else in this repo.

```bash
npm install
cp .env.example .env
npm run dev
```

Open http://localhost:3000. `npm test` runs the odds and admin-key checks.

## Disclaimer

Informational only. Sports betting involves risk. Bet only what you can afford to lose.
