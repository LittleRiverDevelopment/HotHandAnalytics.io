import { OddsEvent, LineDiscrepancy, EVBet, ArbitrageOpportunity, ArbitrageLeg, Outcome, Market, Bookmaker } from './types'

// Colorado books only (exclude Pinnacle from betting display)
const COLORADO_BOOK_KEYS = [
  'draftkings', 'fanduel', 'betmgm', 'caesars', 
  'pointsbetus', 'betrivers', 'espnbet', 'superbook', 'betfred', 'fanatics'
]

/** If the book's market is updated much later than Pinnacle, no-vig fair odds are a stale reference. */
const STALE_PINNACLE_VS_BOOK_MS = 25 * 60 * 1000

export type MarketKind = 'h2h' | 'spreads' | 'totals'

const MARKET_KINDS: MarketKind[] = ['h2h', 'spreads', 'totals']

export function marketKind(key: string): MarketKind | null {
  if (key === 'h2h') return 'h2h'
  if (key === 'spreads' || key === 'alternate_spreads') return 'spreads'
  if (key === 'totals' || key === 'alternate_totals') return 'totals'
  return null
}

export function isAlternateMarket(key: string): boolean {
  return key === 'alternate_spreads' || key === 'alternate_totals'
}

/** Drop alternate_spreads / alternate_totals so the rest of the pipeline sees main lines only. */
export function stripAltMarkets(events: OddsEvent[]): OddsEvent[] {
  return events.map(event => ({
    ...event,
    bookmakers: event.bookmakers.map(book => ({
      ...book,
      markets: book.markets.filter(m => !isAlternateMarket(m.key)),
    })),
  }))
}

/** Keep alt spreads/totals within this many points of a featured (main) number. */
export const ALT_SPREAD_BAND = 5
export const ALT_TOTAL_BAND = 8

function featuredPoints(event: OddsEvent, kind: MarketKind): number[] {
  const points: number[] = []
  for (const book of event.bookmakers) {
    for (const market of book.markets) {
      if (marketKind(market.key) !== kind || isAlternateMarket(market.key)) continue
      for (const outcome of market.outcomes) {
        if (outcome.point !== undefined) points.push(outcome.point)
      }
    }
  }
  return points
}

function nearFeatured(point: number, featured: number[], band: number): boolean {
  if (featured.length === 0) return true
  return featured.some(f => Math.abs(point - f) <= band)
}

/** Drop far-away alt numbers (e.g. +18.5) that explode tables and rarely beat closer +EV. */
export function pruneDistantAltOutcomes(events: OddsEvent[]): OddsEvent[] {
  return events.map(event => {
    const spreadPts = featuredPoints(event, 'spreads')
    const totalPts = featuredPoints(event, 'totals')

    return {
      ...event,
      bookmakers: event.bookmakers.map(book => ({
        ...book,
        markets: book.markets.map(market => {
          if (market.key === 'alternate_spreads') {
            return {
              ...market,
              outcomes: market.outcomes.filter(
                o => o.point === undefined || nearFeatured(o.point, spreadPts, ALT_SPREAD_BAND)
              ),
            }
          }
          if (market.key === 'alternate_totals') {
            return {
              ...market,
              outcomes: market.outcomes.filter(
                o => o.point === undefined || nearFeatured(o.point, totalPts, ALT_TOTAL_BAND)
              ),
            }
          }
          return market
        }),
      })),
    }
  })
}

/**
 * Prefer games that already show the most +EV on the main line, then sooner tip-off.
 * Used to decide which events get the expensive per-game alt-line fetch.
 */
export function rankEventsForAltFetch(events: OddsEvent[], cap: number): OddsEvent[] {
  const cutoff = Date.now() - 15 * 60 * 1000
  const upcoming = events.filter(e => {
    const start = new Date(e.commence_time).getTime()
    return !Number.isNaN(start) && start > cutoff
  })
  if (upcoming.length === 0 || cap <= 0) return []

  const bestEv = new Map<string, number>()
  for (const e of upcoming) bestEv.set(e.id, 0)
  for (const bet of findEVBets(upcoming, 0)) {
    bestEv.set(bet.eventId, Math.max(bestEv.get(bet.eventId) ?? 0, bet.evPercent))
  }

  return [...upcoming]
    .sort((a, b) => {
      const evDelta = (bestEv.get(b.id) ?? 0) - (bestEv.get(a.id) ?? 0)
      if (evDelta !== 0) return evDelta
      return new Date(a.commence_time).getTime() - new Date(b.commence_time).getTime()
    })
    .slice(0, cap)
}

