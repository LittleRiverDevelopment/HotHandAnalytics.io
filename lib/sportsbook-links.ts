import { SPORTSBOOKS } from '@/lib/types'

/** Desktop entry URLs (not deep-linked to a specific game). */
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

/** Map API book display title → home URL, or null if unknown. */
export function getSportsbookHomeUrlFromTitle(bookTitle: string): string | null {
  const t = bookTitle.trim().toLowerCase()
  for (const { key, name } of SPORTSBOOKS) {
    if (name.toLowerCase() === t || key.toLowerCase() === t) {
      return SPORTSBOOK_HOME_URLS[key] ?? null
    }
  }
  if (t.includes('draftkings')) return SPORTSBOOK_HOME_URLS.draftkings
  if (t.includes('fanduel')) return SPORTSBOOK_HOME_URLS.fanduel
  if (t.includes('betmgm')) return SPORTSBOOK_HOME_URLS.betmgm
  if (t.includes('caesars')) return SPORTSBOOK_HOME_URLS.caesars
  if (t.includes('pointsbet')) return SPORTSBOOK_HOME_URLS.pointsbetus
  if (t.includes('betrivers') || t.includes('rivers')) return SPORTSBOOK_HOME_URLS.betrivers
  if (t.includes('espn')) return SPORTSBOOK_HOME_URLS.espnbet
  if (t.includes('superbook')) return SPORTSBOOK_HOME_URLS.superbook
  if (t.includes('betfred')) return SPORTSBOOK_HOME_URLS.betfred
  if (t.includes('fanatics')) return SPORTSBOOK_HOME_URLS.fanatics
  return null
}
