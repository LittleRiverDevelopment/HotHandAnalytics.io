import { OddsEvent, SportKey } from './types'

const BASE_URL = 'https://api.the-odds-api.com/v4'
const API_KEY_STORAGE_KEY = 'hothand_odds_api_key'
const CACHE_STORAGE_KEY = 'hothand_odds_cache'

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
  const entry = getCacheEntry(`${sport}-h2h,spreads,totals`)
  if (!entry) return null
  return Date.now() - entry.timestamp
}

export function hasCachedData(sport: string): boolean {
  return !!getCacheEntry(`${sport}-h2h,spreads,totals`)
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
  const cacheKey = `${sport}-${markets.join(',')}`
  
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
    const url = `${BASE_URL}/sports/${sport}/odds/?apiKey=${apiKey}&regions=us,us2,eu&markets=${marketsParam}&oddsFormat=american&bookmakers=${bookmakers}`
    
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
