'use client'

import { useState } from 'react'
import { OddsEvent } from '@/lib/types'
import { impliedProbability, americanToDecimal } from '@/lib/odds-utils'
import { Grid3X3, Info } from 'lucide-react'

interface EdgeHeatmapProps {
  events: OddsEvent[]
}

const DISPLAY_BOOKS = [
  { key: 'pinnacle', name: 'Pinnacle', isBaseline: true },
  { key: 'draftkings', name: 'DraftKings', isBaseline: false },
  { key: 'fanduel', name: 'FanDuel', isBaseline: false },
  { key: 'betmgm', name: 'BetMGM', isBaseline: false },
  { key: 'caesars', name: 'Caesars', isBaseline: false },
  { key: 'pointsbetus', name: 'PointsBet', isBaseline: false },
  { key: 'betrivers', name: 'BetRivers', isBaseline: false },
]

type MarketType = 'h2h' | 'spreads' | 'totals'

function calculateEdge(bookOdds: number, pinnacleOdds: number, pinnacleOpposingOdds: number): number {
  const bookProb = impliedProbability(bookOdds)
  const pinnProb = impliedProbability(pinnacleOdds)
  const pinnOppProb = impliedProbability(pinnacleOpposingOdds)
  const fairProb = pinnProb / (pinnProb + pinnOppProb)
  
  const bookDecimal = americanToDecimal(bookOdds)
  const ev = (fairProb * (bookDecimal - 1)) - (1 - fairProb)
  return ev * 100
}

function getEdgeColor(edge: number): string {
  if (edge >= 5) return 'bg-green-500'
  if (edge >= 3) return 'bg-green-600'
  if (edge >= 1) return 'bg-green-700'
  if (edge >= 0) return 'bg-green-900/50'
  if (edge >= -2) return 'bg-slate-700'
  if (edge >= -5) return 'bg-red-900/50'
  return 'bg-red-800/50'
}

function getEdgeTextColor(edge: number): string {
  if (edge >= 3) return 'text-white'
  if (edge >= 0) return 'text-green-300'
  return 'text-slate-400'
}