export function marketKindLabel(kind: MarketKind): string {
  if (kind === 'h2h') return 'Moneyline'
  if (kind === 'spreads') return 'Spread'
  return 'Total'
}

function formatSelectionLabel(name: string, point: number | undefined, kind: MarketKind): string {
  if (point === undefined) return name
  if (kind === 'spreads') return `${name} ${point > 0 ? '+' : ''}${point}`
  return `${name} ${point}`
}

export function outcomeKey(name: string, point?: number): string {
  return point !== undefined ? `${name}|${point}` : name
}

export interface QuotedLine {
  name: string
  price: number
  point?: number
  link?: string
  lastUpdate: string
  isAlt: boolean
  sourceMarketKey: string
}

/**
 * Flatten a book's featured + alternate markets of the same kind, preferring the main
 * line when the same number is quoted in both.
 */
export function collectQuotedLines(bookmaker: Bookmaker, kind: MarketKind): QuotedLine[] {
  const byKey = new Map<string, QuotedLine>()

  for (const market of bookmaker.markets) {
    if (marketKind(market.key) !== kind) continue
    const isAlt = isAlternateMarket(market.key)

    for (const outcome of market.outcomes) {
      const key = outcomeKey(outcome.name, outcome.point)
      const existing = byKey.get(key)
      if (existing && !existing.isAlt) continue
      if (existing && isAlt) continue

      byKey.set(key, {
        name: outcome.name,
        price: outcome.price,
        point: outcome.point,
        link: getDeepestBookmakerLink(outcome, market, bookmaker),
        lastUpdate: market.last_update || bookmaker.last_update || '',
        isAlt,
        sourceMarketKey: market.key,
      })
    }
  }

  return Array.from(byKey.values())
}

function featuredOutcomeKeys(event: OddsEvent, kind: MarketKind): Set<string> {
  const keys = new Set<string>()
  for (const bookmaker of event.bookmakers) {
    for (const line of collectQuotedLines(bookmaker, kind)) {
      if (!line.isAlt) keys.add(outcomeKey(line.name, line.point))
    }
  }
  return keys
}

/**
 * True counterparty for two-way no-vig (not "other index" — alt lines can reorder outcomes).
 */
export function getOpposingOutcomeForNoVig(
  marketKey: string,
  outcomes: Outcome[],
  outcome: Outcome
): Outcome | undefined {
  const kind = marketKind(marketKey)
  if (kind === 'h2h') {
    const others = outcomes.filter(o => o.name !== outcome.name)
    return others.length === 1 ? others[0] : undefined
  }
  if (kind === 'totals') {
    if (outcome.point === undefined) return undefined
    return outcomes.find(
      o =>
        o !== outcome &&
        o.point === outcome.point &&
        o.name !== outcome.name &&
        (o.name === 'Over' || o.name === 'Under')
    )
  }
  if (kind === 'spreads') {
    if (outcome.point === undefined) return undefined
    const p = outcome.point
    return outcomes.find(
      o =>
        o !== outcome &&
        o.point !== undefined &&
        o.name !== outcome.name &&
        Math.abs(o.point + p) < 0.001
    )
  }
  return undefined
}

function getOpposingQuotedLine(
  kind: MarketKind,
  lines: QuotedLine[],
  line: QuotedLine
): QuotedLine | undefined {
  if (kind === 'h2h') {
    const others = lines.filter(o => o.name !== line.name)
    return others.length === 1 ? others[0] : undefined
  }
  if (kind === 'totals') {
    if (line.point === undefined) return undefined
    return lines.find(
      o =>
        o !== line &&
        o.point === line.point &&
        o.name !== line.name &&
        (o.name === 'Over' || o.name === 'Under')
    )
  }
  if (kind === 'spreads') {
    if (line.point === undefined) return undefined
    const p = line.point
    return lines.find(
      o =>
        o !== line &&
        o.point !== undefined &&
        o.name !== line.name &&
        Math.abs(o.point + p) < 0.001
    )
  }
  return undefined
}

function isPinnacleStaleVsBook(pinnacleIso: string, bookMarketIso: string): boolean {
  const pin = new Date(pinnacleIso).getTime()
  const book = new Date(bookMarketIso).getTime()
  if (Number.isNaN(pin) || Number.isNaN(book)) return false
  return book - pin > STALE_PINNACLE_VS_BOOK_MS
}

/** Odds API: outcome → market → bookmaker event page (see includeLinks). */
function getDeepestBookmakerLink(
  outcome: Outcome,
  market: Market,
  bookmaker: Bookmaker
): string | undefined {
  const pick = (s: string | undefined) => {
    const t = s?.trim()
    return t && /^https?:\/\//i.test(t) ? t : undefined
  }
  return pick(outcome.link) ?? pick(market.link) ?? pick(bookmaker.link)
}

