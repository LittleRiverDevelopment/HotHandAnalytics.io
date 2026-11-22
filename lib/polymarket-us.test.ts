import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { OddsEvent } from './types'
import { findEVBets } from './odds-utils'
import {
  polymarketUsTakerAmerican,
  withPolymarketUsTakerPrices,
} from './polymarket-us'

test('small-account taker fee turns a 50 cent contract into about -110', () => {
  assert.equal(polymarketUsTakerAmerican(100), -110)
  assert.equal(polymarketUsTakerAmerican(150), 137)
  assert.equal(polymarketUsTakerAmerican(-110), -121)
})

test('fee adjustment keeps the point and leaves other books unchanged', () => {
  const event: OddsEvent = {
    id: 'e1',
    sport_key: 'basketball_nba',
    sport_title: 'NBA',
    commence_time: new Date(Date.now() + 3_600_000).toISOString(),
    home_team: 'Los Angeles Lakers',
    away_team: 'Boston Celtics',
    bookmakers: [
      {
        key: 'draftkings',
        title: 'DraftKings',
        last_update: new Date().toISOString(),
        markets: [
          { key: 'h2h', last_update: new Date().toISOString(), outcomes: [{ name: 'Los Angeles Lakers', price: 100 }] },
        ],
      },
      {
        key: 'polymarket_us',
        title: 'Polymarket (US)',
        last_update: new Date().toISOString(),
        markets: [
          {
            key: 'spreads',
            last_update: new Date().toISOString(),
            outcomes: [{ name: 'Los Angeles Lakers', price: 100, point: 2.5 }],
          },
        ],
      },
    ],
  }

  const priced = withPolymarketUsTakerPrices(event)
  assert.equal(priced.bookmakers[0].markets[0].outcomes[0].price, 100)
  assert.equal(priced.bookmakers[1].title, 'Polymarket US')
  assert.equal(priced.bookmakers[1].markets[0].outcomes[0].price, -110)
  assert.equal(priced.bookmakers[1].markets[0].outcomes[0].point, 2.5)
  assert.equal(event.bookmakers[1].markets[0].outcomes[0].price, 100)
})

test('a Polymarket US price that only leads before the fee drops off Positive EV', () => {
  const updated = new Date().toISOString()
  const event: OddsEvent = {
    id: 'e2',
    sport_key: 'basketball_nba',
    sport_title: 'NBA',
    commence_time: new Date(Date.now() + 3_600_000).toISOString(),
    home_team: 'Los Angeles Lakers',
    away_team: 'Boston Celtics',
    bookmakers: [
      {
        key: 'pinnacle',
        title: 'Pinnacle',
        last_update: updated,
        markets: [
          {
            key: 'h2h',
            last_update: updated,
            outcomes: [
              { name: 'Los Angeles Lakers', price: -110 },
              { name: 'Boston Celtics', price: -110 },
            ],
          },
        ],
      },
      {
        key: 'polymarket_us',
        title: 'Polymarket (US)',
        last_update: updated,
        markets: [
          {
            key: 'h2h',
            last_update: updated,
            outcomes: [
              { name: 'Los Angeles Lakers', price: 105 },
              { name: 'Boston Celtics', price: -130 },
            ],
          },
        ],
      },
    ],
  }

  const before = findEVBets([event]).filter(bet => bet.selection === 'Los Angeles Lakers')
  assert.equal(before.length, 1)
  assert.equal(before[0].odds, 105)

  const after = findEVBets([withPolymarketUsTakerPrices(event)]).filter(
    bet => bet.selection === 'Los Angeles Lakers'
  )
  assert.equal(after.length, 0)
})