export default function EdgeHeatmap({ events }: EdgeHeatmapProps) {
  const [selectedMarket, setSelectedMarket] = useState<MarketType>('h2h')
  const [selectedSide, setSelectedSide] = useState<'home' | 'away'>('home')

  const getHeatmapData = () => {
    return events.map(event => {
      const pinnacle = event.bookmakers.find(b => b.key === 'pinnacle')
      const pinnacleMarket = pinnacle?.markets.find(m => m.key === selectedMarket)
      
      const teamName = selectedSide === 'home' ? event.home_team : event.away_team
      const opposingTeam = selectedSide === 'home' ? event.away_team : event.home_team
      
      const pinnacleOutcome = pinnacleMarket?.outcomes.find(o => o.name === teamName)
      const pinnacleOpposing = pinnacleMarket?.outcomes.find(o => o.name === opposingTeam || o.name === 'Over' || o.name === 'Under')
      
      const bookData: { [key: string]: { edge: number | null; odds: number | null } } = {}
      
      DISPLAY_BOOKS.forEach(book => {
        const bookmaker = event.bookmakers.find(b => b.key === book.key)
        const market = bookmaker?.markets.find(m => m.key === selectedMarket)
        const outcome = market?.outcomes.find(o => o.name === teamName)
        
        if (book.isBaseline) {
          // Pinnacle shows actual odds as baseline
          bookData[book.key] = { 
            edge: null, 
            odds: pinnacleOutcome?.price || null 
          }
        } else if (outcome && pinnacleOutcome && pinnacleOpposing) {
          bookData[book.key] = { 
            edge: calculateEdge(outcome.price, pinnacleOutcome.price, pinnacleOpposing.price),
            odds: outcome.price
          }
        } else {
          bookData[book.key] = { edge: null, odds: null }
        }
      })
      
      const gameDate = new Date(event.commence_time)
      const dateStr = gameDate.toLocaleDateString([], { month: 'short', day: 'numeric' })
      const timeStr = gameDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
      
      return {
        id: event.id,
        homeTeam: event.home_team,
        awayTeam: event.away_team,
        displayName: `${event.away_team.split(' ').pop()} @ ${event.home_team.split(' ').pop()}`,
        gameTime: `${dateStr}, ${timeStr}`,
        bookData
      }
    })
  }

  const heatmapData = getHeatmapData()
  const hasData = heatmapData.some(row => Object.values(row.bookData).some(d => d.odds !== null))

  return (
    <div className="card">
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Grid3X3 className="w-5 h-5 text-green-400" />
            <h2 className="font-semibold">Edge Heatmap</h2>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={selectedMarket}
              onChange={(e) => setSelectedMarket(e.target.value as MarketType)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm"
            >
              <option value="h2h">Moneyline</option>
              <option value="spreads">Spread</option>
              <option value="totals">Total</option>
            </select>
            
            <select
              value={selectedSide}
              onChange={(e) => setSelectedSide(e.target.value as 'home' | 'away')}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm"
            >
              <option value="home">Home</option>
              <option value="away">Away</option>
            </select>
          </div>
        </div>
      </div>

      {!hasData ? (
        <div className="p-8 text-center text-slate-500">
          <p>No edge data available. Refresh to load odds.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left p-3 font-medium text-slate-400">Game</th>
                {DISPLAY_BOOKS.map(book => (
                  <th key={book.key} className={`p-3 font-medium text-center min-w-[80px] text-xs ${book.isBaseline ? 'text-cyan-400 bg-cyan-500/5' : 'text-slate-400'}`}>
                    <div>{book.name}</div>
                    {book.isBaseline && <div className="text-[10px] opacity-70">Fair Odds</div>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {heatmapData.map(row => (
                <tr key={row.id} className="border-b border-slate-800/50">
                  <td className="p-3 whitespace-nowrap">
                    <div className="font-medium text-slate-300">{row.displayName}</div>
                    <div className="text-xs text-slate-500">{row.gameTime}</div>
                  </td>
                  {DISPLAY_BOOKS.map(book => {
                    const data = row.bookData[book.key]
                    const isBaseline = book.isBaseline
                    
                    return (
                      <td key={book.key} className={`p-1.5 ${isBaseline ? 'bg-cyan-500/5' : ''}`}>
                        {isBaseline ? (
                          // Pinnacle baseline - show actual odds
                          data.odds !== null ? (
                            <div className="bg-cyan-900/30 border border-cyan-700/30 rounded p-2 text-center font-mono text-xs text-cyan-300">
                              {data.odds > 0 ? '+' : ''}{data.odds}
                            </div>
                          ) : (
                            <div className="bg-slate-800/30 rounded p-2 text-center text-slate-600 text-xs">
                              —
                            </div>
                          )
                        ) : (
                          // Other books - show edge %
                          data.edge !== null ? (
                            <div
                              className={`${getEdgeColor(data.edge)} ${getEdgeTextColor(data.edge)} rounded p-2 text-center font-mono text-xs`}
                              title={`Odds: ${data.odds !== null ? (data.odds > 0 ? '+' : '') + data.odds : 'N/A'}`}
                            >
                              {data.edge >= 0 ? '+' : ''}{data.edge.toFixed(1)}%
                            </div>
                          ) : (
                            <div className="bg-slate-800/30 rounded p-2 text-center text-slate-600 text-xs">
                              —
                            </div>
                          )
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="p-3 border-t border-slate-800 flex items-center gap-2 text-xs text-slate-500">
        <Info className="w-3.5 h-3.5" />
        <span>Pinnacle shows fair odds (baseline). Other books show edge % vs Pinnacle. Green = +EV.</span>
      </div>
    </div>
  )
}
