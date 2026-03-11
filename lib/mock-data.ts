import { OddsEvent, PlayerProp, PlayerGameLog } from './types'

export const MOCK_EVENTS: OddsEvent[] = [
  {
    id: 'mock1',
    sport_key: 'basketball_nba',
    sport_title: 'NBA',
    commence_time: new Date(Date.now() + 3600000 * 4).toISOString(),
    home_team: 'Los Angeles Lakers',
    away_team: 'Boston Celtics',
    bookmakers: [
      {
        key: 'draftkings',
        title: 'DraftKings',
        last_update: new Date().toISOString(),
        markets: [
          { key: 'h2h', last_update: new Date().toISOString(), outcomes: [{ name: 'Los Angeles Lakers', price: -110 }, { name: 'Boston Celtics', price: -110 }] },
          { key: 'spreads', last_update: new Date().toISOString(), outcomes: [{ name: 'Los Angeles Lakers', price: -110, point: 2.5 }, { name: 'Boston Celtics', price: -110, point: -2.5 }] },
          { key: 'totals', last_update: new Date().toISOString(), outcomes: [{ name: 'Over', price: -110, point: 224.5 }, { name: 'Under', price: -110, point: 224.5 }] }
        ]
      },
      {
        key: 'fanduel',
        title: 'FanDuel',
        last_update: new Date().toISOString(),
        markets: [
          { key: 'h2h', last_update: new Date().toISOString(), outcomes: [{ name: 'Los Angeles Lakers', price: -105 }, { name: 'Boston Celtics', price: -115 }] },
          { key: 'spreads', last_update: new Date().toISOString(), outcomes: [{ name: 'Los Angeles Lakers', price: -108, point: 2.5 }, { name: 'Boston Celtics', price: -112, point: -2.5 }] },
          { key: 'totals', last_update: new Date().toISOString(), outcomes: [{ name: 'Over', price: -105, point: 225 }, { name: 'Under', price: -115, point: 225 }] }
        ]
      },
      {
        key: 'betmgm',
        title: 'BetMGM',
        last_update: new Date().toISOString(),
        markets: [
          { key: 'h2h', last_update: new Date().toISOString(), outcomes: [{ name: 'Los Angeles Lakers', price: -115 }, { name: 'Boston Celtics', price: -105 }] },
          { key: 'spreads', last_update: new Date().toISOString(), outcomes: [{ name: 'Los Angeles Lakers', price: -105, point: 3 }, { name: 'Boston Celtics', price: -115, point: -3 }] },
          { key: 'totals', last_update: new Date().toISOString(), outcomes: [{ name: 'Over', price: -108, point: 224 }, { name: 'Under', price: -112, point: 224 }] }
        ]
      },
      {
        key: 'caesars',
        title: 'Caesars',
        last_update: new Date().toISOString(),
        markets: [
          { key: 'h2h', last_update: new Date().toISOString(), outcomes: [{ name: 'Los Angeles Lakers', price: -108 }, { name: 'Boston Celtics', price: -112 }] },
          { key: 'spreads', last_update: new Date().toISOString(), outcomes: [{ name: 'Los Angeles Lakers', price: -110, point: 2.5 }, { name: 'Boston Celtics', price: -110, point: -2.5 }] },
          { key: 'totals', last_update: new Date().toISOString(), outcomes: [{ name: 'Over', price: -110, point: 224.5 }, { name: 'Under', price: -110, point: 224.5 }] }
        ]
      },
      {
        key: 'pointsbetus',
        title: 'PointsBet',
        last_update: new Date().toISOString(),
        markets: [
          { key: 'h2h', last_update: new Date().toISOString(), outcomes: [{ name: 'Los Angeles Lakers', price: -112 }, { name: 'Boston Celtics', price: -108 }] },
          { key: 'spreads', last_update: new Date().toISOString(), outcomes: [{ name: 'Los Angeles Lakers', price: -105, point: 2.5 }, { name: 'Boston Celtics', price: -115, point: -2.5 }] },
          { key: 'totals', last_update: new Date().toISOString(), outcomes: [{ name: 'Over', price: -112, point: 224.5 }, { name: 'Under', price: -108, point: 224.5 }] }
        ]
      },
      {
        key: 'betrivers',
        title: 'BetRivers',
        last_update: new Date().toISOString(),
        markets: [
          { key: 'h2h', last_update: new Date().toISOString(), outcomes: [{ name: 'Los Angeles Lakers', price: -108 }, { name: 'Boston Celtics', price: -112 }] },
          { key: 'spreads', last_update: new Date().toISOString(), outcomes: [{ name: 'Los Angeles Lakers', price: -108, point: 2.5 }, { name: 'Boston Celtics', price: -112, point: -2.5 }] },
          { key: 'totals', last_update: new Date().toISOString(), outcomes: [{ name: 'Over', price: -108, point: 225 }, { name: 'Under', price: -112, point: 225 }] }
        ]
      },
      {
        key: 'pinnacle',
        title: 'Pinnacle',
        last_update: new Date().toISOString(),
        markets: [
          { key: 'h2h', last_update: new Date().toISOString(), outcomes: [{ name: 'Los Angeles Lakers', price: -107 }, { name: 'Boston Celtics', price: -103 }] },
          { key: 'spreads', last_update: new Date().toISOString(), outcomes: [{ name: 'Los Angeles Lakers', price: -104, point: 2.5 }, { name: 'Boston Celtics', price: -106, point: -2.5 }] },
          { key: 'totals', last_update: new Date().toISOString(), outcomes: [{ name: 'Over', price: -105, point: 224.5 }, { name: 'Under', price: -105, point: 224.5 }] }
        ]
      }
    ]
  },
  {
    id: 'mock2',
    sport_key: 'basketball_nba',
    sport_title: 'NBA',
    commence_time: new Date(Date.now() + 3600000 * 6).toISOString(),
    home_team: 'Golden State Warriors',
    away_team: 'Phoenix Suns',
    bookmakers: [
      {
        key: 'draftkings',
        title: 'DraftKings',
        last_update: new Date().toISOString(),
        markets: [
          { key: 'h2h', last_update: new Date().toISOString(), outcomes: [{ name: 'Golden State Warriors', price: -135 }, { name: 'Phoenix Suns', price: +115 }] },
          { key: 'spreads', last_update: new Date().toISOString(), outcomes: [{ name: 'Golden State Warriors', price: -110, point: -3 }, { name: 'Phoenix Suns', price: -110, point: 3 }] },
          { key: 'totals', last_update: new Date().toISOString(), outcomes: [{ name: 'Over', price: -110, point: 230 }, { name: 'Under', price: -110, point: 230 }] }
        ]
      },
      {
        key: 'fanduel',
        title: 'FanDuel',
        last_update: new Date().toISOString(),
        markets: [
          { key: 'h2h', last_update: new Date().toISOString(), outcomes: [{ name: 'Golden State Warriors', price: -130 }, { name: 'Phoenix Suns', price: +110 }] },
          { key: 'spreads', last_update: new Date().toISOString(), outcomes: [{ name: 'Golden State Warriors', price: -108, point: -2.5 }, { name: 'Phoenix Suns', price: -112, point: 2.5 }] },
          { key: 'totals', last_update: new Date().toISOString(), outcomes: [{ name: 'Over', price: -108, point: 229.5 }, { name: 'Under', price: -112, point: 229.5 }] }
        ]
      },
      {
        key: 'betmgm',
        title: 'BetMGM',
        last_update: new Date().toISOString(),
        markets: [
          { key: 'h2h', last_update: new Date().toISOString(), outcomes: [{ name: 'Golden State Warriors', price: -140 }, { name: 'Phoenix Suns', price: +120 }] },
          { key: 'spreads', last_update: new Date().toISOString(), outcomes: [{ name: 'Golden State Warriors', price: -110, point: -3.5 }, { name: 'Phoenix Suns', price: -110, point: 3.5 }] },
          { key: 'totals', last_update: new Date().toISOString(), outcomes: [{ name: 'Over', price: -105, point: 230.5 }, { name: 'Under', price: -115, point: 230.5 }] }
        ]
      },
      {
        key: 'caesars',
        title: 'Caesars',
        last_update: new Date().toISOString(),
        markets: [
          { key: 'h2h', last_update: new Date().toISOString(), outcomes: [{ name: 'Golden State Warriors', price: -132 }, { name: 'Phoenix Suns', price: +112 }] },
          { key: 'spreads', last_update: new Date().toISOString(), outcomes: [{ name: 'Golden State Warriors', price: -110, point: -3 }, { name: 'Phoenix Suns', price: -110, point: 3 }] },
          { key: 'totals', last_update: new Date().toISOString(), outcomes: [{ name: 'Over', price: -110, point: 230 }, { name: 'Under', price: -110, point: 230 }] }
        ]
      },
      {
        key: 'pinnacle',
        title: 'Pinnacle',
        last_update: new Date().toISOString(),
        markets: [
          { key: 'h2h', last_update: new Date().toISOString(), outcomes: [{ name: 'Golden State Warriors', price: -128 }, { name: 'Phoenix Suns', price: +118 }] },
          { key: 'spreads', last_update: new Date().toISOString(), outcomes: [{ name: 'Golden State Warriors', price: -104, point: -3 }, { name: 'Phoenix Suns', price: -106, point: 3 }] },
          { key: 'totals', last_update: new Date().toISOString(), outcomes: [{ name: 'Over', price: -104, point: 230 }, { name: 'Under', price: -106, point: 230 }] }
        ]
      }
    ]
  },
  {
    id: 'mock3',
    sport_key: 'basketball_nba',
    sport_title: 'NBA',
    commence_time: new Date(Date.now() + 3600000 * 8).toISOString(),
    home_team: 'Denver Nuggets',
    away_team: 'Oklahoma City Thunder',
    bookmakers: [
      {
        key: 'draftkings',
        title: 'DraftKings',
        last_update: new Date().toISOString(),
        markets: [
          { key: 'h2h', last_update: new Date().toISOString(), outcomes: [{ name: 'Denver Nuggets', price: -150 }, { name: 'Oklahoma City Thunder', price: +130 }] },
          { key: 'spreads', last_update: new Date().toISOString(), outcomes: [{ name: 'Denver Nuggets', price: -110, point: -4 }, { name: 'Oklahoma City Thunder', price: -110, point: 4 }] },
          { key: 'totals', last_update: new Date().toISOString(), outcomes: [{ name: 'Over', price: -110, point: 227.5 }, { name: 'Under', price: -110, point: 227.5 }] }
        ]
      },
      {
        key: 'fanduel',
        title: 'FanDuel',
        last_update: new Date().toISOString(),
        markets: [
          { key: 'h2h', last_update: new Date().toISOString(), outcomes: [{ name: 'Denver Nuggets', price: -145 }, { name: 'Oklahoma City Thunder', price: +125 }] },
          { key: 'spreads', last_update: new Date().toISOString(), outcomes: [{ name: 'Denver Nuggets', price: -105, point: -3.5 }, { name: 'Oklahoma City Thunder', price: -115, point: 3.5 }] },
          { key: 'totals', last_update: new Date().toISOString(), outcomes: [{ name: 'Over', price: -112, point: 228 }, { name: 'Under', price: -108, point: 228 }] }
        ]
      },
      {
        key: 'betmgm',
        title: 'BetMGM',
        last_update: new Date().toISOString(),
        markets: [
          { key: 'h2h', last_update: new Date().toISOString(), outcomes: [{ name: 'Denver Nuggets', price: -155 }, { name: 'Oklahoma City Thunder', price: +135 }] },
          { key: 'spreads', last_update: new Date().toISOString(), outcomes: [{ name: 'Denver Nuggets', price: -110, point: -4.5 }, { name: 'Oklahoma City Thunder', price: -110, point: 4.5 }] },
          { key: 'totals', last_update: new Date().toISOString(), outcomes: [{ name: 'Over', price: -110, point: 227 }, { name: 'Under', price: -110, point: 227 }] }
        ]
      },
      {
        key: 'caesars',
        title: 'Caesars',
        last_update: new Date().toISOString(),
        markets: [
          { key: 'h2h', last_update: new Date().toISOString(), outcomes: [{ name: 'Denver Nuggets', price: -148 }, { name: 'Oklahoma City Thunder', price: +128 }] },
          { key: 'spreads', last_update: new Date().toISOString(), outcomes: [{ name: 'Denver Nuggets', price: -108, point: -4 }, { name: 'Oklahoma City Thunder', price: -112, point: 4 }] },
          { key: 'totals', last_update: new Date().toISOString(), outcomes: [{ name: 'Over', price: -108, point: 227.5 }, { name: 'Under', price: -112, point: 227.5 }] }
        ]
      },
      {
        key: 'pinnacle',
        title: 'Pinnacle',
        last_update: new Date().toISOString(),
        markets: [
          { key: 'h2h', last_update: new Date().toISOString(), outcomes: [{ name: 'Denver Nuggets', price: -143 }, { name: 'Oklahoma City Thunder', price: +133 }] },
          { key: 'spreads', last_update: new Date().toISOString(), outcomes: [{ name: 'Denver Nuggets', price: -104, point: -4 }, { name: 'Oklahoma City Thunder', price: -106, point: 4 }] },
          { key: 'totals', last_update: new Date().toISOString(), outcomes: [{ name: 'Over', price: -105, point: 227.5 }, { name: 'Under', price: -105, point: 227.5 }] }
        ]
      }
    ]
  }
]

