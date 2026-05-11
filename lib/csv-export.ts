import { LineDiscrepancy, EVBet } from '@/lib/types'

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
    b.commenceTime,
  ])
  return [header, ...body]
}
