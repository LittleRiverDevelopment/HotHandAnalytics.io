import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { OddsEvent } from './types'
import { kalshiTakerAmerican, withKalshiTakerPrices } from './kalshi'

test('general taker fee turns a 50 cent contract into -107', () => {
  assert.equal(kalshiTakerAmerican(100), -107)
  assert.equal(kalshiTakerAmerican(-110), -118)
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
        key: 'kalshi',
        title: 'Kalshi',
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

  const priced = withKalshiTakerPrices(event)
  assert.equal(priced.bookmakers[0].markets[0].outcomes[0].price, 100)
  assert.equal(priced.bookmakers[1].title, 'Kalshi')
  assert.equal(priced.bookmakers[1].markets[0].outcomes[0].price, -107)
  assert.equal(priced.bookmakers[1].markets[0].outcomes[0].point, 2.5)
  assert.equal(event.bookmakers[1].markets[0].outcomes[0].price, 100)
})