const generateGameLogs = (avgStats: { pts: number; reb: number; ast: number; blk: number; stl: number }): PlayerGameLog[] => {
  const teams = ['BOS', 'LAL', 'GSW', 'PHX', 'DEN', 'MIA', 'NYK', 'CHI', 'DAL', 'MIL']
  const logs: PlayerGameLog[] = []
  
  for (let i = 29; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i * 2 - Math.floor(Math.random() * 2))
    
    const variance = 0.4
    logs.push({
      date: date.toISOString().split('T')[0],
      matchup: `vs ${teams[Math.floor(Math.random() * teams.length)]}`,
      result: Math.random() > 0.45 ? 'W' : 'L',
      minutes: 28 + Math.floor(Math.random() * 12),
      points: Math.max(0, Math.round(avgStats.pts * (1 + (Math.random() - 0.5) * variance))),
      rebounds: Math.max(0, Math.round(avgStats.reb * (1 + (Math.random() - 0.5) * variance))),
      assists: Math.max(0, Math.round(avgStats.ast * (1 + (Math.random() - 0.5) * variance))),
      blocks: Math.max(0, Math.round(avgStats.blk * (1 + (Math.random() - 0.5) * variance * 2))),
      steals: Math.max(0, Math.round(avgStats.stl * (1 + (Math.random() - 0.5) * variance * 2)))
    })
  }
  
  return logs
}

