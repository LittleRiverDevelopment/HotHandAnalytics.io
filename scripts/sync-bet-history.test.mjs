import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseBetSheetCsv } from './sync-bet-history.mjs'

const HEADER = 'Date,Bet,Sport,Book,Units,Odds,Status,W/L,Running Total,Tail'

const SAMPLE_OVERRIDE = [
  { date: '2026-09-06', descriptionIncludes: 'Washington ML', wl: -1 },
]

test('applies a settlement overlay when the sheet still says Open', () => {
  const csv = [
    HEADER,
    'January 26,Earlier bet,NBA,FanDuel,1,-110,W,0.91,0.91,',
    'September 6,Washington ML + Ole Miss ML + Wisconsin +27.5,NCAAF,FanDuel,1,140,Open,,,,',
  ].join('\n')

  const bets = parseBetSheetCsv(csv, SAMPLE_OVERRIDE)
  assert.equal(bets.length, 2)
  const parlay = bets[1]
  assert.equal(parlay.status, 'L')
  assert.equal(parlay.delta, -1)
  assert.equal(parlay.cumulative, -0.09)
})

test('does not override a different Open bet', () => {
  const csv = [
    HEADER,
    'September 6,Some other NCAAF parlay,NCAAF,FanDuel,1,140,Open,,,,',
  ].join('\n')

  const bets = parseBetSheetCsv(csv, SAMPLE_OVERRIDE)
  assert.equal(bets[0].status, 'Open')
  assert.equal(bets[0].delta, null)
  assert.equal(bets[0].cumulative, null)
})

test('sheet Status/W-L wins once the row is actually settled', () => {
  const csv = [
    HEADER,
    'January 26,Earlier bet,NBA,FanDuel,1,-110,W,0.91,0.91,',
    'September 6,Washington ML + Ole Miss ML + Wisconsin +27.5,NCAAF,FanDuel,1,140,L,-0.5,0.41,',
  ].join('\n')

  const bets = parseBetSheetCsv(csv, SAMPLE_OVERRIDE)
  const parlay = bets[1]
  assert.equal(parlay.status, 'L')
  assert.equal(parlay.delta, -0.5)
  assert.equal(parlay.cumulative, 0.41)
})

test('keeps a live Open row (Red Sox -1.5) until the sheet settles it', () => {
  const csv = [
    HEADER,
    'January 26,Earlier bet,NBA,FanDuel,1,-110,W,0.91,0.91,',
    'September 11,Boston Red Sox -1.5,MLB,DraftKings,1,102,Open,Open,Open,',
  ].join('\n')

  const bets = parseBetSheetCsv(csv)
  assert.equal(bets[1].status, 'Open')
  assert.equal(bets[1].delta, null)
  assert.equal(bets[1].cumulative, null)
  assert.equal(bets[0].cumulative, 0.91)
})
