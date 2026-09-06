import { test } from 'node:test'
import assert from 'node:assert/strict'
import { MOCK_EVENTS } from './mock-data'
import {
  collectQuotedLines,
  findEVBets,
  findLineDiscrepancies,
  pruneDistantAltOutcomes,
  rankEventsForAltFetch,
  stripAltMarkets,
} from './odds-utils'

test('collectQuotedLines includes alternate spreads without duplicating the main number', () => {
  const dk = MOCK_EVENTS[0].bookmakers.find(b => b.key === 'draftkings')
  assert.ok(dk)
  const spreads = collectQuotedLines(dk, 'spreads')
  const main = spreads.filter(l => l.name === 'Los Angeles Lakers' && l.point === 2.5)
  assert.equal(main.length, 1)
  assert.equal(main[0].isAlt, false)
  const alt = spreads.find(l => l.name === 'Los Angeles Lakers' && l.point === 5.5)
  assert.ok(alt)
  assert.equal(alt.isAlt, true)
})

test('findEVBets flags Lakers +5.5 at DraftKings as a +EV alt line', () => {
  const hits = findEVBets(MOCK_EVENTS).filter(
    b => b.selection.includes('Los Angeles Lakers +5.5') && b.book === 'DraftKings'
  )
  assert.ok(hits.length >= 1, 'expected a +EV hit on Lakers +5.5 DK')
  assert.equal(hits[0].isAltLine, true)
  assert.ok(hits[0].evPercent >= 2)
})

test('findLineDiscrepancies shops Over 220.5 across books as an alt total', () => {
  const row = findLineDiscrepancies(MOCK_EVENTS).find(
    d => d.betType.includes('Over 220.5') && d.eventId === 'mock1'
  )
  assert.ok(row, 'expected a line-shop row for Over 220.5')
  assert.equal(row.isAltLine, true)
  assert.ok(row.spread >= 5)
})

test('stripAltMarkets removes +EV that only exists on alt numbers', () => {
  const withAlts = findEVBets(MOCK_EVENTS).some(b => b.isAltLine)
  const without = findEVBets(stripAltMarkets(MOCK_EVENTS)).some(b => b.isAltLine)
  assert.equal(withAlts, true)
  assert.equal(without, false)
})

test('pruneDistantAltOutcomes keeps near alts and drops far ones', () => {
  const dk = MOCK_EVENTS[0].bookmakers.find(b => b.key === 'draftkings')
  assert.ok(dk)
  const altMarket = dk.markets.find(m => m.key === 'alternate_spreads')
  assert.ok(altMarket)
  const bloated = structuredClone(MOCK_EVENTS)
  const bloatedDk = bloated[0].bookmakers.find(b => b.key === 'draftkings')!
  const bloatedAlt = bloatedDk.markets.find(m => m.key === 'alternate_spreads')!
  bloatedAlt.outcomes.push(
    { name: 'Los Angeles Lakers', price: 250, point: 18.5 },
    { name: 'Boston Celtics', price: -320, point: -18.5 }
  )

  const pruned = pruneDistantAltOutcomes(bloated)
  const prunedDk = pruned[0].bookmakers.find(b => b.key === 'draftkings')!
  const points = collectQuotedLines(prunedDk, 'spreads').map(l => l.point)
  assert.ok(points.includes(5.5))
  assert.equal(points.includes(18.5), false)
})

test('rankEventsForAltFetch picks the highest-+EV game first', () => {
  const ranked = rankEventsForAltFetch(MOCK_EVENTS, 3)
  assert.equal(ranked.length, 3)
  const maxEv = (eventId: string) =>
    Math.max(0, ...findEVBets(MOCK_EVENTS, 0).filter(b => b.eventId === eventId).map(b => b.evPercent))
  assert.ok(maxEv(ranked[0].id) >= maxEv(ranked[1].id))
  assert.ok(maxEv(ranked[1].id) >= maxEv(ranked[2].id))
})
