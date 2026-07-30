import { HistoricalBet } from './types'

// Publicly viewable ("Anyone with the link can view") Google Sheet — the "Bets" tab.
// Google serves the CSV export with `Access-Control-Allow-Origin: *` on the final
// (post-redirect) response, so this can be fetched directly from the browser without
// a backend proxy.
const SHEET_ID = '17t5PucX0lRRI--28lau67isWQtSvSwn3a9BgcEdP3W4'
const SHEET_GID = '1501232229'
const SHEET_CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${SHEET_GID}`

const CACHE_STORAGE_KEY = 'hothand_bet_sheet_cache'
// The sheet updates at most a handful of times a day — a short TTL just avoids
// refetching on every tab switch/re-render.
const CACHE_TTL_MS = 5 * 60 * 1000

// The sheet only records month/day (e.g. "Jan 26"); the year is inferred by starting
// at this anchor and rolling forward whenever the month number decreases (e.g. Dec -> Jan).
const TRACKER_START_YEAR = 2026

interface BetSheetCache {
  timestamp: number
  data: HistoricalBet[]
}

export interface BetSheetResult {
  data: HistoricalBet[] | null
  error: string | null
  cached: boolean
  lastSynced: number | null
}

function getCache(): BetSheetCache | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(CACHE_STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as BetSheetCache
  } catch {
    return null
  }
}

function setCache(data: HistoricalBet[]) {
  if (typeof window === 'undefined') return
  try {
    const cache: BetSheetCache = { timestamp: Date.now(), data }
    window.localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(cache))
  } catch {
    // localStorage full/unavailable — ignore, we'll just refetch next time
  }
}

// Minimal RFC4180-ish CSV parser: handles quoted fields with embedded commas/newlines
// and "" escaped quotes (needed for multi-line bet descriptions in the sheet export).
function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  let i = 0
  while (i < text.length) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i += 2
          continue
        }
        inQuotes = false
        i++
        continue
      }
      field += c
      i++
      continue
    }
    if (c === '"') {
      inQuotes = true
      i++
      continue
    }
    if (c === ',') {
      row.push(field)
      field = ''
      i++
      continue
    }
    if (c === '\r') {
      i++
      continue
    }
    if (c === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
      i++
      continue
    }
    field += c
    i++
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows
}

const MONTHS: Record<string, number> = {
  Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, June: 6,
  Jul: 7, July: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12,
}

function cleanDescription(desc: string): string {
  return desc
    .replace(/\r\n|\r|\n/g, ' • ')
    .replace(/✅/g, '')
    .replace(/\s+•/g, ' •')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .replace(/[•+]\s*$/, '')
    .trim()
}

/**
 * Parses the raw "Bets" sheet CSV export into HistoricalBet[]. `delta`/`cumulative`
 * are derived from the sheet's own running-total column (not recomputed from odds),
 * so results reflect real settlement including any manual adjustments like partial
 * cash-outs.
 */
export function parseBetSheetCsv(csvText: string): HistoricalBet[] {
  const rows = parseCsv(csvText)
  const dataRows = rows.slice(1).filter(r => r.some(c => c.trim() !== ''))

  let year = TRACKER_START_YEAR
  let lastMonth = 0
  let cumulative = 0

  const bets: HistoricalBet[] = []

  for (const cols of dataRows) {
    const [dateLabel, descRaw, sportRaw, bookRaw, unitsRaw, oddsRaw, statusRaw, wlRaw, runningRaw, tailLinkRaw] = cols
    if (!dateLabel || !dateLabel.trim()) continue // trailing blank template rows

    const [monLabel, dayLabel] = dateLabel.trim().split(/\s+/)
    const month = MONTHS[monLabel]
    if (!month || !dayLabel) continue
    if (month < lastMonth) year += 1
    lastMonth = month

    const units = parseFloat(unitsRaw)
    const odds = parseInt(oddsRaw, 10)
    if (Number.isNaN(units) || Number.isNaN(odds)) continue // skip malformed rows

    const date = `${year}-${String(month).padStart(2, '0')}-${dayLabel.padStart(2, '0')}`
    const description = cleanDescription(descRaw || '')
    let sport = (sportRaw || '').trim()
    if (sport === 'ML') sport = 'MLB' // data-entry slip seen in the sheet (e.g. "All-Star NRFI")
    const book = (bookRaw || '').trim()
    const statusText = (statusRaw || '').trim()
    const wl = !wlRaw || wlRaw.trim() === '' ? null : parseFloat(wlRaw)
    const running = !runningRaw || runningRaw.trim() === '' ? null : parseFloat(runningRaw)
    const tailLink = (tailLinkRaw || '').trim() || undefined
    const isOpen = statusText === 'Open' && wl === null && running === null

    let delta: number | null = null
    let cumulativeAfter = cumulative

    if (isOpen) {
      delta = null
      cumulativeAfter = cumulative
    } else if (running !== null) {
      delta = Math.round((running - cumulative) * 1000) / 1000
      cumulativeAfter = running
      cumulative = running
    } else if (wl !== null) {
      delta = wl
      cumulativeAfter = Math.round((cumulative + wl) * 1000) / 1000
      cumulative = cumulativeAfter
    }

    let status: HistoricalBet['status']
    if (isOpen) status = 'Open'
    else if (delta === null) status = 'Push'
    else if (delta > 0) status = 'W'
    else if (delta < 0) status = 'L'
    else status = 'Push'

    bets.push({
      id: bets.length + 1,
      date,
      description,
      sport,
      book,
      units,
      odds,
      status,
      delta,
      cumulative: isOpen ? null : cumulativeAfter,
      tailLink,
    })
  }

  return bets
}

export async function fetchBetHistoryFromSheet(forceRefresh: boolean = false): Promise<BetSheetResult> {
  if (!forceRefresh) {
    const cached = getCache()
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return { data: cached.data, error: null, cached: true, lastSynced: cached.timestamp }
    }
  }

  try {
    const res = await fetch(SHEET_CSV_URL, { cache: 'no-store' })
    if (!res.ok) throw new Error(`Sheet responded with ${res.status}`)
    const text = await res.text()
    const data = parseBetSheetCsv(text)
    if (data.length === 0) throw new Error('Sheet returned no rows')
    setCache(data)
    return { data, error: null, cached: false, lastSynced: Date.now() }
  } catch (err) {
    const cached = getCache()
    const message = err instanceof Error ? err.message : 'Failed to sync sheet'
    if (cached) {
      return { data: cached.data, error: message, cached: true, lastSynced: cached.timestamp }
    }
    return { data: null, error: message, cached: false, lastSynced: null }
  }
}
