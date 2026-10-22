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

const SELECTION_ID = /^[A-Za-z0-9._~+/=#-]+$/

function parseHttpUrl(value: string | null | undefined): URL | null {
  const trimmed = value?.trim()
  if (!trimmed) return null
  try {
    const url = new URL(trimmed)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    return url
  } catch {
    return null
  }
}

function hostEndsWith(url: URL, domain: string): boolean {
  return url.hostname === domain || url.hostname.endsWith(`.${domain}`)
}

function selectionIds(raw: string | null, separator: RegExp): string[] | null {
  if (!raw) return null
  const ids = raw.split(separator).map(part => part.trim()).filter(Boolean)
  if (ids.length === 0 || ids.some(id => !SELECTION_ID.test(id))) return null
  return ids
}

function fanDuelLeg(url: URL): { marketId: string; selectionId: string } | null {
  if (!hostEndsWith(url, 'fanduel.com')) return null
  const marketId = url.searchParams.get('marketId') ?? url.searchParams.get('marketId[0]')
  const selectionId = url.searchParams.get('selectionId') ?? url.searchParams.get('selectionId[0]')
  if (!marketId || !selectionId) return null
  if (!SELECTION_ID.test(marketId) || !SELECTION_ID.test(selectionId)) return null
  return { marketId, selectionId }
}

function draftKingsLeg(url: URL): { eventId: string | null; outcomes: string[] } | null {
  if (!hostEndsWith(url, 'draftkings.com')) return null
  const outcomes = selectionIds(url.searchParams.get('outcomes'), /[+,]/) ?? []
  const parts = url.pathname.split('/').filter(Boolean)
  const eventIdx = parts.indexOf('event')
  let eventId: string | null = null
  if (eventIdx >= 0) {
    const rest = parts.slice(eventIdx + 1)
    eventId = [...rest].reverse().find(part => /^\d+$/.test(part)) ?? null
  }
  if (outcomes.length === 0 && !eventId) return null
  return { eventId, outcomes }
}

function betMgmOptions(url: URL): string[] | null {
  if (!hostEndsWith(url, 'betmgm.com')) return null
  return selectionIds(url.searchParams.get('options'), /,/)
}

function caesarsSelectionIds(url: URL): string[] | null {
  if (!hostEndsWith(url, 'caesars.com') && !hostEndsWith(url, 'williamhill.com')) return null
  return selectionIds(url.searchParams.get('selectionIds') ?? url.searchParams.get('selectionId'), /,/)
}

function fanDuelSlip(links: URL[]): string | null {
  const legs = links.map(fanDuelLeg)
  if (legs.some(leg => !leg)) return null
  const first = links[0]
  const path = first.pathname.includes('addToBetslip') ? first.pathname : '/addToBetslip'
  const params = new URLSearchParams()
  legs.forEach((leg, index) => {
    params.set(`marketId[${index}]`, leg!.marketId)
    params.set(`selectionId[${index}]`, leg!.selectionId)
  })
  return `${first.origin}${path}?${params.toString()}`
}

function draftKingsSlip(links: URL[]): string | null {
  const legs = links.map(draftKingsLeg)
  if (legs.some(leg => !leg || leg.outcomes.length === 0)) return null
  const eventId = legs.find(leg => leg?.eventId)?.eventId
  if (!eventId || !SELECTION_ID.test(eventId)) return null
  const outcomes = legs.flatMap(leg => leg!.outcomes).map(encodeURIComponent).join('+')
  return `${links[0].origin}/event/${encodeURIComponent(eventId)}?outcomes=${outcomes}`
}

function betMgmSlip(links: URL[]): string | null {
  const legs = links.map(betMgmOptions)
  if (legs.some(leg => !leg)) return null
  const options = legs.flatMap(leg => leg!).map(encodeURIComponent).join(',')
  const locale = links[0].pathname.match(/^\/([a-z]{2})\//)?.[1] ?? 'en'
  return `${links[0].origin}/${locale}/sports?options=${options}&type=combo`
}

function caesarsSlip(links: URL[]): string | null {
  const legs = links.map(caesarsSelectionIds)
  if (legs.some(leg => !leg)) return null
  const ids = legs.flatMap(leg => leg!).map(encodeURIComponent).join(',')
  const state = links[0].pathname.match(/\/us\/([a-z]{2})\//i)?.[1]?.toLowerCase() ?? 'co'
  return `https://sportsbook.caesars.com/us/${state}/bet/betslip?selectionIds=${ids}`
}

/**
 * One sportsbook URL that opens every leg on the same bet slip.
 * Returns null when any leg is missing a selection id we know how to combine.
 */
export function parlaySlipUrl(
  bookTitle: string,
  deepLinks: (string | null | undefined)[]
): string | null {
  if (deepLinks.length < 2) return null
  const urls = deepLinks.map(parseHttpUrl)
  if (urls.some(url => !url)) return null
  const links = urls as URL[]
  const key = resolveSportsbookKey(bookTitle)

  if (key === 'fanduel') return fanDuelSlip(links)
  if (key === 'draftkings') return draftKingsSlip(links)
  if (key === 'betmgm') return betMgmSlip(links)
  if (key === 'caesars') return caesarsSlip(links)
  return null
}

export function bonusParlayHref(
  bookTitle: string,
  deepLinks: (string | null | undefined)[],
  opts?: { mobile?: boolean }
): { href: string | null; prefilled: boolean } {
  const slip = parlaySlipUrl(bookTitle, deepLinks)
  if (slip) return { href: slip, prefilled: true }
  return {
    href: getSportsbookHomeUrlFromTitle(bookTitle, opts),
    prefilled: false,
  }
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
