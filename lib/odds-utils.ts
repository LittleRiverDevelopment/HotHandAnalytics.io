import { OddsEvent, LineDiscrepancy, EVBet, Outcome } from './types'

// Colorado books only (exclude Pinnacle from betting display)
const COLORADO_BOOK_KEYS = [
  'draftkings', 'fanduel', 'betmgm', 'caesars', 
  'pointsbetus', 'betrivers', 'espnbet', 'superbook', 'betfred', 'fanatics'
]

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

export function findLineDiscrepancies(events: OddsEvent[]): LineDiscrepancy[] {
  const discrepancies: LineDiscrepancy[] = []

  events.forEach(event => {
    const marketTypes = ['h2h', 'spreads', 'totals']
    
    marketTypes.forEach(marketKey => {
      const bookOddsMap: Map<string, { book: string; bookKey: string; odds: number; point?: number }[]> = new Map()
      
      event.bookmakers.forEach(bookmaker => {
        // Only include Colorado books for line shopping
        if (!isColoradoBook(bookmaker.key)) return
        
        const market = bookmaker.markets.find(m => m.key === marketKey)
        if (!market) return
        
        market.outcomes.forEach(outcome => {
          const key = outcome.point !== undefined 
            ? `${outcome.name}|${outcome.point}` 
            : outcome.name
          
          if (!bookOddsMap.has(key)) {
            bookOddsMap.set(key, [])
          }
          bookOddsMap.get(key)!.push({
            book: bookmaker.title,
            bookKey: bookmaker.key,
            odds: outcome.price,
            point: outcome.point
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
          const marketLabel = marketKey === 'h2h' ? 'Moneyline' 
            : marketKey === 'spreads' ? 'Spread' 
            : 'Total'
          
          discrepancies.push({
            eventId: event.id,
            homeTeam: event.home_team,
            awayTeam: event.away_team,
            market: marketLabel,
            betType: best.point !== undefined ? `${betType} ${best.point > 0 ? '+' : ''}${best.point}` : betType,
            bestOdds: best.odds,
            bestBook: best.book,
            worstOdds: worst.odds,
            worstBook: worst.book,
            spread,
            commenceTime: event.commence_time,
            allBookOdds: bookOdds
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
    const marketTypes = ['h2h', 'spreads', 'totals']
    
    // Find Pinnacle bookmaker for fair odds
    const pinnacle = event.bookmakers.find(b => b.key.toLowerCase() === 'pinnacle')
    
    marketTypes.forEach(marketKey => {
      // Get Pinnacle's market for fair odds calculation
      const pinnacleMarket = pinnacle?.markets.find(m => m.key === marketKey)
      
      // Build map of outcomes with their opposing outcome (for no-vig calculation)
      const pinnacleOddsMap: Map<string, { odds: number; opposingOdds: number }> = new Map()
      
      if (pinnacleMarket && pinnacleMarket.outcomes.length >= 2) {
        pinnacleMarket.outcomes.forEach((outcome, idx) => {
          const key = outcome.point !== undefined 
            ? `${outcome.name}|${outcome.point}` 
            : outcome.name
          
          // Find the opposing outcome
          const opposingIdx = idx === 0 ? 1 : 0
          const opposing = pinnacleMarket.outcomes[opposingIdx]
          
          pinnacleOddsMap.set(key, {
            odds: outcome.price,
            opposingOdds: opposing?.price || outcome.price
          })
        })
      }
      
      // Now check Colorado book odds against Pinnacle fair odds
      event.bookmakers.forEach(bookmaker => {
        // Only calculate EV for Colorado books
        if (!isColoradoBook(bookmaker.key)) return
        
        const market = bookmaker.markets.find(m => m.key === marketKey)
        if (!market) return
        
        market.outcomes.forEach(outcome => {
          const key = outcome.point !== undefined 
            ? `${outcome.name}|${outcome.point}` 
            : outcome.name
          
          const pinnacleData = pinnacleOddsMap.get(key)
          if (!pinnacleData) return
          
          // Calculate no-vig fair probability from Pinnacle
          const [fairProb] = calculateNoVigFromPair(pinnacleData.odds, pinnacleData.opposingOdds)
          
          const ev = calculateEV(outcome.price, fairProb)
          
          if (ev >= minEV) {
            const [betType] = key.split('|')
            const marketLabel = marketKey === 'h2h' ? 'Moneyline' 
              : marketKey === 'spreads' ? 'Spread' 
              : 'Total'
            
            evBets.push({
              eventId: event.id,
              homeTeam: event.home_team,
              awayTeam: event.away_team,
              market: marketLabel,
              selection: outcome.point !== undefined 
                ? `${betType} ${outcome.point > 0 ? '+' : ''}${outcome.point}` 
                : betType,
              odds: outcome.price,
              book: bookmaker.title,
              fairOdds: decimalToAmerican(1 / fairProb),
              ev,
              evPercent: ev * 100,
              kellyCriterion: calculateKellyCriterion(outcome.price, fairProb),
              commenceTime: event.commence_time
            })
          }
        })
      })
    })
  })

  return evBets.sort((a, b) => b.evPercent - a.evPercent)
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
