import { OddsEvent } from './types'

function altSpreads(
  home: string,
  away: string,
  lines: [homePoint: number, homePrice: number, awayPrice: number][]
) {
  const last_update = new Date().toISOString()
  return {
    key: 'alternate_spreads',
    last_update,
    outcomes: lines.flatMap(([homePoint, homePrice, awayPrice]) => [
      { name: home, price: homePrice, point: homePoint },
      { name: away, price: awayPrice, point: -homePoint },
    ]),
  }
}

function altTotals(lines: [point: number, over: number, under: number][]) {
  const last_update = new Date().toISOString()
  return {
    key: 'alternate_totals',
    last_update,
    outcomes: lines.flatMap(([point, over, under]) => [
      { name: 'Over', price: over, point },
      { name: 'Under', price: under, point },
    ]),
  }
}

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
          { key: 'totals', last_update: new Date().toISOString(), outcomes: [{ name: 'Over', price: -110, point: 224.5 }, { name: 'Under', price: -110, point: 224.5 }] },
          altSpreads('Los Angeles Lakers', 'Boston Celtics', [[1.5, -120, 100], [3.5, -105, -115], [5.5, 105, -125], [7.5, -105, -115]]),
          altTotals([[220.5, -105, -115], [228.5, -112, -108], [232.5, -120, 100]]),
        ]
      },
      {
        key: 'fanduel',
        title: 'FanDuel',
        last_update: new Date().toISOString(),
        markets: [
          { key: 'h2h', last_update: new Date().toISOString(), outcomes: [{ name: 'Los Angeles Lakers', price: -105 }, { name: 'Boston Celtics', price: -115 }] },
          { key: 'spreads', last_update: new Date().toISOString(), outcomes: [{ name: 'Los Angeles Lakers', price: -108, point: 2.5 }, { name: 'Boston Celtics', price: -112, point: -2.5 }] },
          { key: 'totals', last_update: new Date().toISOString(), outcomes: [{ name: 'Over', price: -105, point: 225 }, { name: 'Under', price: -115, point: 225 }] },
          altSpreads('Los Angeles Lakers', 'Boston Celtics', [[1.5, -118, -102], [3.5, -108, -112], [5.5, -102, -118], [7.5, -110, -110]]),
          altTotals([[220.5, -110, -110], [228.5, -108, -112], [232.5, -118, -102]]),
        ]
      },
      {
        key: 'betmgm',
        title: 'BetMGM',
        last_update: new Date().toISOString(),
        markets: [
          { key: 'h2h', last_update: new Date().toISOString(), outcomes: [{ name: 'Los Angeles Lakers', price: -115 }, { name: 'Boston Celtics', price: -105 }] },
          { key: 'spreads', last_update: new Date().toISOString(), outcomes: [{ name: 'Los Angeles Lakers', price: -105, point: 3 }, { name: 'Boston Celtics', price: -115, point: -3 }] },
          { key: 'totals', last_update: new Date().toISOString(), outcomes: [{ name: 'Over', price: -108, point: 224 }, { name: 'Under', price: -112, point: 224 }] },
          altSpreads('Los Angeles Lakers', 'Boston Celtics', [[1.5, -125, 105], [3.5, -110, -110], [5.5, -108, -112], [7.5, -125, 105]]),
          altTotals([[220.5, -125, 105], [228.5, -110, -110], [232.5, -115, -105]]),
        ]
      },
      {
        key: 'williamhill_us',
        title: 'Caesars',
        last_update: new Date().toISOString(),
        markets: [
          { key: 'h2h', last_update: new Date().toISOString(), outcomes: [{ name: 'Los Angeles Lakers', price: -108 }, { name: 'Boston Celtics', price: -112 }] },
          { key: 'spreads', last_update: new Date().toISOString(), outcomes: [{ name: 'Los Angeles Lakers', price: -110, point: 2.5 }, { name: 'Boston Celtics', price: -110, point: -2.5 }] },
          { key: 'totals', last_update: new Date().toISOString(), outcomes: [{ name: 'Over', price: -110, point: 224.5 }, { name: 'Under', price: -110, point: 224.5 }] },
          altSpreads('Los Angeles Lakers', 'Boston Celtics', [[1.5, -118, -102], [3.5, -110, -110], [5.5, -110, -110], [7.5, -112, -108]]),
          altTotals([[220.5, -110, -110], [228.5, -110, -110], [232.5, -118, -102]]),
        ]
      },
      {
        key: 'kalshi',
        title: 'Kalshi',
        last_update: new Date().toISOString(),
        markets: [
          { key: 'h2h', last_update: new Date().toISOString(), outcomes: [{ name: 'Los Angeles Lakers', price: -112 }, { name: 'Boston Celtics', price: -108 }] },
          { key: 'spreads', last_update: new Date().toISOString(), outcomes: [{ name: 'Los Angeles Lakers', price: -105, point: 2.5 }, { name: 'Boston Celtics', price: -115, point: -2.5 }] },
          { key: 'totals', last_update: new Date().toISOString(), outcomes: [{ name: 'Over', price: -112, point: 224.5 }, { name: 'Under', price: -108, point: 224.5 }] },
          altSpreads('Los Angeles Lakers', 'Boston Celtics', [[1.5, -115, -105], [3.5, -108, -112], [5.5, -105, -115], [7.5, -108, -112]]),
          altTotals([[220.5, -108, -112], [228.5, -115, -105], [232.5, -122, 102]]),
        ]
      },
      {
        key: 'polymarket_us',
        title: 'Polymarket US',
        last_update: new Date().toISOString(),
        markets: [
          { key: 'h2h', last_update: new Date().toISOString(), outcomes: [{ name: 'Los Angeles Lakers', price: -110 }, { name: 'Boston Celtics', price: -110 }] },
          { key: 'spreads', last_update: new Date().toISOString(), outcomes: [{ name: 'Los Angeles Lakers', price: -110, point: 2.5 }, { name: 'Boston Celtics', price: -110, point: -2.5 }] },
          { key: 'totals', last_update: new Date().toISOString(), outcomes: [{ name: 'Over', price: -110, point: 224.5 }, { name: 'Under', price: -110, point: 224.5 }] },
        ]
      },
      {
        key: 'betrivers',
        title: 'BetRivers',
        last_update: new Date().toISOString(),
        markets: [
          { key: 'h2h', last_update: new Date().toISOString(), outcomes: [{ name: 'Los Angeles Lakers', price: -108 }, { name: 'Boston Celtics', price: -112 }] },
          { key: 'spreads', last_update: new Date().toISOString(), outcomes: [{ name: 'Los Angeles Lakers', price: -108, point: 2.5 }, { name: 'Boston Celtics', price: -112, point: -2.5 }] },
          { key: 'totals', last_update: new Date().toISOString(), outcomes: [{ name: 'Over', price: -108, point: 225 }, { name: 'Under', price: -112, point: 225 }] },
          altSpreads('Los Angeles Lakers', 'Boston Celtics', [[1.5, -118, -102], [3.5, -110, -110], [5.5, -108, -112], [7.5, -110, -110]]),
          altTotals([[220.5, -112, -108], [228.5, -108, -112], [232.5, -118, -102]]),
        ]
      },
      {
        key: 'pinnacle',
        title: 'Pinnacle',
        last_update: new Date().toISOString(),
        markets: [
          { key: 'h2h', last_update: new Date().toISOString(), outcomes: [{ name: 'Los Angeles Lakers', price: -107 }, { name: 'Boston Celtics', price: -103 }] },
          { key: 'spreads', last_update: new Date().toISOString(), outcomes: [{ name: 'Los Angeles Lakers', price: -104, point: 2.5 }, { name: 'Boston Celtics', price: -106, point: -2.5 }] },
          { key: 'totals', last_update: new Date().toISOString(), outcomes: [{ name: 'Over', price: -105, point: 224.5 }, { name: 'Under', price: -105, point: 224.5 }] },
          altSpreads('Los Angeles Lakers', 'Boston Celtics', [[1.5, -115, -105], [3.5, -102, -110], [5.5, -110, -102], [7.5, -105, -105]]),
          altTotals([[220.5, -108, -104], [228.5, -104, -108], [232.5, -110, -102]]),
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
          { key: 'totals', last_update: new Date().toISOString(), outcomes: [{ name: 'Over', price: -110, point: 230 }, { name: 'Under', price: -110, point: 230 }] },
          altSpreads('Golden State Warriors', 'Phoenix Suns', [[-1.5, -130, 110], [-4.5, -108, -112], [-6.5, -125, 115]]),
          altTotals([[226.5, -108, -112], [234.5, -115, -105]]),
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
          { key: 'totals', last_update: new Date().toISOString(), outcomes: [{ name: 'Over', price: -105, point: 230.5 }, { name: 'Under', price: -115, point: 230.5 }] },
          altSpreads('Golden State Warriors', 'Phoenix Suns', [[-1.5, -135, 115], [-4.5, -110, -110], [-6.5, -120, 100]]),
          altTotals([[226.5, -125, 105], [234.5, -110, -110]]),
        ]
      },
      {
        key: 'williamhill_us',
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
          { key: 'totals', last_update: new Date().toISOString(), outcomes: [{ name: 'Over', price: -104, point: 230 }, { name: 'Under', price: -106, point: 230 }] },
          altSpreads('Golden State Warriors', 'Phoenix Suns', [[-1.5, -125, 105], [-4.5, -104, -108], [-6.5, -110, -102]]),
          altTotals([[226.5, -105, -107], [234.5, -108, -104]]),
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
        key: 'williamhill_us',
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