export function americanToDecimal(american: number): number {
  if (american > 0) {
    return (american / 100) + 1
  }
  return (100 / Math.abs(american)) + 1
}

export function decimalToAmerican(decimal: number): number {
  if (decimal >= 2) {
    return Math.round((decimal - 1) * 100)
  }
  return Math.round(-100 / (decimal - 1))
}

export function impliedProbability(american: number): number {
  if (american > 0) {
    return 100 / (american + 100)
  }
  return Math.abs(american) / (Math.abs(american) + 100)
}

export function calculateNoVigFromPair(odds1: number, odds2: number): [number, number] {
  const imp1 = impliedProbability(odds1)
  const imp2 = impliedProbability(odds2)
  const total = imp1 + imp2
  return [imp1 / total, imp2 / total]
}

export function calculateEV(odds: number, trueProbability: number): number {
  const decimalOdds = americanToDecimal(odds)
  return (trueProbability * (decimalOdds - 1)) - (1 - trueProbability)
}

export function calculateKellyCriterion(odds: number, trueProbability: number): number {
  const decimalOdds = americanToDecimal(odds)
  const kelly = (trueProbability * decimalOdds - 1) / (decimalOdds - 1)
  return Math.max(0, kelly)
}

export function formatOdds(american: number): string {
  return american > 0 ? `+${american}` : `${american}`
}

function isColoradoBook(bookKey: string): boolean {
  return COLORADO_BOOK_KEYS.includes(bookKey.toLowerCase())
}

/** How actionable the shop looks: more books + larger price gap → higher score (0–100). */
export function computeLineShopConfidence(bookCount: number, spread: number): number {
  const coverage = Math.min(60, 22 + Math.max(0, bookCount - 2) * 9.5)
  const edgeBoost = Math.min(40, Math.max(0, spread - 5) * 1.6)
  return Math.round(Math.min(100, coverage + edgeBoost))
}

/** +EV signal strength vs Pinnacle no-vig (0–100): larger EV% and Kelly fraction → higher score. */
export function computeEVConfidence(evPercent: number, kellyCriterion: number): number {
  const edgeScore = Math.min(58, 24 + evPercent * 2.4)
  const kellyScore = Math.min(42, kellyCriterion * 85)
  return Math.round(Math.min(100, edgeScore + kellyScore))
}

export function findLineDiscrepancies(events: OddsEvent[]): LineDiscrepancy[] {
  const discrepancies: LineDiscrepancy[] = []

  events.forEach(event => {
    MARKET_KINDS.forEach(kind => {
      const featuredKeys = featuredOutcomeKeys(event, kind)
      const bookOddsMap: Map<
        string,
        { book: string; bookKey: string; odds: number; point?: number; link?: string }[]
      > = new Map()

      event.bookmakers.forEach(bookmaker => {
        if (!isColoradoBook(bookmaker.key)) return

        collectQuotedLines(bookmaker, kind).forEach(line => {
          const key = outcomeKey(line.name, line.point)
          if (!bookOddsMap.has(key)) bookOddsMap.set(key, [])
          bookOddsMap.get(key)!.push({
            book: bookmaker.title,
            bookKey: bookmaker.key,
            odds: line.price,
            point: line.point,
            link: line.link,
          })
        })
      })

      bookOddsMap.forEach((bookOdds, betKey) => {
        if (bookOdds.length < 2) return

        const sorted = [...bookOdds].sort((a, b) => b.odds - a.odds)
        const best = sorted[0]
        const worst = sorted[sorted.length - 1]
        const spread = best.odds - worst.odds

        if (spread >= 5) {
          const [betType] = betKey.split('|')
          discrepancies.push({
            eventId: event.id,
            homeTeam: event.home_team,
            awayTeam: event.away_team,
            market: marketKindLabel(kind),
            betType: formatSelectionLabel(betType, best.point, kind),
            bestOdds: best.odds,
            bestBook: best.book,
            worstOdds: worst.odds,
            worstBook: worst.book,
            spread,
            confidenceScore: computeLineShopConfidence(bookOdds.length, spread),
            commenceTime: event.commence_time,
            allBookOdds: bookOdds,
            bestDeepLink: best.link,
            worstDeepLink: worst.link,
            isAltLine: !featuredKeys.has(betKey),
          })
        }
      })
    })
  })

  return discrepancies.sort((a, b) => b.spread - a.spread)
}

