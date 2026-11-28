import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { OddsEvent } from './types'
import { findExchangeDeltas } from './exchange-delta'

function event(books: OddsEvent['bookmakers']): OddsEvent {
  return {
    id: 'g1',
    sport_key: 'basketball_nba',
    sport_title: 'NBA',
    commence_time: new Date(Date.now() + 3_600_000).toISOString(),
    home_team: 'Los Angeles Lakers',
    away_team: 'Boston Celtics',
    bookmakers: books,
  }
}

function book(key: string, title: string, outcomes: { name: string; price: number; point?: number }[], market = 'h2h') {
  return {
    key,
    title,
    last_update: new Date().toISOString(),
    markets: [{ key: market, last_update: new Date().toISOString(), outcomes }],
  }
}

test('pairs the same side and measures Kalshi minus Polymarket in cents', () => {
  const rows = findExchangeDeltas([
    event([
      book('kalshi', 'Kalshi', [
        { name: 'Los Angeles Lakers', price: -110 },
        { name: 'Boston Celtics', price: -110 },
      ]),
      book('polymarket_us', 'Polymarket US', [
        { name: 'Los Angeles Lakers', price: 100 },
        { name: 'Boston Celtics', price: -120 },
      ]),
    ]),
  ])

  const lakers = rows.find(row => row.selection === 'Los Angeles Lakers')
  assert.ok(lakers)
  assert.ok(lakers.gapCents > 0)
  assert.equal(lakers.kalshiOdds, -110)
  assert.equal(lakers.polymarketOdds, 100)
  assert.equal(lakers.market, 'Moneyline')
})

test('skips a side only one exchange quotes, and a different number', () => {
  const rows = findExchangeDeltas([
    event([
      book('kalshi', 'Kalshi', [
        { name: 'Los Angeles Lakers', price: -105, point: 2.5 },
        { name: 'Boston Celtics', price: -115, point: -2.5 },
      ], 'spreads'),
      book('polymarket_us', 'Polymarket US', [
        { name: 'Los Angeles Lakers', price: -110, point: 3.5 },
        { name: 'Boston Celtics', price: -110, point: -3.5 },
      ], 'spreads'),
    ]),
  ])
  assert.equal(rows.length, 0)
})

test('needs both exchanges on the game', () => {
  const rows = findExchangeDeltas([
    event([
      book('kalshi', 'Kalshi', [{ name: 'Los Angeles Lakers', price: -110 }]),
    ]),
  ])
  assert.equal(rows.length, 0)
})
