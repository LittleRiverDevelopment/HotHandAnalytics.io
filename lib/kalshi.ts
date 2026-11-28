import type { Bookmaker, OddsEvent } from './types'
import { decimalToAmerican, impliedProbability } from './odds-utils'

/** The Odds API book for Kalshi. */
export const KALSHI_BOOK_KEY = 'kalshi'

/**
 * General taker fee on Kalshi: round_up(0.07 × contracts × P × (1 − P)).
 * The per-contract rate, before the one-contract cent round-up, is 0.07 × P × (1 − P).
 * https://kalshi.com/fee-schedule
 */
export const KALSHI_TAKER_FEE = 0.07

/**
 * American price after paying Kalshi's general taker fee on top of the contract price.
 * A 50¢ contract (+100) costs about 51.8¢, which is -107.
 */
export function kalshiTakerAmerican(
  american: number,
  coefficient: number = KALSHI_TAKER_FEE
): number {
  const price = impliedProbability(american)
  if (!Number.isFinite(price) || price <= 0 || price >= 1) return american
  const cost = price + coefficient * price * (1 - price)
  if (!Number.isFinite(cost) || cost <= 0 || cost >= 1) return american
  return decimalToAmerican(1 / cost)
}

function withFee(book: Bookmaker): Bookmaker {
  if (book.key.toLowerCase() !== KALSHI_BOOK_KEY) return book
  return {
    ...book,
    title: 'Kalshi',
    markets: (book.markets || []).map(market => ({
      ...market,
      outcomes: (market.outcomes || []).map(outcome => ({
        ...outcome,
        price: kalshiTakerAmerican(outcome.price),
      })),
    })),
  }
}

/** Copy one event, replacing Kalshi contract prices with the all-in taker price. */
export function withKalshiTakerPrices<T extends { bookmakers: Bookmaker[] }>(event: T): T {
  return { ...event, bookmakers: event.bookmakers.map(withFee) }
}

export function withKalshiTakerPricesList(events: OddsEvent[]): OddsEvent[] {
  return events.map(event => withKalshiTakerPrices(event))
}