export function findEVBets(events: OddsEvent[], minEV: number = 0.02): EVBet[] {
  const evBets: EVBet[] = []

  events.forEach(event => {
    const pinnacle = event.bookmakers.find(b => b.key.toLowerCase() === 'pinnacle')

    MARKET_KINDS.forEach(kind => {
      const featuredKeys = featuredOutcomeKeys(event, kind)
      const pinnacleLines = pinnacle ? collectQuotedLines(pinnacle, kind) : []
      const pinnacleOddsMap: Map<string, { odds: number; opposingOdds: number; lastUpdate: string }> = new Map()

      for (const line of pinnacleLines) {
        const opposing = getOpposingQuotedLine(kind, pinnacleLines, line)
        if (!opposing) continue
        pinnacleOddsMap.set(outcomeKey(line.name, line.point), {
          odds: line.price,
          opposingOdds: opposing.price,
          lastUpdate: line.lastUpdate,
        })
      }

      event.bookmakers.forEach(bookmaker => {
        if (!isColoradoBook(bookmaker.key)) return

        collectQuotedLines(bookmaker, kind).forEach(line => {
          const key = outcomeKey(line.name, line.point)
          const pinnacleData = pinnacleOddsMap.get(key)
          if (!pinnacleData) return

          if (
            pinnacleData.lastUpdate &&
            line.lastUpdate &&
            isPinnacleStaleVsBook(pinnacleData.lastUpdate, line.lastUpdate)
          ) {
            return
          }

          const [fairProb] = calculateNoVigFromPair(pinnacleData.odds, pinnacleData.opposingOdds)
          const ev = calculateEV(line.price, fairProb)

          if (ev >= minEV) {
            const [betType] = key.split('|')
            const kelly = calculateKellyCriterion(line.price, fairProb)
            const evPercent = ev * 100

            evBets.push({
              eventId: event.id,
              homeTeam: event.home_team,
              awayTeam: event.away_team,
              market: marketKindLabel(kind),
              selection: formatSelectionLabel(betType, line.point, kind),
              odds: line.price,
              book: bookmaker.title,
              fairOdds: decimalToAmerican(1 / fairProb),
              pinnacleLastUpdate: pinnacleData.lastUpdate,
              ev,
              evPercent,
              kellyCriterion: kelly,
              confidenceScore: computeEVConfidence(evPercent, kelly),
              commenceTime: event.commence_time,
              ...(line.link ? { bookDeepLink: line.link } : {}),
              isAltLine: !featuredKeys.has(key),
            })
          }
        })
      })
    })
  })

  return evBets.sort((a, b) => b.evPercent - a.evPercent)
}

/** Formats a point value into the same string used as a bookOddsMap key, so pairs match reliably. */
function pointKey(point: number): string {
  return `${point}`
}

/** For a given key (e.g. "Over|1.5" or "Lakers|-4.5"), returns the key of its true counterparty leg. */
function getOpposingArbKey(
  kind: MarketKind,
  key: string,
  homeTeam: string,
  awayTeam: string
): string | undefined {
  if (kind === 'totals') {
    const [name, pointStr] = key.split('|')
    if (pointStr === undefined) return undefined
    const other = name === 'Over' ? 'Under' : name === 'Under' ? 'Over' : undefined
    return other ? `${other}|${pointStr}` : undefined
  }
  if (kind === 'spreads') {
    const [name, pointStr] = key.split('|')
    if (pointStr === undefined) return undefined
    const point = parseFloat(pointStr)
    if (Number.isNaN(point)) return undefined
    const otherTeam = name === homeTeam ? awayTeam : name === awayTeam ? homeTeam : undefined
    if (!otherTeam) return undefined
    return `${otherTeam}|${pointKey(-point)}`
  }
  return undefined
}

/** Stronger with a bigger locked-in profit margin and closer-together book update times (less staleness risk). */
function computeArbConfidence(profitPercent: number, maxUpdateGapMinutes: number): number {
  const profitScore = Math.min(70, profitPercent * 16)
  const staleness = Math.min(45, maxUpdateGapMinutes * 1.2)
  return Math.round(Math.max(5, Math.min(100, 30 + profitScore - staleness)))
}

