import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ODDS_API_BOOKMAKERS, SPORTSBOOKS } from './types'
import { oddsBooksQuery } from './odds-api'

test('odds request stays inside one billed region', () => {
  assert.ok(ODDS_API_BOOKMAKERS.length > 0)
  assert.ok(ODDS_API_BOOKMAKERS.length <= 10)
  assert.equal(new Set(ODDS_API_BOOKMAKERS).size, ODDS_API_BOOKMAKERS.length)
  const keys: readonly string[] = ODDS_API_BOOKMAKERS
  assert.ok(keys.includes('pinnacle'))
  assert.ok(keys.includes('williamhill_us'))
  assert.ok(keys.includes('polymarket'))
  assert.equal(ODDS_API_BOOKMAKERS.length, 10)
  assert.equal(keys.includes('pointsbetus'), false)
  assert.equal(SPORTSBOOKS.some(book => book.key === 'pinnacle'), false)
})

test('odds query names bookmakers and does not send regions', () => {
  const query = oddsBooksQuery(['h2h', 'spreads', 'totals'], { includeLinks: true })
  assert.match(query, /^markets=h2h,spreads,totals&oddsFormat=american&bookmakers=/)
  assert.match(query, /williamhill_us/)
  assert.match(query, /polymarket/)
  assert.match(query, /includeLinks=true$/)
  assert.equal(query.includes('regions='), false)
  assert.equal(query.includes('pointsbetus'), false)
  assert.equal(query.includes('bookmakers=caesars'), false)
})
