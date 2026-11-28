import { withKalshiTakerPrices, withKalshiTakerPricesList } from './kalshi'
import { withPolymarketUsTakerPrices, withPolymarketUsTakerPricesList } from './polymarket-us'
import type { Bookmaker, OddsEvent } from './types'

/** Apply Kalshi and Polymarket US taker fees. Other books are unchanged. */
export function withExchangeTakerPrices<T extends { bookmakers: Bookmaker[] }>(event: T): T {
  return withKalshiTakerPrices(withPolymarketUsTakerPrices(event))
}

export function withExchangeTakerPricesList(events: OddsEvent[]): OddsEvent[] {
  return withKalshiTakerPricesList(withPolymarketUsTakerPricesList(events))
}