function buildArbLegs(
  entries: { book: string; odds: number; point?: number; link?: string; lastUpdate: string }[],
  names: string[]
): { legs: ArbitrageLeg[]; impliedProbabilitySum: number; profitPercent: number; maxUpdateGapMinutes: number } | null {
  const impliedProbs = entries.map(e => impliedProbability(e.odds))
  const impliedProbabilitySum = impliedProbs.reduce((a, b) => a + b, 0)
  if (impliedProbabilitySum >= 1) return null

  const profitPercent = (1 / impliedProbabilitySum - 1) * 100
  const legs: ArbitrageLeg[] = entries.map((e, i) => ({
    selection: names[i],
    odds: e.odds,
    book: e.book,
    point: e.point,
    stakePercent: (impliedProbs[i] / impliedProbabilitySum) * 100,
    lastUpdate: e.lastUpdate,
    deepLink: e.link,
  }))

  const updateTimes = entries
    .map(e => new Date(e.lastUpdate).getTime())
    .filter(t => !Number.isNaN(t))
  const maxUpdateGapMinutes =
    updateTimes.length >= 2
      ? (Math.max(...updateTimes) - Math.min(...updateTimes)) / 60000
      : 0

  return { legs, impliedProbabilitySum, profitPercent, maxUpdateGapMinutes }
}

/**
 * Finds guaranteed-profit spots: betting every side of a market across different books where the
 * combined implied probability is under 100%, locking in a profit no matter how the game ends.
 */
export function findArbitrageOpportunities(
  events: OddsEvent[],
  minProfitPercent: number = 0.1
): ArbitrageOpportunity[] {
  const opportunities: ArbitrageOpportunity[] = []

  events.forEach(event => {
    MARKET_KINDS.forEach(kind => {
      type Entry = { book: string; odds: number; point?: number; link?: string; lastUpdate: string }
      const bestByKey: Map<string, Entry> = new Map()
      const featuredKeys = featuredOutcomeKeys(event, kind)

      event.bookmakers.forEach(bookmaker => {
        if (!isColoradoBook(bookmaker.key)) return

        collectQuotedLines(bookmaker, kind).forEach(line => {
          const key = outcomeKey(line.name, line.point)
          const existing = bestByKey.get(key)
          if (!existing || line.price > existing.odds) {
            bestByKey.set(key, {
              book: bookmaker.title,
              odds: line.price,
              point: line.point,
              link: line.link,
              lastUpdate: line.lastUpdate,
            })
          }
        })
      })

      const marketLabel = marketKindLabel(kind)

      if (kind === 'h2h') {
        if (bestByKey.size < 2) return
        const names = Array.from(bestByKey.keys())
        const entries = names.map(n => bestByKey.get(n)!)
        const built = buildArbLegs(entries, names)
        if (!built || built.profitPercent < minProfitPercent) return

        opportunities.push({
          eventId: event.id,
          homeTeam: event.home_team,
          awayTeam: event.away_team,
          market: marketLabel,
          commenceTime: event.commence_time,
          legs: built.legs,
          impliedProbabilitySum: built.impliedProbabilitySum,
          profitPercent: built.profitPercent,
          confidenceScore: computeArbConfidence(built.profitPercent, built.maxUpdateGapMinutes),
        })
        return
      }

      const processed = new Set<string>()
      bestByKey.forEach((entry, key) => {
        if (processed.has(key)) return
        const opposingKey = getOpposingArbKey(kind, key, event.home_team, event.away_team)
        if (!opposingKey || opposingKey === key) return
        const opposingEntry = bestByKey.get(opposingKey)
        if (!opposingEntry) return

        processed.add(key)
        processed.add(opposingKey)

        const [nameA] = key.split('|')
        const [nameB] = opposingKey.split('|')

        const built = buildArbLegs(
          [entry, opposingEntry],
          [formatSelectionLabel(nameA, entry.point, kind), formatSelectionLabel(nameB, opposingEntry.point, kind)]
        )
        if (!built || built.profitPercent < minProfitPercent) return

        opportunities.push({
          eventId: event.id,
          homeTeam: event.home_team,
          awayTeam: event.away_team,
          market: marketLabel,
          commenceTime: event.commence_time,
          legs: built.legs,
          impliedProbabilitySum: built.impliedProbabilitySum,
          profitPercent: built.profitPercent,
          confidenceScore: computeArbConfidence(built.profitPercent, built.maxUpdateGapMinutes),
          isAltLine: !featuredKeys.has(key) && !featuredKeys.has(opposingKey),
        })
      })
    })
  })

  return opportunities.sort((a, b) => b.profitPercent - a.profitPercent)
}

export function getEdgeClass(spread: number): string {
  if (spread >= 15) return 'edge-tag-high'
  if (spread >= 8) return 'edge-tag-medium'
  return 'edge-tag-low'
}

export function getEVColor(ev: number): string {
  if (ev >= 5) return 'text-green-400'
  if (ev >= 3) return 'text-emerald-400'
  if (ev >= 1) return 'text-yellow-400'
  return 'text-orange-400'
}
