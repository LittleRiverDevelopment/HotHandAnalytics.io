import { LineDiscrepancy, EVBet, HistoricalBet, ArbitrageOpportunity } from '@/lib/types'
import { formatOdds } from '@/lib/odds-utils'

function escapeCsvCell(value: string | number): string {
  const s = String(value)
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function rowsToCsv(rows: (string | number)[][]): string {
  return rows.map(row => row.map(escapeCsvCell).join(',')).join('\r\n')
}

export function downloadCsv(filename: string, rows: (string | number)[][]) {
  const csv = rowsToCsv(rows)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function lineDiscrepanciesToCsvRows(rows: LineDiscrepancy[]): (string | number)[][] {
  const header = [
    'Away',
    'Home',
    'Market',
    'Bet',
    'BestOdds',
    'BestBook',
    'WorstOdds',
    'WorstBook',
    'Edge',
    'Confidence',
    'BestDeepLink',
    'WorstDeepLink',
    'AltLine',
    'CommenceTime',
  ]
  const body = rows.map(d => [
    d.awayTeam,
    d.homeTeam,
    d.market,
    d.betType,
    d.bestOdds,
    d.bestBook,
    d.worstOdds,
    d.worstBook,
    d.spread,
    d.confidenceScore,
    d.bestDeepLink ?? '',
    d.worstDeepLink ?? '',
    d.isAltLine ? 'Y' : '',
    d.commenceTime,
  ])
  return [header, ...body]
}

export function evBetsToCsvRows(rows: EVBet[]): (string | number)[][] {
  const header = [
    'Away',
    'Home',
    'Market',
    'Selection',
    'Odds',
    'FairOdds',
    'PinnacleLastUpdate',
    'EVPercent',
    'Confidence',
    'Kelly',
    'Book',
    'BookDeepLink',
    'AltLine',
    'CommenceTime',
  ]
  const body = rows.map(b => [
    b.awayTeam,
    b.homeTeam,
    b.market,
    b.selection,
    b.odds,
    b.fairOdds,
    b.pinnacleLastUpdate,
    b.evPercent.toFixed(2),
    b.confidenceScore,
    b.kellyCriterion.toFixed(4),
    b.book,
    b.bookDeepLink ?? '',
    b.isAltLine ? 'Y' : '',
    b.commenceTime,
  ])
  return [header, ...body]
}

export function arbitrageToCsvRows(rows: ArbitrageOpportunity[]): (string | number)[][] {
  const header = [
    'Away',
    'Home',
    'Market',
    'ProfitPercent',
    'Confidence',
    'ImpliedProbSum',
    'Legs',
    'AltLine',
    'CommenceTime',
  ]
  const body = rows.map(a => [
    a.awayTeam,
    a.homeTeam,
    a.market,
    a.profitPercent.toFixed(2),
    a.confidenceScore,
    (a.impliedProbabilitySum * 100).toFixed(2),
    a.legs
      .map(l => `${l.selection} @ ${formatOdds(l.odds)} (${l.book}, ${l.stakePercent.toFixed(1)}% stake)`)
      .join(' | '),
    a.isAltLine ? 'Y' : '',
    a.commenceTime,
  ])
  return [header, ...body]
}

export function betHistoryToCsvRows(rows: HistoricalBet[]): (string | number)[][] {
  const header = [
    'Date',
    'Description',
    'Sport',
    'Book',
    'Units',
    'Odds',
    'Status',
    'UnitsWL',
    'RunningTotal',
    'TailLink',
  ]
  const body = rows.map(b => [
    b.date,
    b.description,
    b.sport,
    b.book,
    b.units,
    b.odds,
    b.status,
    b.delta ?? '',
    b.cumulative ?? '',
    b.tailLink ?? '',
  ])
  return [header, ...body]
}
