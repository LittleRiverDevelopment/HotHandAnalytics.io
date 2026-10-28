export interface Sportsbook {
  key: string
  name: string
}

export interface Outcome {
  name: string
  price: number
  point?: number
  /** The Odds API bookmaker deep link when `includeLinks=true` */
  link?: string
}

export interface Market {
  key: string
  last_update: string
  link?: string
  outcomes: Outcome[]
}

export interface Bookmaker {
  key: string
  title: string
  last_update: string
  link?: string
  markets: Market[]
}

export interface OddsEvent {
  id: string
  sport_key: string
  sport_title: string
  commence_time: string
  home_team: string
  away_team: string
  bookmakers: Bookmaker[]
}

export interface ScoreEntry {
  name: string
  score: string
}

export interface ScoreEvent {
  id: string
  sport_key: string
  sport_title?: string
  commence_time: string
  completed: boolean
  home_team: string
  away_team: string
  /** null until the game has actually started */
  scores: ScoreEntry[] | null
  last_update: string | null
}

export interface LineDiscrepancy {
  eventId: string
  homeTeam: string
  awayTeam: string
  market: string
  betType: string
  bestOdds: number
  bestBook: string
  worstOdds: number
  worstBook: string
  spread: number
  /** 0–100: stronger with more books quoting the outcome and a wider best-vs-worst gap */
  confidenceScore: number
  commenceTime: string
  allBookOdds: { book: string; odds: number; point?: number; link?: string }[]
  /** Deepest API link for best book (outcome → market → event) */
  bestDeepLink?: string
  worstDeepLink?: string
  /** True when this number only appears on alternate_spreads / alternate_totals, not the main line */
  isAltLine?: boolean
  /** Pinnacle no-vig price for this selection, when both sides are quoted */
  fairOdds?: number
}

export interface EVBet {
  eventId: string
  homeTeam: string
  awayTeam: string
  market: string
  selection: string
  odds: number
  book: string
  fairOdds: number
  /** ISO timestamp from The Odds API: Pinnacle market `last_update`, else book `last_update` */
  pinnacleLastUpdate: string
  ev: number
  evPercent: number
  kellyCriterion: number
  /** 0–100: stronger edge vs Pinnacle fair odds and higher Kelly-suggested sizing */
  confidenceScore: number
  commenceTime: string
  /** The Odds API deep link for this book/selection when `includeLinks=true` */
  bookDeepLink?: string
  /** True when this number only appears on alternate_spreads / alternate_totals, not the main line */
  isAltLine?: boolean
  /** Every shop book quoting this same selection. Already in the odds payload. */
  allBookOdds: { book: string; odds: number; point?: number; link?: string }[]
}

export interface ArbitrageLeg {
  selection: string
  odds: number
  book: string
  point?: number
  /** Share of total stake this leg should receive to lock in equal profit on every outcome */
  stakePercent: number
  lastUpdate: string
  deepLink?: string
}

export interface ArbitrageOpportunity {
  eventId: string
  homeTeam: string
  awayTeam: string
  market: string
  commenceTime: string
  legs: ArbitrageLeg[]
  /** Sum of implied probabilities across legs; below 100% means a guaranteed profit */
  impliedProbabilitySum: number
  /** Guaranteed profit % on total stake when sized per each leg's stakePercent */
  profitPercent: number
  /** 0–100: stronger with higher profit% and tighter timing between the legs' book updates */
  confidenceScore: number
  /** True when this number only appears on alternate_spreads / alternate_totals, not the main line */
  isAltLine?: boolean
}

export interface PlayerGameLog {
  date: string
  matchup: string
  result: 'W' | 'L'
  minutes: number
  points: number
  rebounds: number
  assists: number
  blocks: number
  steals: number
}

export interface PlayerProp {
  playerId: string
  playerName: string
  team: string
  stat: StatType
  line: number
  overOdds: Record<string, number>
  underOdds: Record<string, number>
  historicalHitRate: number
  last10HitRate: number
  recentGames: PlayerGameLog[]
}

export type StatType = 'PTS' | 'REB' | 'AST' | 'BLK' | 'STL' | 'PRA' | '3PM'

export const STAT_LABELS: Record<StatType, string> = {
  PTS: 'Points',
  REB: 'Rebounds',
  AST: 'Assists',
  BLK: 'Blocks',
  STL: 'Steals',
  PRA: 'Pts+Reb+Ast',
  '3PM': '3-Pointers Made'
}

/**
 * Books shown on the board. Caesars is `williamhill_us`. theScore Bet is still `espnbet`.
 * Polymarket is the one prediction market that fits in the 10-book request.
 * PointsBet US, SuperBook, and US Betfred are not on the feed.
 */
export const SPORTSBOOKS: Sportsbook[] = [
  { key: 'draftkings', name: 'DraftKings' },
  { key: 'fanduel', name: 'FanDuel' },
  { key: 'betmgm', name: 'BetMGM' },
  { key: 'williamhill_us', name: 'Caesars' },
  { key: 'betrivers', name: 'BetRivers' },
  { key: 'fanatics', name: 'Fanatics' },
  { key: 'espnbet', name: 'theScore Bet' },
  { key: 'ballybet', name: 'Bally Bet' },
  { key: 'polymarket', name: 'Polymarket' },
]

/**
 * Books on each odds request. Pinnacle is the fair-odds benchmark, not a bet on the board.
 * The Odds API bills one region per 10 bookmakers, per market, so this list stays at 10 or fewer.
 * Hard Rock has no Colorado feed, and bet365's only key is the Australian one.
 */
export const ODDS_API_BOOKMAKERS = [
  ...SPORTSBOOKS.map(book => book.key),
  'pinnacle',
] as const

export const SPORTS = [
  { key: 'basketball_nba', title: 'NBA', group: 'Basketball' },
  { key: 'basketball_ncaab', title: 'NCAAB', group: 'Basketball' },
  { key: 'americanfootball_nfl', title: 'NFL', group: 'Football' },
  { key: 'americanfootball_ncaaf', title: 'NCAAF', group: 'Football' },
  { key: 'baseball_mlb', title: 'MLB', group: 'Baseball' },
  { key: 'icehockey_nhl', title: 'NHL', group: 'Hockey' },
  { key: 'soccer_usa_mls', title: 'MLS', group: 'Soccer' },
  { key: 'mma_mixed_martial_arts', title: 'UFC/MMA', group: 'Fighting' },
] as const

export type SportKey = typeof SPORTS[number]['key']

export interface HistoricalBet {
  id: number
  /** ISO date (YYYY-MM-DD) the bet was placed */
  date: string
  description: string
  sport: string
  book: string
  units: number
  odds: number
  status: 'W' | 'L' | 'Push' | 'Open'
  /** Net units won/lost on this bet; null while status is 'Open' */
  delta: number | null
  /** Running bankroll total (in units) after this bet settles; null while 'Open' */
  cumulative: number | null
  /** Optional bet-slip share link (sportsbook or Pikkit) */
  tailLink?: string
}