export const MOCK_PLAYER_PROPS: PlayerProp[] = [
  {
    playerId: 'jokic',
    playerName: 'Nikola Jokić',
    team: 'DEN',
    stat: 'PTS',
    line: 29.5,
    overOdds: { draftkings: -115, fanduel: -110, betmgm: -118, caesars: -112, pointsbetus: -110, betrivers: -112 },
    underOdds: { draftkings: -105, fanduel: -110, betmgm: -102, caesars: -108, pointsbetus: -110, betrivers: -108 },
    historicalHitRate: 0.58,
    last10HitRate: 0.70,
    recentGames: generateGameLogs({ pts: 31, reb: 13, ast: 10, blk: 1, stl: 1 })
  },
  {
    playerId: 'lebron',
    playerName: 'LeBron James',
    team: 'LAL',
    stat: 'PTS',
    line: 25.5,
    overOdds: { draftkings: -110, fanduel: -108, betmgm: -115, caesars: -110, pointsbetus: -108, betrivers: -110 },
    underOdds: { draftkings: -110, fanduel: -112, betmgm: -105, caesars: -110, pointsbetus: -112, betrivers: -110 },
    historicalHitRate: 0.52,
    last10HitRate: 0.60,
    recentGames: generateGameLogs({ pts: 26, reb: 8, ast: 8, blk: 1, stl: 1 })
  },
  {
    playerId: 'sga',
    playerName: 'Shai Gilgeous-Alexander',
    team: 'OKC',
    stat: 'PTS',
    line: 31.5,
    overOdds: { draftkings: -105, fanduel: -108, betmgm: -110, caesars: -105, pointsbetus: -108, betrivers: -105 },
    underOdds: { draftkings: -115, fanduel: -112, betmgm: -110, caesars: -115, pointsbetus: -112, betrivers: -115 },
    historicalHitRate: 0.62,
    last10HitRate: 0.80,
    recentGames: generateGameLogs({ pts: 33, reb: 5, ast: 6, blk: 1, stl: 2 })
  },
  {
    playerId: 'luka',
    playerName: 'Luka Dončić',
    team: 'DAL',
    stat: 'PTS',
    line: 33.5,
    overOdds: { draftkings: -112, fanduel: -110, betmgm: -108, caesars: -110, pointsbetus: -110, betrivers: -112 },
    underOdds: { draftkings: -108, fanduel: -110, betmgm: -112, caesars: -110, pointsbetus: -110, betrivers: -108 },
    historicalHitRate: 0.55,
    last10HitRate: 0.50,
    recentGames: generateGameLogs({ pts: 34, reb: 9, ast: 10, blk: 0, stl: 1 })
  },
  {
    playerId: 'giannis',
    playerName: 'Giannis Antetokounmpo',
    team: 'MIL',
    stat: 'PTS',
    line: 30.5,
    overOdds: { draftkings: -110, fanduel: -105, betmgm: -112, caesars: -108, pointsbetus: -108, betrivers: -110 },
    underOdds: { draftkings: -110, fanduel: -115, betmgm: -108, caesars: -112, pointsbetus: -112, betrivers: -110 },
    historicalHitRate: 0.60,
    last10HitRate: 0.70,
    recentGames: generateGameLogs({ pts: 32, reb: 12, ast: 6, blk: 1, stl: 1 })
  },
  {
    playerId: 'curry',
    playerName: 'Stephen Curry',
    team: 'GSW',
    stat: 'PTS',
    line: 27.5,
    overOdds: { draftkings: -108, fanduel: -110, betmgm: -105, caesars: -108, pointsbetus: -110, betrivers: -108 },
    underOdds: { draftkings: -112, fanduel: -110, betmgm: -115, caesars: -112, pointsbetus: -110, betrivers: -112 },
    historicalHitRate: 0.54,
    last10HitRate: 0.60,
    recentGames: generateGameLogs({ pts: 28, reb: 5, ast: 5, blk: 0, stl: 1 })
  }
]

export const PLAYER_STAT_LINES: Record<string, Record<string, number>> = {
  jokic: { PTS: 29.5, REB: 11.5, AST: 9.5, BLK: 0.5, STL: 1.5 },
  lebron: { PTS: 25.5, REB: 8.5, AST: 8.5, BLK: 0.5, STL: 1.5 },
  sga: { PTS: 31.5, REB: 5.5, AST: 6.5, BLK: 0.5, STL: 2.5 },
  luka: { PTS: 33.5, REB: 9.5, AST: 9.5, BLK: 0.5, STL: 1.5 },
  giannis: { PTS: 30.5, REB: 11.5, AST: 6.5, BLK: 1.5, STL: 1.5 },
  curry: { PTS: 27.5, REB: 4.5, AST: 5.5, BLK: 0.5, STL: 1.5 }
}
