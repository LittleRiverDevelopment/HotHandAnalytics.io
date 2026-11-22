import type { Bookmaker, OddsEvent } from './types'
import { decimalToAmerican, impliedProbability } from './odds-utils'

/** The Odds API book for Polymarket US. The international book is `polymarket`. */
export const POLYMARKET_US_BOOK_KEY = 'polymarket_us'

/**
 * Taker fee coefficient for a Polymarket US account under $10,000 of trailing
 * 30-day taker volume. Fee = coefficient × contracts × price × (1 − price).
 * https://docs.polymarket.us/fees
 */
export const POLYMARKET_US_SMALL_ACCOUNT_TAKER_FEE = 0.095

/**
 * American price after paying the taker fee on top of the contract price.
 * A 50¢ contract (+100) costs about 52.4¢, which is -110.
 */
export function polymarketUsTakerAmerican(
  american: number,
  coefficient: number = POLYMARKET_US_SMALL_ACCOUNT_TAKER_FEE
): number {
  const price = impliedProbability(american)
  if (!Number.isFinite(price) || price <= 0 || price >= 1) return american
  const cost = price * (1 + coefficient * (1 - price))
  if (!Number.isFinite(cost) || cost <= 0 || cost >= 1) return american
  return decimalToAmerican(1 / cost)
}

function withFee(book: Bookmaker): Bookmaker {
  if (book.key.toLowerCase() !== POLYMARKET_US_BOOK_KEY) return book
  return {
    ...book,
    title: 'Polymarket US',
    markets: (book.markets || []).map(market => ({
      ...market,
      outcomes: (market.outcomes || []).map(outcome => ({
        ...outcome,
        price: polymarketUsTakerAmerican(outcome.price),
      })),
    })),
  }
}

/** Copy one event, replacing Polymarket US contract prices with the all-in taker price. */
export function withPolymarketUsTakerPrices<T extends { bookmakers: Bookmaker[] }>(event: T): T {
  return { ...event, bookmakers: event.bookmakers.map(withFee) }
}

export function withPolymarketUsTakerPricesList(events: OddsEvent[]): OddsEvent[] {
  return events.map(event => withPolymarketUsTakerPrices(event))
}
