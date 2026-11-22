import { EVBet, OddsEvent } from './types'
import {
  americanToDecimal,
  decimalToAmerican,
  impliedProbability,
  findEVBets,
  collectQuotedLines,
  marketKindLabel,
  outcomeKey,
  type MarketKind,
} from './odds-utils'

const KINDS: MarketKind[] = ['h2h', 'spreads', 'totals']

function selectionLabel(name: string, point: number | undefined, kind: MarketKind): string {
  if (point === undefined) return name
  if (kind === 'spreads') return `${name} ${point > 0 ? '+' : ''}${point}`
  return `${name} ${point}`
}

export interface ParlayLeg {
  eventId: string
  homeTeam: string
  awayTeam: string
  market: string
  selection: string
  odds: number
  book: string
  /** Percentage points of implied probability better than the next book */
  edge: number
  evPercent: number | null
  fairProbability: number | null
  commenceTime: string
  bookDeepLink?: string
}

export interface BuiltParlay {
  book: string
  legs: ParlayLeg[]
  decimalOdds: number
  americanOdds: number
  /** Sum of each leg's price edge versus the next book */
  priceEdge: number
  fairProbability: number | null
  evPercent: number | null
}

/**
 * One leg per game per book: the side where that book has the best price,
 * at least half a percentage point better than the next book. Positive EV is not required.
 */
export function findAttractiveLines(events: OddsEvent[]): ParlayLeg[] {
  const evByKey = new Map<string, EVBet>()
  for (const bet of findEVBets(events, Number.NEGATIVE_INFINITY)) {
    evByKey.set(`${bet.book}|${bet.eventId}|${bet.market}|${bet.selection}`, bet)
  }

  const bestByBookEvent = new Map<string, ParlayLeg>()

  for (const event of events) {
    for (const kind of KINDS) {
      const quotesByOutcome = new Map<string, { book: string; price: number; name: string; point?: number; link?: string }[]>()

      for (const bookmaker of event.bookmakers) {
        if (bookmaker.key.toLowerCase() === 'pinnacle') continue
        for (const line of collectQuotedLines(bookmaker, kind)) {
          const key = outcomeKey(line.name, line.point)
          const list = quotesByOutcome.get(key) ?? []
          list.push({
            book: bookmaker.title,
            price: line.price,
            name: line.name,
            point: line.point,
            link: line.link,
          })
          quotesByOutcome.set(key, list)
        }
      }

      for (const quotes of Array.from(quotesByOutcome.values())) {
        if (quotes.length < 2) continue
        for (const quote of quotes) {
          const others = quotes.filter(q => q.book !== quote.book).map(q => q.price)
          if (others.length === 0) continue
          const nextBest = Math.max(...others)
          const edge = (impliedProbability(nextBest) - impliedProbability(quote.price)) * 100
          if (edge < 0.5) continue

          const market = marketKindLabel(kind)
          const selection = selectionLabel(quote.name, quote.point, kind)
          const ev = evByKey.get(`${quote.book}|${event.id}|${market}|${selection}`)
          const leg: ParlayLeg = {
            eventId: event.id,
            homeTeam: event.home_team,
            awayTeam: event.away_team,
            market,
            selection,
            odds: quote.price,
            book: quote.book,
            edge,
            evPercent: ev ? ev.evPercent : null,
            fairProbability: ev ? (1 + ev.ev) / americanToDecimal(ev.odds) : null,
            commenceTime: event.commence_time,
            ...(quote.link ? { bookDeepLink: quote.link } : {}),
          }

          const slot = `${quote.book}|${event.id}`
          const current = bestByBookEvent.get(slot)
          if (
            !current ||
            leg.edge > current.edge ||
            (leg.edge === current.edge && leg.odds > current.odds)
          ) {
            bestByBookEvent.set(slot, leg)
          }
        }
      }
    }
  }

  return Array.from(bestByBookEvent.values())
}

/** Legs grouped by book, best price edge first. */
export function bestLegsByBook(legs: ParlayLeg[]): Map<string, ParlayLeg[]> {
  const grouped = new Map<string, ParlayLeg[]>()
  for (const leg of legs) {
    const list = grouped.get(leg.book) ?? []
    list.push(leg)
    grouped.set(leg.book, list)
  }

  const result = new Map<string, ParlayLeg[]>()
  for (const [book, bookLegs] of Array.from(grouped.entries())) {
    const sorted = [...bookLegs].sort((a, b) => b.edge - a.edge || b.odds - a.odds)
    if (sorted.length > 0) result.set(book, sorted)
  }
  return result
}

export function maxParlayLegs(legs: ParlayLeg[]): number {
  let max = 0
  for (const bookLegs of Array.from(bestLegsByBook(legs).values())) {
    max = Math.max(max, bookLegs.length)
  }
  return max
}

export function buildParlay(book: string, legs: ParlayLeg[]): BuiltParlay {
  const decimalOdds = legs.reduce((acc, leg) => acc * americanToDecimal(leg.odds), 1)
  const fairKnown = legs.every(leg => leg.fairProbability !== null)
  const fairProbability = fairKnown
    ? legs.reduce((acc, leg) => acc * (leg.fairProbability as number), 1)
    : null
  const evPercent = fairProbability === null ? null : (decimalOdds * fairProbability - 1) * 100
  return {
    book,
    legs,
    decimalOdds,
    americanOdds: decimalToAmerican(decimalOdds),
    priceEdge: legs.reduce((acc, leg) => acc + leg.edge, 0),
    fairProbability,
    evPercent,
  }
}

export function buildParlays(legs: ParlayLeg[], legCount: number): BuiltParlay[] {
  if (legCount < 2) return []
  const tickets: BuiltParlay[] = []
  for (const [book, bookLegs] of Array.from(bestLegsByBook(legs).entries())) {
    if (bookLegs.length < legCount) continue
    tickets.push(buildParlay(book, bookLegs.slice(0, legCount)))
  }
  return tickets.sort((a, b) => b.priceEdge - a.priceEdge || b.decimalOdds - a.decimalOdds)
}
