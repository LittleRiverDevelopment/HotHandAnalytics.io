import { test } from 'node:test'
import assert from 'node:assert/strict'
import { MOCK_EVENTS } from './mock-data'
import { bestValueParlay, findAttractiveLines, type ParlayLeg } from './parlay'
import { bonusParlayHref, parlaySlipUrl } from './sportsbook-links'

function leg(overrides: Partial<ParlayLeg> & Pick<ParlayLeg, 'eventId' | 'book'>): ParlayLeg {
  return {
    homeTeam: 'Home',
    awayTeam: 'Away',
    market: 'Moneyline',
    selection: 'Home',
    odds: 100,
    edge: 1,
    evPercent: null,
    fairProbability: null,
    commenceTime: '2026-10-15T18:00:00Z',
    ...overrides,
  }
}

test('bestValueParlay prefers the highest positive fair EV', () => {
  const short = [
    leg({ eventId: 'a', book: 'FanDuel', fairProbability: 0.55, edge: 1 }),
    leg({ eventId: 'b', book: 'FanDuel', fairProbability: 0.55, edge: 1 }),
  ]
  const long = [1, 2, 3, 4].map(n =>
    leg({ eventId: `c${n}`, book: 'DraftKings', fairProbability: 0.4, edge: 8 })
  )
  const pick = bestValueParlay([...short, ...long])
  assert.equal(pick?.pickedFor, 'ev')
  assert.equal(pick?.parlay.book, 'FanDuel')
  assert.equal(pick?.parlay.legs.length, 2)
  assert.ok((pick?.parlay.evPercent ?? 0) > 0)
})

test('bestValueParlay uses price per leg when nothing is positive EV', () => {
  const sharp = [
    leg({ eventId: 'a', book: 'BetMGM', edge: 4 }),
    leg({ eventId: 'b', book: 'BetMGM', edge: 4 }),
  ]
  const long = [1, 2, 3, 4].map(n =>
    leg({ eventId: `c${n}`, book: 'Caesars', edge: 1 })
  )
  const negative = [
    leg({ eventId: 'd', book: 'FanDuel', edge: 9, fairProbability: 0.2 }),
    leg({ eventId: 'e', book: 'FanDuel', edge: 9, fairProbability: 0.2 }),
  ]
  const pick = bestValueParlay([...sharp, ...long, ...negative])
  assert.equal(pick?.pickedFor, 'price')
  assert.equal(pick?.parlay.book, 'BetMGM')
  assert.equal(pick?.parlay.legs.length, 2)
})

test('bestValueParlay caps a ticket at 6 legs', () => {
  const legs = Array.from({ length: 8 }, (_, index) =>
    leg({ eventId: `e${index}`, book: 'DraftKings', edge: 2 })
  )
  const pick = bestValueParlay(legs)
  assert.equal(pick?.parlay.legs.length, 6)
})

test('bestValueParlay returns null without two games at one book', () => {
  assert.equal(bestValueParlay([leg({ eventId: 'only', book: 'FanDuel' })]), null)
  assert.ok(bestValueParlay(findAttractiveLines(MOCK_EVENTS)))
})

test('parlaySlipUrl builds one FanDuel bet slip for every leg', () => {
  const url = parlaySlipUrl('FanDuel', [
    'https://co.sportsbook.fanduel.com/addToBetslip?marketId=42.1&selectionId=11',
    'https://co.sportsbook.fanduel.com/addToBetslip?marketId=42.2&selectionId=22',
  ])
  assert.equal(
    url,
    'https://co.sportsbook.fanduel.com/addToBetslip?marketId%5B0%5D=42.1&selectionId%5B0%5D=11&marketId%5B1%5D=42.2&selectionId%5B1%5D=22'
  )
})

test('parlaySlipUrl joins DraftKings outcomes onto the first event', () => {
  const url = parlaySlipUrl('DraftKings', [
    'https://sportsbook.draftkings.com/event/lakers-celtics/30568753?outcomes=0QA111%230',
    'https://sportsbook.draftkings.com/event/suns-warriors/30568754?outcomes=0QA222',
  ])
  assert.equal(
    url,
    'https://sportsbook.draftkings.com/event/30568753?outcomes=0QA111%230+0QA222'
  )
})

test('parlaySlipUrl joins BetMGM and Caesars selection ids', () => {
  assert.equal(
    parlaySlipUrl('BetMGM', [
      'https://sports.betmgm.com/en/sports/events/10?options=10-20-30',
      'https://sports.betmgm.com/en/sports/events/11?options=11-21-31',
    ]),
    'https://sports.betmgm.com/en/sports?options=10-20-30,11-21-31&type=combo'
  )
  assert.equal(
    parlaySlipUrl('Caesars', [
      'https://sportsbook.caesars.com/us/nj/bet/basketball?selectionIds=abc',
      'https://sportsbook.caesars.com/us/nj/bet/basketball?selectionIds=def',
    ]),
    'https://sportsbook.caesars.com/us/nj/bet/betslip?selectionIds=abc,def'
  )
})

test('parlaySlipUrl stays empty unless every leg can go on one slip', () => {
  assert.equal(
    parlaySlipUrl('DraftKings', [
      'https://sportsbook.draftkings.com/event/lakers-celtics/30568753',
      'https://sportsbook.draftkings.com/event/suns-warriors/30568754?outcomes=0QA222',
    ]),
    null
  )
  assert.equal(parlaySlipUrl('PointsBet', [
    'https://pointsbet.com/a',
    'https://pointsbet.com/b',
  ]), null)
  const fallback = bonusParlayHref('PointsBet', [null, null])
  assert.equal(fallback.prefilled, false)
  assert.equal(fallback.href, 'https://pointsbet.com/')
})
