import { test } from 'node:test'
import assert from 'node:assert/strict'
import { MOCK_EVENTS } from './mock-data'
import {
  collectQuotedLines,
  findEVBets,
  findLineDiscrepancies,
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
