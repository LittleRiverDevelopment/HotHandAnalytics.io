import { SPORTSBOOKS } from '@/lib/types'

/** Default entry URLs (responsive on most phones; not game-specific). */
export const SPORTSBOOK_HOME_URLS: Record<string, string> = {
  draftkings: 'https://sportsbook.draftkings.com/',
  fanduel: 'https://sportsbook.fanduel.com/',
  betmgm: 'https://sports.betmgm.com/',
  caesars: 'https://www.caesars.com/sportsbook-and-casino/',
  pointsbetus: 'https://pointsbet.com/',
  betrivers: 'https://www.betrivers.com/',
  espnbet: 'https://espnbet.com/',
  superbook: 'https://superbook.com/',
  betfred: 'https://betfred.com/sports',
  fanatics: 'https://sportsbook.fanatics.com/',
}

/**
 * Optional paths that land closer to the sports lobby on small screens.
 * Any book omitted here uses `SPORTSBOOK_HOME_URLS` (still mobile-friendly).
 */
export const SPORTSBOOK_MOBILE_URLS: Partial<Record<string, string>> = {
  betmgm: 'https://sports.betmgm.com/en/sports',
  caesars: 'https://www.caesars.com/sportsbook-and-casino/sports',
}

export function resolveSportsbookKey(bookTitle: string): string | null {
  const t = bookTitle.trim().toLowerCase()
  for (const { key, name } of SPORTSBOOKS) {
    if (name.toLowerCase() === t || key.toLowerCase() === t) {
      return key
    }
  }
  if (t.includes('draftkings')) return 'draftkings'
  if (t.includes('fanduel')) return 'fanduel'
  if (t.includes('betmgm')) return 'betmgm'
  if (t.includes('caesars')) return 'caesars'
  if (t.includes('pointsbet')) return 'pointsbetus'
  if (t.includes('betrivers') || t.includes('rivers')) return 'betrivers'
  if (t.includes('espn')) return 'espnbet'
  if (t.includes('superbook')) return 'superbook'
  if (t.includes('betfred')) return 'betfred'
  if (t.includes('fanatics')) return 'fanatics'
  return null
}

export function getSportsbookHomeUrlFromTitle(
  bookTitle: string,
  opts?: { mobile?: boolean }
): string | null {
  const key = resolveSportsbookKey(bookTitle)
  if (!key) return null
  if (opts?.mobile) {
    return SPORTSBOOK_MOBILE_URLS[key] ?? SPORTSBOOK_HOME_URLS[key] ?? null
  }
  return SPORTSBOOK_HOME_URLS[key] ?? null
}
