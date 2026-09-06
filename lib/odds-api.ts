import { OddsEvent, ScoreEvent, SportKey } from './types'
import { pruneDistantAltOutcomes, rankEventsForAltFetch } from './odds-utils'

const BASE_URL = 'https://api.the-odds-api.com/v4'
const API_KEY_STORAGE_KEY = 'hothand_odds_api_key'
const CACHE_STORAGE_KEY = 'hothand_odds_cache'
const SCORES_CACHE_STORAGE_KEY = 'hothand_scores_cache'
const ALT_CACHE_STORAGE_KEY = 'hothand_alt_odds_cache'
const INCLUDE_ALT_LINES_KEY = 'hothand_include_alt_lines'
// Scores change constantly while games are live, so cached scores go stale fast.
const SCORES_CACHE_TTL_MS = 60 * 1000

/** Alternate lines are non-featured: one event-odds call per game. Cap to protect API quota. */
export const ALT_EVENT_CAP = 4
export const ALT_LINE_MARKETS = ['alternate_spreads', 'alternate_totals']

function getApiKey(): string | null {
  if (typeof window === 'undefined') return null
  const storedKey = localStorage.getItem(API_KEY_STORAGE_KEY)
  if (storedKey) return storedKey
  return process.env.NEXT_PUBLIC_ODDS_API_KEY || null
}

// Colorado-legal sportsbooks + Pinnacle for fair odds
const ALL_BOOKMAKERS = [
  'draftkings',
  'fanduel', 
  'betmgm',
  'caesars',
  'pointsbetus',
  'betrivers',
  'pinnacle'
]

// Persistent cache in localStorage
interface CacheEntry {
  data: OddsEvent[]
  timestamp: number
  remainingRequests?: number
}

interface CacheStore {
  [key: string]: CacheEntry
}

