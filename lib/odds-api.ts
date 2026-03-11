import { OddsEvent, SportKey } from './types'

const API_KEY = process.env.ODDS_API_KEY
const BASE_URL = 'https://api.the-odds-api.com/v4'

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

// Server-side cache to reduce API calls
interface CacheEntry {
  data: OddsEvent[]
  timestamp: number
  remainingRequests?: number
}

const cache: Map<string, CacheEntry> = new Map()
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

export interface ApiResponse<T> {
  data: T | null
  error: string | null
  remainingRequests?: number
  cached?: boolean
}

export async function fetchOdds(
  sport: SportKey,
  markets: string[] = ['h2h', 'spreads', 'totals'],
  forceRefresh: boolean = false
): Promise<ApiResponse<OddsEvent[]>> {
  if (!API_KEY) {
    return { data: null, error: 'ODDS_API_KEY not configured' }
  }

  const cacheKey = `${sport}-${markets.join(',')}`
  
  // Check cache first (unless force refresh)
  if (!forceRefresh) {
    const cached = cache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
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
    // Use us2 region which includes more books, and bookmakers param filters to what we want
    const url = `${BASE_URL}/sports/${sport}/odds/?apiKey=${API_KEY}&regions=us,us2,eu&markets=${marketsParam}&oddsFormat=american&bookmakers=${bookmakers}`
    
    const response = await fetch(url, {
      cache: 'no-store' // We handle caching ourselves
    })

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

    // Update cache
    cache.set(cacheKey, { data, timestamp: Date.now(), remainingRequests })

    return { data, error: null, remainingRequests, cached: false }
  } catch (error) {
    return { data: null, error: `Network error: ${error}` }
  }
}

export async function fetchSports(): Promise<ApiResponse<{ key: string; title: string; active: boolean }[]>> {
  if (!API_KEY) {
    return { data: null, error: 'ODDS_API_KEY not configured' }
  }

  try {
    const url = `${BASE_URL}/sports/?apiKey=${API_KEY}`
    const response = await fetch(url, {
      next: { revalidate: 3600 }
    })

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
  if (!API_KEY) {
    return { data: null, error: 'ODDS_API_KEY not configured' }
  }

  try {
    const marketsParam = markets.join(',')
    const url = `${BASE_URL}/sports/${sport}/events/${eventId}/odds/?apiKey=${API_KEY}&regions=us&markets=${marketsParam}&oddsFormat=american`
    
    const response = await fetch(url, {
      next: { revalidate: 60 }
    })

    if (!response.ok) {
      return { data: null, error: `API error: ${response.status}` }
    }

    const data: OddsEvent = await response.json()
    return { data, error: null }
  } catch (error) {
    return { data: null, error: `Network error: ${error}` }
  }
}
