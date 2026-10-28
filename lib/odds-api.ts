import { OddsEvent, ScoreEvent, SportKey } from './types'
import { pruneDistantAltOutcomes, rankEventsForAltFetch } from './odds-utils'
import { readKeyOverrides } from './admin-settings'

const BASE_URL = 'https://api.the-odds-api.com/v4'
const EXHAUSTED_KEYS_STORAGE_KEY = 'hothand_exhausted_odds_keys'
const CACHE_STORAGE_KEY = 'hothand_odds_cache'
const SCORES_CACHE_STORAGE_KEY = 'hothand_scores_cache'
const ALT_CACHE_STORAGE_KEY = 'hothand_alt_odds_cache'
const INCLUDE_ALT_LINES_KEY = 'hothand_include_alt_lines'
// Scores change constantly while games are live, so cached scores go stale fast.
const SCORES_CACHE_TTL_MS = 60 * 1000

/** Alternate lines are non-featured: one event-odds call per game. Cap to protect API quota. */
export const ALT_EVENT_CAP = 4
export const ALT_LINE_MARKETS = ['alternate_spreads', 'alternate_totals']

function quotaMonth(): string {
  const now = new Date()
  return `${now.getUTCFullYear()}-${now.getUTCMonth() + 1}`
}

function keyTag(key: string): string {
  return key.slice(-8)
}