function getCache(): CacheStore {
  if (typeof window === 'undefined') return {}
  try {
    const stored = localStorage.getItem(CACHE_STORAGE_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}

function setCache(key: string, entry: CacheEntry): void {
  if (typeof window === 'undefined') return
  try {
    const cache = getCache()
    cache[key] = entry
    localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(cache))
  } catch {
    // localStorage full or unavailable
  }
}

function getCacheEntry(key: string): CacheEntry | null {
  const cache = getCache()
  return cache[key] || null
}

export function getCacheAge(sport: string): number | null {
  const entry = getCacheEntry(`${sport}-h2h,spreads,totals-lnk1`)
  if (!entry) return null
  return Date.now() - entry.timestamp
}

export function hasCachedData(sport: string): boolean {
  return !!getCacheEntry(`${sport}-h2h,spreads,totals-lnk1`)
}

export interface ApiResponse<T> {
  data: T | null
  error: string | null
  remainingRequests?: number
  cached?: boolean
}

export async function fetchOddsClient(
  sport: SportKey,
  markets: string[] = ['h2h', 'spreads', 'totals'],
  forceRefresh: boolean = false
): Promise<ApiResponse<OddsEvent[]>> {
  const cacheKey = `${sport}-${markets.join(',')}-lnk1`
  
  // Check cache first (unless force refresh)
  if (!forceRefresh) {
    const cached = getCacheEntry(cacheKey)
    if (cached) {
      return { 
        data: cached.data, 
        error: null, 
        remainingRequests: cached.remainingRequests,
        cached: true 
      }
    }
  }

  const apiKey = getApiKey()
  
  if (!apiKey) {
    return { data: null, error: 'API key not configured. Add your key in Settings.' }
  }

  try {
    const marketsParam = markets.join(',')
    const bookmakers = ALL_BOOKMAKERS.join(',')
    const url = `${BASE_URL}/sports/${sport}/odds/?apiKey=${apiKey}&regions=us,us2,eu&markets=${marketsParam}&oddsFormat=american&bookmakers=${bookmakers}&includeLinks=true`
    
    const response = await fetch(url)

    if (!response.ok) {
      if (response.status === 401) {
        return { data: null, error: 'Invalid API key' }
      }
      if (response.status === 429) {
        return { data: null, error: 'API rate limit exceeded' }
      }
      if (response.status === 404) {
        return { data: null, error: 'No events found for this sport' }
      }
      return { data: null, error: `API error: ${response.status}` }
    }

    const remainingRequests = parseInt(response.headers.get('x-requests-remaining') || '0')
    const data: OddsEvent[] = await response.json()

    // Update persistent cache
    setCache(cacheKey, { data, timestamp: Date.now(), remainingRequests })

    return { data, error: null, remainingRequests, cached: false }
  } catch (error) {
    return { data: null, error: `Network error: ${error}` }
  }
}

interface ScoresCacheEntry {
  data: ScoreEvent[]
  timestamp: number
}

interface ScoresCacheStore {
  [key: string]: ScoresCacheEntry
}

function getScoresCache(): ScoresCacheStore {
  if (typeof window === 'undefined') return {}
  try {
    const stored = localStorage.getItem(SCORES_CACHE_STORAGE_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}

function setScoresCache(key: string, entry: ScoresCacheEntry): void {
  if (typeof window === 'undefined') return
  try {
    const cache = getScoresCache()
    cache[key] = entry
    localStorage.setItem(SCORES_CACHE_STORAGE_KEY, JSON.stringify(cache))
  } catch {
    // localStorage full or unavailable
  }
}

/**
 * Live/recent scores for a sport. Uses The Odds API `/scores` endpoint, which
 * returns in-progress and completed games from the last `daysFrom` days.
 * Cached briefly since scores are only refreshed on demand (no polling).
 */
export async function fetchScoresClient(
  sport: SportKey,
  forceRefresh: boolean = false
): Promise<ApiResponse<ScoreEvent[]>> {
  const cacheKey = sport

  if (!forceRefresh) {
    const cached = getScoresCache()[cacheKey]
    if (cached && Date.now() - cached.timestamp < SCORES_CACHE_TTL_MS) {
      return { data: cached.data, error: null, cached: true }
    }
  }

  const apiKey = getApiKey()

  if (!apiKey) {
    return { data: null, error: 'API key not configured' }
  }

  try {
    const url = `${BASE_URL}/sports/${sport}/scores/?apiKey=${apiKey}&daysFrom=2`
    const response = await fetch(url)

    if (!response.ok) {
      return { data: null, error: `API error: ${response.status}` }
    }

    const remainingRequests = parseInt(response.headers.get('x-requests-remaining') || '0')
    const data: ScoreEvent[] = await response.json()

    setScoresCache(cacheKey, { data, timestamp: Date.now() })

    return { data, error: null, remainingRequests, cached: false }
  } catch (error) {
    return { data: null, error: `Network error: ${error}` }
  }
}

export async function fetchSports(): Promise<ApiResponse<{ key: string; title: string; active: boolean }[]>> {
  const apiKey = getApiKey()
  
  if (!apiKey) {
    return { data: null, error: 'API key not configured' }
  }

  try {
    const url = `${BASE_URL}/sports/?apiKey=${apiKey}`
    const response = await fetch(url)

    if (!response.ok) {
      return { data: null, error: `API error: ${response.status}` }
    }

    const data = await response.json()
    return { data, error: null }
  } catch (error) {
    return { data: null, error: `Network error: ${error}` }
  }
}

export async function fetchPlayerProps(
  sport: SportKey,
  eventId: string,
  markets: string[] = ['player_points', 'player_rebounds', 'player_assists']
): Promise<ApiResponse<OddsEvent>> {
  const apiKey = getApiKey()
  
  if (!apiKey) {
    return { data: null, error: 'API key not configured' }
  }

  try {
    const marketsParam = markets.join(',')
    const url = `${BASE_URL}/sports/${sport}/events/${eventId}/odds/?apiKey=${apiKey}&regions=us&markets=${marketsParam}&oddsFormat=american`
    
    const response = await fetch(url)

    if (!response.ok) {
      return { data: null, error: `API error: ${response.status}` }
    }

    const data: OddsEvent = await response.json()
    return { data, error: null }
  } catch (error) {
    return { data: null, error: `Network error: ${error}` }
  }
}

export function getIncludeAltLines(): boolean {
  if (typeof window === 'undefined') return false
  const stored = localStorage.getItem(INCLUDE_ALT_LINES_KEY)
  return stored === '1'
}

export function setIncludeAltLines(on: boolean): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(INCLUDE_ALT_LINES_KEY, on ? '1' : '0')
}

interface AltCacheEntry {
  data: OddsEvent
  timestamp: number
  remainingRequests?: number
}

function getAltCache(): Record<string, AltCacheEntry> {
  if (typeof window === 'undefined') return {}
  try {
    const stored = localStorage.getItem(ALT_CACHE_STORAGE_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}

function setAltCacheEntry(key: string, entry: AltCacheEntry): void {
  if (typeof window === 'undefined') return
  try {
    const cache = getAltCache()
    cache[key] = entry
    localStorage.setItem(ALT_CACHE_STORAGE_KEY, JSON.stringify(cache))
  } catch {
    // localStorage full or unavailable
  }
}

function altCacheKey(sport: string, eventId: string): string {
  return `${sport}-${eventId}-alt-lnk1`
}

export function mergeEventMarkets(base: OddsEvent, extra: OddsEvent): OddsEvent {
  const books = new Map(
    base.bookmakers.map(b => [b.key, { ...b, markets: [...b.markets] }])
  )

  for (const book of extra.bookmakers) {
    const existing = books.get(book.key)
    if (!existing) {
      books.set(book.key, { ...book, markets: [...(book.markets || [])] })
      continue
    }
    for (const market of book.markets || []) {
      const idx = existing.markets.findIndex(m => m.key === market.key)
      if (idx >= 0) existing.markets[idx] = market
      else existing.markets.push(market)
    }
  }

  return { ...base, bookmakers: Array.from(books.values()) }
}

function pickEventsForAltFetch(events: OddsEvent[], scores?: ScoreEvent[]): OddsEvent[] {
  return rankEventsForAltFetch(events, ALT_EVENT_CAP, scores)
}

async function fetchEventAltLines(
  sport: SportKey,
  eventId: string,
  forceRefresh: boolean
): Promise<ApiResponse<OddsEvent>> {
  const key = altCacheKey(sport, eventId)

  if (!forceRefresh) {
    const cached = getAltCache()[key]
    if (cached) {
      return {
        data: cached.data,
        error: null,
        remainingRequests: cached.remainingRequests,
        cached: true,
      }
    }
    // Don't spend credits unless the user explicitly refreshes.
    return { data: null, error: null }
  }

  const apiKey = getApiKey()
  if (!apiKey) {
    return { data: null, error: 'API key not configured' }
  }

  try {
    const marketsParam = ALT_LINE_MARKETS.join(',')
    const bookmakers = ALL_BOOKMAKERS.join(',')
    const url = `${BASE_URL}/sports/${sport}/events/${eventId}/odds/?apiKey=${apiKey}&regions=us,us2,eu&markets=${marketsParam}&oddsFormat=american&bookmakers=${bookmakers}`
    const response = await fetch(url)

    if (!response.ok) {
      return { data: null, error: `API error: ${response.status}` }
    }

    const remainingRequests = parseInt(response.headers.get('x-requests-remaining') || '0')
    const data: OddsEvent = await response.json()
    setAltCacheEntry(key, { data, timestamp: Date.now(), remainingRequests })
    return { data, error: null, remainingRequests, cached: false }
  } catch (error) {
    return { data: null, error: `Network error: ${error}` }
  }
}

async function mapPool<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let next = 0

  async function worker() {
    while (next < items.length) {
      const i = next++
      results[i] = await fn(items[i])
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker())
  await Promise.all(workers)
  return results
}

export interface AltLinesAttachResult {
  events: OddsEvent[]
  remainingRequests?: number
  altGames: number
  altFetched: number
  altCached: number
}

/**
 * Fetches alternate_spreads / alternate_totals per upcoming or live event (Odds API
 * non-featured markets) and merges them onto the featured-odds events. Uses its own
 * localStorage cache.
 */
export async function attachAltLines(
  sport: SportKey,
  events: OddsEvent[],
  forceRefresh: boolean = false,
  scores?: ScoreEvent[]
): Promise<AltLinesAttachResult> {
  const targets = pickEventsForAltFetch(events, scores)
  if (targets.length === 0) {
    return { events, altGames: 0, altFetched: 0, altCached: 0 }
  }

  let remainingRequests: number | undefined
  let altFetched = 0
  let altCached = 0
  const mergedById = new Map(events.map(e => [e.id, e]))

  const results = await mapPool(targets, 4, async event => {
    const result = await fetchEventAltLines(sport, event.id, forceRefresh)
    return { event, result }
  })

  for (const { event, result } of results) {
    if (result.remainingRequests !== undefined) remainingRequests = result.remainingRequests
    if (!result.data) continue
    if (result.cached) altCached++
    else altFetched++
    const current = mergedById.get(event.id) || event
    mergedById.set(event.id, mergeEventMarkets(current, result.data))
  }

  const merged = pruneDistantAltOutcomes(events.map(e => mergedById.get(e.id) || e))

  return {
    events: merged,
    remainingRequests,
    altGames: altFetched + altCached,
    altFetched,
    altCached,
  }
}
