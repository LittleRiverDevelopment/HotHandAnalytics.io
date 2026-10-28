import { SPORTSBOOKS } from '@/lib/types'

/** Default entry URLs (responsive on most phones; not game-specific). */
export const SPORTSBOOK_HOME_URLS: Record<string, string> = {
  draftkings: 'https://sportsbook.draftkings.com/',
  fanduel: 'https://sportsbook.fanduel.com/',
  betmgm: 'https://sports.betmgm.com/',
  williamhill_us: 'https://www.caesars.com/sportsbook-and-casino/',
  betrivers: 'https://www.betrivers.com/',
  fanatics: 'https://sportsbook.fanatics.com/',
  espnbet: 'https://www.thescore.bet/',
  ballybet: 'https://www.ballybet.com/',
  polymarket: 'https://polymarket.com/',
}

/**
 * Optional paths that land closer to the sports lobby on small screens.
 * Any book omitted here uses `SPORTSBOOK_HOME_URLS` (still mobile-friendly).
 */
export const SPORTSBOOK_MOBILE_URLS: Partial<Record<string, string>> = {
  betmgm: 'https://sports.betmgm.com/en/sports',
  williamhill_us: 'https://www.caesars.com/sportsbook-and-casino/sports',
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
  if (t.includes('caesars') || t.includes('williamhill')) return 'williamhill_us'
  if (t.includes('betrivers') || t.includes('rivers')) return 'betrivers'
  if (t.includes('fanatics')) return 'fanatics'
  if (t.includes('espn') || t.includes('thescore') || t.includes('the score')) return 'espnbet'
  if (t.includes('bally')) return 'ballybet'
  if (t.includes('polymarket')) return 'polymarket'
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

/**
 * Attempts to enhance a deep link for better bet slip integration.
 * Note: Most sportsbooks don't support URL-based bet slip population in their public APIs.
 * This function preserves any existing deep links from The Odds API and adds minimal
 * enhancement where safe to do so.
 */
export function enhanceDeepLink(
  bookTitle: string,
  deepLink: string | null | undefined,
  opts?: {
    eventId?: string
    market?: string
    selection?: string
  }
): string | null {
  // If we have a deep link from The Odds API, use it as-is
  // These are the most reliable and up-to-date links available
  if (deepLink?.trim() && /^https?:\/\//i.test(deepLink.trim())) {
    return deepLink.trim()
  }

  // No reliable way to construct bet-slip-populating URLs without official API support
  // Return null to fall back to homepage
  return null
}
