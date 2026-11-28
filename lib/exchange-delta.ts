import type { OddsEvent } from './types'
import {
  collectQuotedLines,
  impliedProbability,
  marketKindLabel,
  outcomeKey,
  type MarketKind,
} from './odds-utils'

const KINDS: MarketKind[] = ['h2h', 'spreads', 'totals']

export interface ExchangeDelta {
  id: string
  eventId: string
  homeTeam: string
  awayTeam: string
  commenceTime: string
  market: string
  kind: MarketKind
  selection: string
  /** Kalshi minus Polymarket US, in cents of implied probability. Positive means Kalshi is shorter. */
  gapCents: number
  kalshiOdds: number
  polymarketOdds: number
  kalshiLink?: string
  polymarketLink?: string
}

function selectionLabel(name: string, point: number | undefined, kind: MarketKind): string {
  if (point === undefined) return name
  if (kind === 'spreads') return `${name} ${point > 0 ? '+' : ''}${point}`
  return `${name} ${point}`
}

/**
 * Main lines both exchanges quote at the same number.
 * Prices are whatever is already on the event. Live pulls store the taker price.
 */
export function findExchangeDeltas(events: OddsEvent[]): ExchangeDelta[] {
  const rows: ExchangeDelta[] = []

  for (const event of events) {
    const kalshi = event.bookmakers.find(book => book.key.toLowerCase() === 'kalshi')
    const polymarket = event.bookmakers.find(book => book.key.toLowerCase() === 'polymarket_us')
    if (!kalshi || !polymarket) continue

    for (const kind of KINDS) {
      const polymarketLines = new Map(
        collectQuotedLines(polymarket, kind)
          .filter(line => !line.isAlt)
          .map(line => [outcomeKey(line.name, line.point), line])
      )

      for (const line of collectQuotedLines(kalshi, kind)) {
        if (line.isAlt) continue
        const other = polymarketLines.get(outcomeKey(line.name, line.point))
        if (!other) continue
        const gapCents = (impliedProbability(line.price) - impliedProbability(other.price)) * 100
        rows.push({
          id: `${event.id}|${kind}|${outcomeKey(line.name, line.point)}`,
          eventId: event.id,
          homeTeam: event.home_team,
          awayTeam: event.away_team,
          commenceTime: event.commence_time,
          market: marketKindLabel(kind),
          kind,
          selection: selectionLabel(line.name, line.point, kind),
          gapCents,
          kalshiOdds: line.price,
          polymarketOdds: other.price,
          kalshiLink: line.link,
          polymarketLink: other.link,
        })
      }
    }
  }

  return rows.sort((a, b) => Math.abs(b.gapCents) - Math.abs(a.gapCents) || a.selection.localeCompare(b.selection))
}
