export interface Sportsbook {
  key: string
  name: string
}

export interface Outcome {
  name: string
  price: number
  point?: number
}

export interface Market {
  key: string
  last_update: string
  outcomes: Outcome[]
}

export interface Bookmaker {
  key: string
  title: string
  last_update: string
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
  allBookOdds: { book: string; odds: number; point?: number }[]
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
  ev: number
  evPercent: number
  kellyCriterion: number
  commenceTime: string
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

// Colorado-legal sportsbooks
export const SPORTSBOOKS: Sportsbook[] = [
  { key: 'draftkings', name: 'DraftKings' },
  { key: 'fanduel', name: 'FanDuel' },
  { key: 'betmgm', name: 'BetMGM' },
  { key: 'caesars', name: 'Caesars' },
  { key: 'pointsbetus', name: 'PointsBet' },
  { key: 'betrivers', name: 'BetRivers' },
  { key: 'espnbet', name: 'ESPN BET' },
  { key: 'superbook', name: 'SuperBook' },
  { key: 'betfred', name: 'Betfred' },
  { key: 'fanatics', name: 'Fanatics' }
]

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