function readExhaustedKeys(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(EXHAUSTED_KEYS_STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function isKeyOutOfCredits(key: string): boolean {
  return readExhaustedKeys()[keyTag(key)] === quotaMonth()
}

function markKeyOutOfCredits(key: string): void {
  if (typeof window === 'undefined') return
  const map = readExhaustedKeys()
  map[keyTag(key)] = quotaMonth()
  try {
    localStorage.setItem(EXHAUSTED_KEYS_STORAGE_KEY, JSON.stringify(map))
  } catch {
    // Quota bookkeeping must not prevent trying the backup key.
  }
}

function markKeyHasCredits(key: string): void {
  if (typeof window === 'undefined') return
  const map = readExhaustedKeys()
  if (!map[keyTag(key)]) return
  delete map[keyTag(key)]
  try {
    localStorage.setItem(EXHAUSTED_KEYS_STORAGE_KEY, JSON.stringify(map))
  } catch {
    // A successful API response remains usable even if storage is blocked.
  }
}

/** Key 1, then key 2. A key saved in this browser replaces the matching site key. */
export function listOddsApiKeys(): string[] {
  const { keys: overrides } = readKeyOverrides()
  const primary = overrides[0] || process.env.NEXT_PUBLIC_ODDS_API_KEY || ''
  const backup = overrides[1] || process.env.NEXT_PUBLIC_ODDS_API_KEY_2 || ''
  const keys = [primary.trim(), backup.trim()].filter(Boolean)
  return keys.filter((key, index) => keys.indexOf(key) === index)
}

export function oddsKeyState(slot: 1 | 2): 'missing' | 'ready' | 'spent' {
  const saved = readKeyOverrides().keys[slot - 1]
  const site = slot === 1 ? process.env.NEXT_PUBLIC_ODDS_API_KEY : process.env.NEXT_PUBLIC_ODDS_API_KEY_2
  const key = (saved || site || '').trim()
  if (!key) return 'missing'
  return isKeyOutOfCredits(key) ? 'spent' : 'ready'
}

/** Configuration and last recorded quota flag, not a live validity check. */
export function oddsKeyDetails(slot: 1 | 2): {
  source: 'browser' | 'site' | 'none' | 'unavailable'
  state: 'missing' | 'ready' | 'spent'
} {
  const overrides = readKeyOverrides()
  const site = slot === 1 ? process.env.NEXT_PUBLIC_ODDS_API_KEY : process.env.NEXT_PUBLIC_ODDS_API_KEY_2
  return {
    source: !overrides.ok ? 'unavailable' : overrides.keys[slot - 1]
      ? 'browser' : site?.trim() ? 'site' : 'none',
    state: oddsKeyState(slot),
  }
}

function keysToTry(): string[] {
  const keys = listOddsApiKeys()
  const fresh = keys.filter(key => !isKeyOutOfCredits(key))
  return fresh.length > 0 ? fresh : keys
}

function withApiKey(pathAndQuery: string, apiKey: string): string {
  const join = pathAndQuery.includes('?') ? '&' : '?'
  return `${BASE_URL}${pathAndQuery}${join}apiKey=${encodeURIComponent(apiKey)}`
}

async function fetchWithApiKeys<T>(
  pathAndQuery: string,
  cached: { data: T; etag?: string } | null
): Promise<{
  ok: boolean
  status: number
  data: T | null
  etag?: string
  remainingRequests?: number
  notModified: boolean
  error: string | null
}> {
  const keys = keysToTry()
  if (keys.length === 0) {
    return { ok: false, status: 0, data: null, notModified: false, error: 'Odds are unavailable right now.' }
  }

  let lastStatus = 0
  let lastRemaining: number | undefined

  for (let i = 0; i < keys.length; i++) {
    const apiKey = keys[i]
    const result = await fetchJsonWithEtag<T>(withApiKey(pathAndQuery, apiKey), cached)
    lastStatus = result.status
    lastRemaining = result.remainingRequests

    if (result.status === 401) continue

    const outOfCredits = result.status === 429 || result.remainingRequests === 0
    if (outOfCredits) markKeyOutOfCredits(apiKey)
    else if (result.ok && (result.remainingRequests ?? 1) > 0) markKeyHasCredits(apiKey)

    if (result.ok && result.data) {
      return { ...result, error: null }
    }

    const anotherKey = i < keys.length - 1
    if (result.status === 429 && anotherKey) continue

    if (result.status === 429) {
      return { ...result, error: 'API rate limit exceeded' }
    }
    if (result.status === 404) {
      return { ...result, error: 'No events found for this sport' }
    }
    if (!result.ok) {
      return { ...result, error: `API error: ${result.status}` }
    }
    return { ...result, error: 'No events found for this sport' }
  }

  if (lastStatus === 401) {
    return {
      ok: false,
      status: 401,
      data: null,
      remainingRequests: lastRemaining,
      notModified: false,
      error: 'Invalid API key',
    }
  }
  return {
    ok: false,
    status: lastStatus,
    data: null,
    remainingRequests: lastRemaining,
    notModified: false,
    error: 'API rate limit exceeded',
  }
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
  etag?: string
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

function oddsCacheKey(sport: string, markets: string[]): string {
  return `${sport}-${markets.join(',')}-lnk1`
}

export function getCacheAge(sport: string): number | null {
  const entry = getCacheEntry(oddsCacheKey(sport, ['h2h', 'spreads', 'totals']))
  if (!entry) return null
  return Date.now() - entry.timestamp
}

export function hasCachedData(sport: string): boolean {
  return !!getCacheEntry(oddsCacheKey(sport, ['h2h', 'spreads', 'totals']))
}

/** Last stored featured-odds payload, if any. Used to paint immediately while a refresh is in flight. */
export function peekCachedOdds(sport: string): OddsEvent[] | null {
  return getCacheEntry(oddsCacheKey(sport, ['h2h', 'spreads', 'totals']))?.data ?? null
}

export interface ApiResponse<T> {
  data: T | null
  error: string | null
  remainingRequests?: number
  cached?: boolean
  /** True when the API returned 304 Not Modified (zero credits, reuse cache). */
  notModified?: boolean
}

function headerInt(response: Response, name: string): number | undefined {
  const raw = response.headers.get(name)
  if (raw == null || raw === '') return undefined
  const n = parseInt(raw, 10)
  return Number.isNaN(n) ? undefined : n
}

async function fetchJsonWithEtag<T>(
  url: string,
  cached: { data: T; etag?: string } | null
): Promise<{
  ok: boolean
  status: number
  data: T | null
  etag?: string
  remainingRequests?: number
  notModified: boolean
}> {
  const headers: Record<string, string> = {}
  if (cached?.etag) headers['If-None-Match'] = cached.etag

  const response = await fetch(url, { headers })
  const remainingRequests = headerInt(response, 'x-requests-remaining')
  const etag = response.headers.get('etag') || undefined

  if (response.status === 304 && cached) {
    return {
      ok: true,
      status: 304,
      data: cached.data,
      etag: etag || cached.etag,
      remainingRequests,
      notModified: true,
    }
  }

  if (!response.ok) {
    return { ok: false, status: response.status, data: null, remainingRequests, etag, notModified: false }
  }

  return {
    ok: true,
    status: response.status,
    data: (await response.json()) as T,
    etag,
    remainingRequests,
    notModified: false,
  }
}

export async function fetchOddsClient(
  sport: SportKey,
  markets: string[] = ['h2h', 'spreads', 'totals'],
  forceRefresh: boolean = false
): Promise<ApiResponse<OddsEvent[]>> {
  const cacheKey = oddsCacheKey(sport, markets)
  const cached = getCacheEntry(cacheKey)
  
  // Check cache first (unless force refresh)
  if (!forceRefresh) {
    if (cached) {
      return { 
        data: cached.data, 
        error: null, 
        remainingRequests: cached.remainingRequests,
        cached: true 
      }
    }
  }

  try {
    const marketsParam = markets.join(',')
    const bookmakers = ALL_BOOKMAKERS.join(',')
    const path = `/sports/${sport}/odds/?regions=us,us2,eu&markets=${marketsParam}&oddsFormat=american&bookmakers=${bookmakers}&includeLinks=true`
    const result = await fetchWithApiKeys<OddsEvent[]>(path, cached)

    if (!result.ok || !result.data) {
      return { data: null, error: result.error, remainingRequests: result.remainingRequests }
    }

    // Sample a few links to see what The Odds API is actually returning
    if (result.data.length > 0) {
      const firstEvent = result.data[0]
      if (firstEvent.bookmakers.length > 0) {
        const firstBook = firstEvent.bookmakers[0]
        console.log('[Odds API Links Sample]', {
          event: `${firstEvent.away_team} @ ${firstEvent.home_team}`,
          bookmaker: firstBook.title,
          bookmakerLink: firstBook.link,
          sampleMarket: firstBook.markets[0]?.key,
          marketLink: firstBook.markets[0]?.link,
          sampleOutcome: firstBook.markets[0]?.outcomes[0]?.name,
          outcomeLink: firstBook.markets[0]?.outcomes[0]?.link,
        })
      }
    }

    setCache(cacheKey, {
      data: result.data,
      timestamp: Date.now(),
      remainingRequests: result.remainingRequests,
      etag: result.etag,
    })

    return {
      data: result.data,
      error: null,
      remainingRequests: result.remainingRequests,
      cached: false,
      notModified: result.notModified,
    }
  } catch (error) {
    return { data: null, error: 'Network request failed. Check your connection and try again.' }
  }
}

interface ScoresCacheEntry {
  data: ScoreEvent[]
  timestamp: number
  etag?: string
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

  try {
    const cached = getScoresCache()[cacheKey] || null
    const result = await fetchWithApiKeys<ScoreEvent[]>(`/sports/${sport}/scores/?daysFrom=2`, cached)

    if (!result.ok || !result.data) {
      return { data: null, error: result.error, remainingRequests: result.remainingRequests }
    }

    setScoresCache(cacheKey, { data: result.data, timestamp: Date.now(), etag: result.etag })

    return {
      data: result.data,
      error: null,
      remainingRequests: result.remainingRequests,
      cached: false,
      notModified: result.notModified,
    }
  } catch (error) {
    return { data: null, error: 'Network request failed. Check your connection and try again.' }
  }
}

export async function fetchSports(): Promise<ApiResponse<{ key: string; title: string; active: boolean }[]>> {
  try {
    const result = await fetchWithApiKeys<{ key: string; title: string; active: boolean }[]>('/sports/', null)
    if (!result.ok || !result.data) {
      return { data: null, error: result.error, remainingRequests: result.remainingRequests }
    }
    return { data: result.data, error: null, remainingRequests: result.remainingRequests }
  } catch (error) {
    return { data: null, error: 'Network request failed. Check your connection and try again.' }
  }
}

export async function fetchPlayerProps(
  sport: SportKey,
  eventId: string,
  markets: string[] = ['player_points', 'player_rebounds', 'player_assists']
): Promise<ApiResponse<OddsEvent>> {
  try {
    const marketsParam = markets.join(',')
    const path = `/sports/${sport}/events/${eventId}/odds/?regions=us&markets=${marketsParam}&oddsFormat=american`
    const result = await fetchWithApiKeys<OddsEvent>(path, null)
    if (!result.ok || !result.data) {
      return { data: null, error: result.error, remainingRequests: result.remainingRequests }
    }
    return { data: result.data, error: null, remainingRequests: result.remainingRequests }
  } catch (error) {
    return { data: null, error: 'Network request failed. Check your connection and try again.' }
  }
}

export function getIncludeAltLines(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return localStorage.getItem(INCLUDE_ALT_LINES_KEY) === '1'
  } catch {
    return false
  }
}

export function setIncludeAltLines(on: boolean): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(INCLUDE_ALT_LINES_KEY, on ? '1' : '0')
  } catch {
    // The current page can still use the preference without persisting it.
  }
}

interface AltCacheEntry {
  data: OddsEvent
  timestamp: number
  remainingRequests?: number
  etag?: string
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

  try {
    const marketsParam = ALT_LINE_MARKETS.join(',')
    const bookmakers = ALL_BOOKMAKERS.join(',')
    const path = `/sports/${sport}/events/${eventId}/odds/?regions=us,us2,eu&markets=${marketsParam}&oddsFormat=american&bookmakers=${bookmakers}`
    const cached = getAltCache()[key] || null
    const result = await fetchWithApiKeys<OddsEvent>(path, cached)

    if (!result.ok || !result.data) {
      return { data: null, error: result.error, remainingRequests: result.remainingRequests }
    }

    setAltCacheEntry(key, {
      data: result.data,
      timestamp: Date.now(),
      remainingRequests: result.remainingRequests,
      etag: result.etag,
    })
    return {
      data: result.data,
      error: null,
      remainingRequests: result.remainingRequests,
      cached: false,
      notModified: result.notModified,
    }
  } catch (error) {
    return { data: null, error: 'Network request failed. Check your connection and try again.' }
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
