import { EVBet, OddsEvent } from './types'
import {
  americanToDecimal,
  decimalToAmerican,
  impliedProbability,
  findEVBets,
  collectQuotedLines,
  formatOdds,
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

/** Longest ticket the bonus tab will open. Matches the old leg picker. */
export const MAX_BONUS_PARLAY_LEGS = 6

export interface BestParlayPick {
  parlay: BuiltParlay
  /**
   * ev: a ticket with positive fair EV exists, and this one has the most.
   * price: nothing is positive EV, so this is the best price per leg.
   */
  pickedFor: 'ev' | 'price'
}

function averagePriceEdge(ticket: BuiltParlay): number {
  return ticket.legs.length === 0 ? 0 : ticket.priceEdge / ticket.legs.length
}

function compareBestValue(a: BuiltParlay, b: BuiltParlay, mode: 'ev' | 'price'): number {
  if (mode === 'ev') {
    const evDelta = (b.evPercent ?? Number.NEGATIVE_INFINITY) - (a.evPercent ?? Number.NEGATIVE_INFINITY)
    if (evDelta !== 0) return evDelta
  }
  const edgeDelta = averagePriceEdge(b) - averagePriceEdge(a)
  if (edgeDelta !== 0) return edgeDelta
  if (b.priceEdge !== a.priceEdge) return b.priceEdge - a.priceEdge
  if (b.decimalOdds !== a.decimalOdds) return b.decimalOdds - a.decimalOdds
  if (b.legs.length !== a.legs.length) return b.legs.length - a.legs.length
  return a.book.localeCompare(b.book)
}

function rankTickets(tickets: BuiltParlay[], mode: 'ev' | 'price'): BuiltParlay {
  return [...tickets].sort((a, b) => compareBestValue(a, b, mode))[0]
}

/**
 * The single parlay worth opening: highest positive fair EV across books and
 * leg counts, otherwise the best price per leg. Known losing tickets are
 * skipped when any other ticket exists.
 */
export function bestValueParlay(
  legs: ParlayLeg[],
  maxLegs: number = MAX_BONUS_PARLAY_LEGS
): BestParlayPick | null {
  const longest = Math.min(maxLegs, maxParlayLegs(legs))
  if (longest < 2) return null

  const tickets: BuiltParlay[] = []
  for (let count = 2; count <= longest; count++) {
    tickets.push(...buildParlays(legs, count))
  }
  if (tickets.length === 0) return null

  const positive = tickets.filter(ticket => (ticket.evPercent ?? 0) > 0)
  if (positive.length > 0) {
    return { parlay: rankTickets(positive, 'ev'), pickedFor: 'ev' }
  }

  const unpriced = tickets.filter(ticket => ticket.evPercent === null)
  if (unpriced.length > 0) {
    return { parlay: rankTickets(unpriced, 'price'), pickedFor: 'price' }
  }

  return { parlay: rankTickets(tickets, 'ev'), pickedFor: 'ev' }
}

export function parlayTapLabel(parlay: BuiltParlay, prefilled: boolean): { summary: string; label: string } {
  const odds = formatOdds(parlay.americanOdds)
  const legs = parlay.legs.map(leg => leg.selection).join(', ')
  const summary = `${parlay.book} ${odds}`
  const label = prefilled
    ? `Open ${parlay.legs.length}-leg ${parlay.book} parlay, ${odds}: ${legs}`
    : `Open ${parlay.book} for this ${parlay.legs.length}-leg parlay, ${odds}: ${legs}`
  return { summary, label }
}
