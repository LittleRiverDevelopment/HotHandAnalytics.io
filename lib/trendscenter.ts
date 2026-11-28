/** TrendsCenter public API. https://trendscenterapp.com/api-access/docs/ */

const BASE_URL = 'https://api.trendscenterapp.com/v1'

export const TRENDSCENTER_SPORTS = ['NBA', 'NFL', 'MLB', 'NHL', 'NCAAB', 'NCAAF'] as const
export type TrendsCenterSport = (typeof TRENDSCENTER_SPORTS)[number]

export const TRENDSCENTER_ATTRIBUTION = 'Data by TrendsCenter'
export const TRENDSCENTER_HOME = 'https://trendscenterapp.com'

export type TrendsCenterGame = {
  matchup: string
  pick: string | null
  startLabel: string | null
}

export type TrendsCenterTrend = {
  id: string
  name: string
  sport: string
  betType: string
  description: string | null
  record: string | null
  winRate: number | null
  units: number | null
  roi: number | null
  streak: number | null
  games: TrendsCenterGame[]
}

export type TrendsCenterPayload = {
  trends: TrendsCenterTrend[]
  sandbox: boolean
  attributionText: string
  attributionUrl: string
  requestId: string | null
}

export function trendsCenterKey(): string {
  return (process.env.NEXT_PUBLIC_TRENDSCENTER_KEY || '').trim()
}

export function todayTrendsPath(sport: TrendsCenterSport, limit = 25): string {
  const params = new URLSearchParams({
    sport,
    limit: String(limit),
    sort: 'score',
  })
  return `/trends/today?${params.toString()}`
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : null
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function formatStart(hhmm: number | null): string | null {
  if (hhmm === null) return null
  const hours = Math.floor(hhmm / 100)
  const minutes = hhmm % 100
  if (hours > 23 || minutes > 59) return null
  const period = hours >= 12 ? 'PM' : 'AM'
  const hour12 = hours % 12 || 12
  return `${hour12}:${String(minutes).padStart(2, '0')} ${period} ET`
}

function formatPick(pick: unknown, team: string): string | null {
  const row = asRecord(pick)
  if (!row) return null
  const market = asString(row.market)
  const side = asString(row.side)
  const line = asNumber(row.line)
  const odds = asNumber(row.odds)
  if (market === 'total' && side && line !== null) {
    const name = side.toLowerCase() === 'over' ? 'Over' : side.toLowerCase() === 'under' ? 'Under' : side
    return `${name} ${line}`
  }
  if (market === 'spread' && line !== null) {
    const who = side || team
    const signed = line > 0 ? `+${line}` : `${line}`
    return `${who} ${signed}`
  }
  if (market === 'moneyline') {
    const who = side || team
    if (odds === null) return who
    return `${who} ${odds > 0 ? `+${odds}` : odds}`
  }
  return null
}

function parseGame(value: unknown): TrendsCenterGame | null {
  const row = asRecord(value)
  if (!row) return null
  const team = asString(row.team)
  const opponent = asString(row.opponent)
  if (!team || !opponent) return null
  const site = asString(row.site)
  const matchup = site === 'home' ? `${opponent} @ ${team}` : `${team} @ ${opponent}`
  return {
    matchup,
    pick: formatPick(row.pick, team),
    startLabel: formatStart(asNumber(row.startTime)),
  }
}

function parseTrend(value: unknown, index: number): TrendsCenterTrend | null {
  const row = asRecord(value)
  if (!row) return null
  const name = asString(row.name)
  if (!name) return null
  const performance = asRecord(row.performance)
  const games = Array.isArray(row.activeGames)
    ? row.activeGames.map(parseGame).filter((game): game is TrendsCenterGame => game !== null)
    : []
  return {
    id: asString(row.id) || `${name}-${index}`,
    name,
    sport: asString(row.sport) || '',
    betType: asString(row.betType) || '',
    description: asString(row.description),
    record: performance ? asString(performance.record) : null,
    winRate: performance ? asNumber(performance.winRate) : null,
    units: performance ? asNumber(performance.units) : null,
    roi: performance ? asNumber(performance.roi) : null,
    streak: performance ? asNumber(performance.streak) : null,
    games,
  }
}

export function parseTrendsPayload(body: unknown): TrendsCenterPayload {
  const root = asRecord(body)
  const data = asRecord(root?.data)
  const meta = asRecord(root?.meta)
  const attribution = asRecord(meta?.attribution)
  const trends = Array.isArray(data?.trends)
    ? data.trends.map(parseTrend).filter((trend): trend is TrendsCenterTrend => trend !== null)
    : []
  return {
    trends,
    sandbox: meta?.sandbox === true,
    attributionText: asString(attribution?.text) || TRENDSCENTER_ATTRIBUTION,
    attributionUrl: asString(attribution?.url) || TRENDSCENTER_HOME,
    requestId: asString(meta?.requestId),
  }
}

export function parseTrendsError(body: unknown, status: number): string {
  const root = asRecord(body)
  const error = asRecord(root?.error)
  const message = asString(error?.message)
  if (message) return message
  return `TrendsCenter request failed (${status})`
}

export async function fetchTodayTrends(sport: TrendsCenterSport): Promise<TrendsCenterPayload> {
  const key = trendsCenterKey()
  if (!key) {
    throw new Error('Add NEXT_PUBLIC_TRENDSCENTER_KEY to .env and restart the dev server.')
  }
  const response = await fetch(`${BASE_URL}${todayTrendsPath(sport)}`, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${key}`,
    },
  })
  const body = await response.json().catch(() => null)
  if (!response.ok) throw new Error(parseTrendsError(body, response.status))
  return parseTrendsPayload(body)
}
