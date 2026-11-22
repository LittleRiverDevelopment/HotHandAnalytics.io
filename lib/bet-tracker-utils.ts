import { HistoricalBet } from './types'
import { americanToDecimal, decimalToAmerican } from './odds-utils'

export interface BetTrackerSummary {
  totalBets: number
  settledBets: number
  openBets: number
  wins: number
  losses: number
  pushes: number
  winRate: number
  totalUnitsStaked: number
  netUnits: number
  roiPercent: number
  currentStreak: { type: 'W' | 'L' | null; count: number }
  bestWin: HistoricalBet | null
  worstLoss: HistoricalBet | null
  peakUnits: number
  currentDrawdown: number
}

/** Bets in chronological order (source data is already sorted, but don't assume it). */
export function sortByDate(bets: HistoricalBet[]): HistoricalBet[] {
  return [...bets].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1
    return a.id - b.id
  })
}

export function computeSummary(bets: HistoricalBet[]): BetTrackerSummary {
  const chronological = sortByDate(bets)
  const settled = chronological.filter(b => b.status !== 'Open')
  const wins = settled.filter(b => b.status === 'W')
  const losses = settled.filter(b => b.status === 'L')
  const pushes = settled.filter(b => b.status === 'Push')
  const decisive = wins.length + losses.length

  const totalUnitsStaked = settled.reduce((sum, b) => sum + b.units, 0)
  const netUnits = settled.reduce((sum, b) => sum + (b.delta ?? 0), 0)

  let currentStreak: { type: 'W' | 'L' | null; count: number } = { type: null, count: 0 }
  for (let i = settled.length - 1; i >= 0; i--) {
    const status = settled[i].status
    if (status !== 'W' && status !== 'L') continue
    if (currentStreak.type === null) {
      currentStreak = { type: status, count: 1 }
    } else if (status === currentStreak.type) {
      currentStreak.count++
    } else {
      break
    }
  }

  let bestWin: HistoricalBet | null = null
  let worstLoss: HistoricalBet | null = null
  for (const b of settled) {
    if (b.delta === null) continue
    if (b.status === 'W' && (!bestWin || b.delta > (bestWin.delta ?? -Infinity))) bestWin = b
    if (b.status === 'L' && (!worstLoss || b.delta < (worstLoss.delta ?? Infinity))) worstLoss = b
  }

  let peakUnits = 0
  for (const b of settled) {
    if (b.cumulative !== null && b.cumulative > peakUnits) peakUnits = b.cumulative
  }
  const lastCumulative = settled.length > 0 ? (settled[settled.length - 1].cumulative ?? 0) : 0
  const currentDrawdown = peakUnits - lastCumulative

  return {
    totalBets: chronological.length,
    settledBets: settled.length,
    openBets: chronological.length - settled.length,
    wins: wins.length,
    losses: losses.length,
    pushes: pushes.length,
    winRate: decisive > 0 ? (wins.length / decisive) * 100 : 0,
    totalUnitsStaked,
    netUnits,
    roiPercent: totalUnitsStaked > 0 ? (netUnits / totalUnitsStaked) * 100 : 0,
    currentStreak,
    bestWin,
    worstLoss,
    peakUnits,
    currentDrawdown,
  }
}

/** Averages in decimal-odds space (statistically sound) then converts back to American for display. */
export function computeAverageOdds(bets: HistoricalBet[]): number {
  const decisive = bets.filter(b => b.status === 'W' || b.status === 'L')
  if (decisive.length === 0) return -110
  const avgDecimal =
    decisive.reduce((sum, b) => sum + americanToDecimal(b.odds), 0) / decisive.length
  return decimalToAmerican(avgDecimal)
}

export interface SportBreakdown {
  sport: string
  bets: number
  wins: number
  losses: number
  netUnits: number
}

export function computeSportBreakdown(bets: HistoricalBet[]): SportBreakdown[] {
  const settled = bets.filter(b => b.status !== 'Open')
  const map = new Map<string, SportBreakdown>()
  for (const b of settled) {
    const entry = map.get(b.sport) ?? { sport: b.sport, bets: 0, wins: 0, losses: 0, netUnits: 0 }
    entry.bets++
    if (b.status === 'W') entry.wins++
    if (b.status === 'L') entry.losses++
    entry.netUnits += b.delta ?? 0
    map.set(b.sport, entry)
  }
  return Array.from(map.values()).sort((a, b) => b.netUnits - a.netUnits)
}
