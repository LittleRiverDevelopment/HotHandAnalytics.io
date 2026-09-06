import { test } from 'node:test'
import assert from 'node:assert/strict'
import { MOCK_EVENTS } from './mock-data'
import { OddsEvent, ScoreEvent } from './types'
import {
  collectQuotedLines,
  filterUpcomingOrLiveEvents,
  findEVBets,
  findLineDiscrepancies,
  isUpcomingOrLive,
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

const HOUR = 60 * 60 * 1000

function eventAt(id: string, commenceTimeMs: number): OddsEvent {
  return {
    ...MOCK_EVENTS[0],
    id,
    commence_time: new Date(commenceTimeMs).toISOString(),
  }
}

function scoreFor(
  event: OddsEvent,
  completed: boolean,
  scores: ScoreEvent['scores'] = [
    { name: event.home_team, score: '4' },
    { name: event.away_team, score: '2' },
  ]
): ScoreEvent {
  return {
    id: event.id,
    sport_key: event.sport_key,
    commence_time: event.commence_time,
    completed,
    home_team: event.home_team,
    away_team: event.away_team,
    scores,
    last_update: new Date().toISOString(),
  }
}

test('isUpcomingOrLive keeps future games and drops completed ones', () => {
  const now = Date.parse('2026-09-06T18:00:00.000Z')
  const upcoming = eventAt('up', now + 2 * HOUR)
  const finalGame = eventAt('done', now - 3 * HOUR)
  const live = eventAt('live', now - 2 * HOUR)
  const stale = eventAt('stale', now - 20 * HOUR)
  const recentlyStarted = eventAt('grace', now - 1 * HOUR)

  assert.equal(isUpcomingOrLive(upcoming, [], now), true)
  assert.equal(isUpcomingOrLive(finalGame, [scoreFor(finalGame, true)], now), false)
  assert.equal(isUpcomingOrLive(live, [scoreFor(live, false)], now), true)
  assert.equal(isUpcomingOrLive(stale, [], now), false)
  assert.equal(isUpcomingOrLive(recentlyStarted, [], now), true)
})

test('isUpcomingOrLive keeps a live extra-innings game past the grace window', () => {
  const now = Date.parse('2026-09-06T18:00:00.000Z')
  const extra = eventAt('extra', now - 10 * HOUR)
  assert.equal(isUpcomingOrLive(extra, [scoreFor(extra, false)], now), true)
})

test('filterUpcomingOrLiveEvents drops FINAL games from the board', () => {
  const now = Date.parse('2026-09-06T18:00:00.000Z')
  const upcoming = eventAt('up', now + 4 * HOUR)
  const done = eventAt('done', now - 3 * HOUR)
  const filtered = filterUpcomingOrLiveEvents(
    [upcoming, done],
    [scoreFor(done, true)],
    now
  )
  assert.deepEqual(filtered.map(e => e.id), ['up'])
})

test('yesterday FINAL with the same teams does not hide tonight\'s game', () => {
  const now = Date.parse('2026-09-06T18:00:00.000Z')
  const tonight = eventAt('tonight', now + 4 * HOUR)
  const yesterday = eventAt('yesterday', now - 20 * HOUR)
  const filtered = filterUpcomingOrLiveEvents(
    [tonight],
    [scoreFor(yesterday, true)],
    now
  )
  assert.deepEqual(filtered.map(e => e.id), ['tonight'])
})

test('rankEventsForAltFetch includes live games that started more than 15 minutes ago', () => {
  const now = Date.now()
  const live = eventAt('live-ev', now - 2 * HOUR)
  const ranked = rankEventsForAltFetch([live], 1, [scoreFor(live, false)], now)
  assert.equal(ranked.length, 1)
  assert.equal(ranked[0].id, 'live-ev')
})

test('rankEventsForAltFetch skips completed games', () => {
  const now = Date.now()
  const done = eventAt('final-ev', now - 2 * HOUR)
  const ranked = rankEventsForAltFetch([done], 1, [scoreFor(done, true)], now)
  assert.equal(ranked.length, 0)
})
