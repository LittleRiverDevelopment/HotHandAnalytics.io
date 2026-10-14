import { EVBet } from './types'
import { americanToDecimal, decimalToAmerican } from './odds-utils'

export interface BuiltParlay {
  book: string
  legs: EVBet[]
  decimalOdds: number
  americanOdds: number
  /** No-vig win chance of every leg hitting, assuming the games are independent */
  fairProbability: number
  ev: number
  evPercent: number
}

/** One price per game: the highest-EV outcome that book is offering. */
export function bestLegsByBook(bets: EVBet[]): Map<string, EVBet[]> {
  const grouped = new Map<string, EVBet[]>()
  for (const bet of bets) {
    if (bet.ev <= 0) continue
    const list = grouped.get(bet.book) ?? []
    list.push(bet)
    grouped.set(bet.book, list)
  }

  const result = new Map<string, EVBet[]>()
  for (const [book, bookBets] of Array.from(grouped.entries())) {
    const bestByEvent = new Map<string, EVBet>()
    for (const bet of bookBets) {
      const current = bestByEvent.get(bet.eventId)
      if (!current || bet.ev > current.ev) bestByEvent.set(bet.eventId, bet)
    }
    const legs = Array.from(bestByEvent.values()).sort((a, b) => b.ev - a.ev)
    if (legs.length > 0) result.set(book, legs)
  }
  return result
}

export function maxParlayLegs(bets: EVBet[]): number {
  let max = 0
  for (const legs of Array.from(bestLegsByBook(bets).values())) {
    max = Math.max(max, legs.length)
  }
  return max
}

/**
 * Combined EV of independent legs is Π(1 + ev_i) − 1, so the highest-EV
 * unique games at one book are the best parlay of a given length.
 */
export function buildParlay(book: string, legs: EVBet[]): BuiltParlay {
  const decimalOdds = legs.reduce((acc, leg) => acc * americanToDecimal(leg.odds), 1)
  const fairProbability = legs.reduce((acc, leg) => {
    const fairProb = (1 + leg.ev) / americanToDecimal(leg.odds)
    return acc * fairProb
  }, 1)
  const ev = decimalOdds * fairProbability - 1
  return {
    book,
    legs,
    decimalOdds,
    americanOdds: decimalToAmerican(decimalOdds),
    fairProbability,
    ev,
    evPercent: ev * 100,
  }
}

export function buildParlays(bets: EVBet[], legCount: number): BuiltParlay[] {
  if (legCount < 2) return []
  const tickets: BuiltParlay[] = []
  for (const [book, legs] of Array.from(bestLegsByBook(bets).entries())) {
    if (legs.length < legCount) continue
    tickets.push(buildParlay(book, legs.slice(0, legCount)))
  }
  return tickets.sort((a, b) => b.ev - a.ev || b.decimalOdds - a.decimalOdds)
}
