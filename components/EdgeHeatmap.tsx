'use client'

import { useState, useMemo } from 'react'
import { OddsEvent } from '@/lib/types'
import {
  americanToDecimal,
  collectQuotedLines,
  getOpposingOutcomeForNoVig,
  impliedProbability,
  marketKindLabel,
  outcomeKey,
  type MarketKind,
} from '@/lib/odds-utils'
import { Grid3X3, Info } from 'lucide-react'

interface EdgeHeatmapProps {
  events: OddsEvent[]
}

const BOOK_NAMES: { [key: string]: string } = {
  pinnacle: 'Pinnacle',
  draftkings: 'DraftKings',
  fanduel: 'FanDuel',
  betmgm: 'BetMGM',
  caesars: 'Caesars',
  pointsbetus: 'PointsBet',
  betrivers: 'BetRivers',
}

interface BetTypeData {
  betType: string
  market: string
  point?: number
  pinnacleOdds: number | null
  pinnacleNoVigProb: number | null
  bookOdds: { bookKey: string; bookName: string; odds: number; edge: number }[]
  bestOdds: number | null
  isAlt: boolean
}

function calculateNoVigProb(odds1: number, odds2: number): [number, number] {
  const imp1 = impliedProbability(odds1)
  const imp2 = impliedProbability(odds2)
  const total = imp1 + imp2
  return [imp1 / total, imp2 / total]
}

function calculateEdge(bookOdds: number, fairProb: number): number {
  const bookDecimal = americanToDecimal(bookOdds)
  const ev = (fairProb * (bookDecimal - 1)) - (1 - fairProb)
  return ev * 100
}

export default function EdgeHeatmap({ events }: EdgeHeatmapProps) {
  const [selectedEventId, setSelectedEventId] = useState<string>(events[0]?.id || '')
  const [showAllAlts, setShowAllAlts] = useState(false)

  const selectedEvent = events.find(e => e.id === selectedEventId)

  const betTypes = useMemo(() => {
    if (!selectedEvent) return []

    const pinnacle = selectedEvent.bookmakers.find(b => b.key === 'pinnacle')
    const otherBooks = selectedEvent.bookmakers.filter(b => b.key !== 'pinnacle')
    const kinds: MarketKind[] = ['h2h', 'spreads', 'totals']
    const results: BetTypeData[] = []

    kinds.forEach(kind => {
      const pinnacleLines = pinnacle ? collectQuotedLines(pinnacle, kind) : []
      if (pinnacleLines.length < 2 && kind !== 'h2h') return

      pinnacleLines.forEach(line => {
        const opposing = getOpposingOutcomeForNoVig(
          line.sourceMarketKey,
          pinnacleLines.map(l => ({ name: l.name, price: l.price, point: l.point })),
          { name: line.name, price: line.price, point: line.point }
        )
        if (!opposing) return

        const [fairProb] = calculateNoVigProb(line.price, opposing.price)

        let betTypeLabel = line.name
        if (kind === 'spreads' && line.point !== undefined) {
          betTypeLabel = `${line.name} ${line.point > 0 ? '+' : ''}${line.point}`
        } else if (kind === 'totals' && line.point !== undefined) {
          betTypeLabel = `${line.name} ${line.point}`
        }

        const bookOdds: { bookKey: string; bookName: string; odds: number; edge: number }[] = []

        otherBooks.forEach(bookmaker => {
          const match = collectQuotedLines(bookmaker, kind).find(
            o => outcomeKey(o.name, o.point) === outcomeKey(line.name, line.point)
          )
          if (!match) return
          bookOdds.push({
            bookKey: bookmaker.key,
            bookName: BOOK_NAMES[bookmaker.key] || bookmaker.title,
            odds: match.price,
            edge: calculateEdge(match.price, fairProb),
          })
        })

        bookOdds.sort((a, b) => b.edge - a.edge)
        const bestOdds = bookOdds.length > 0 ? bookOdds[0].odds : null
        const maxEdge = bookOdds[0]?.edge ?? 0

        if (line.isAlt && !showAllAlts && maxEdge < 1) return

        results.push({
          betType: betTypeLabel,
          market: marketKindLabel(kind),
          point: line.point,
          pinnacleOdds: line.price,
          pinnacleNoVigProb: fairProb,
          bookOdds,
          bestOdds,
          isAlt: line.isAlt,
        })
      })
    })

    return results
  }, [selectedEvent, showAllAlts])

  const formatOdds = (odds: number) => odds > 0 ? `+${odds}` : `${odds}`

  return (
    <div className="card">
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Grid3X3 className="w-5 h-5 text-green-400" />
            <h2 className="font-semibold">Edge Heatmap</h2>
          </div>
          
          <div className="flex items-center gap-3 flex-wrap">
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm"
          >
            {events.map(event => {
              const gameDate = new Date(event.commence_time)
              const dateStr = gameDate.toLocaleDateString([], { month: 'short', day: 'numeric' })
              const timeStr = gameDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
              return (
                <option key={event.id} value={event.id}>
                  {event.away_team.split(' ').pop()} @ {event.home_team.split(' ').pop()} • {dateStr}, {timeStr}
                </option>
              )
            })}
          </select>
          <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showAllAlts}
              onChange={e => setShowAllAlts(e.target.checked)}
              className="rounded border-slate-600 bg-slate-800 text-green-500 focus:ring-green-500/40"
            />
            All alt lines
          </label>
          </div>
        </div>
      </div>

      {!selectedEvent || betTypes.length === 0 ? (
        <div className="p-8 text-center text-slate-500">
          <p>No odds data available. Refresh to load odds.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left p-3 font-medium text-slate-400 sticky left-0 bg-[#0f1117] z-10">Bet Type</th>
                <th className="p-3 font-medium text-cyan-400 text-center min-w-[90px] bg-cyan-500/5">
                  <div>Pinnacle</div>
                  <div className="text-[10px] opacity-70 font-normal">Fair Odds</div>
                </th>
                <th colSpan={10} className="p-3 font-medium text-slate-400 text-left text-xs">
                  Books (sorted by edge, best → worst)
                </th>
              </tr>
            </thead>
            <tbody>
              {betTypes.map((bet, idx) => (
                <tr key={idx} className="border-b border-slate-800/50">
                  <td className="p-3 whitespace-nowrap sticky left-0 bg-[#0f1117] z-10">
                    <div className="font-medium text-slate-300 inline-flex items-center gap-1.5">
                      {bet.betType}
                      {bet.isAlt && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide bg-purple-500/15 text-purple-300 border border-purple-500/30">Alt</span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500">{bet.market}</div>
                  </td>
                  
                  {/* Pinnacle Fair Odds */}
                  <td className="p-1.5 bg-cyan-500/5">
                    {bet.pinnacleOdds !== null ? (
                      <div className="bg-cyan-900/30 border border-cyan-700/30 rounded p-2 text-center font-mono text-xs text-cyan-300">
                        {formatOdds(bet.pinnacleOdds)}
                      </div>
                    ) : (
                      <div className="bg-slate-800/30 rounded p-2 text-center text-slate-600 text-xs">—</div>
                    )}
                  </td>
                  
                  {/* Book odds sorted by edge */}
                  {bet.bookOdds.map((book, bookIdx) => {
                    const isBest = book.odds === bet.bestOdds
                    const isPositiveEdge = book.edge > 0
                    
                    return (
                      <td key={book.bookKey} className="p-1.5">
                        <div
                          className={`rounded p-2 text-center text-xs ${
                            isBest 
                              ? 'bg-green-600/30 border border-green-500/40' 
                              : isPositiveEdge
                                ? 'bg-green-900/20 border border-green-800/30'
                                : 'bg-slate-800/50 border border-slate-700/30'
                          }`}
                        >
                          <div className={`font-mono ${isBest ? 'text-green-300 font-semibold' : 'text-slate-300'}`}>
                            {formatOdds(book.odds)}
                          </div>
                          <div className={`text-[10px] mt-0.5 ${book.edge >= 0 ? 'text-green-400' : 'text-slate-500'}`}>
                            {book.edge >= 0 ? '+' : ''}{book.edge.toFixed(1)}%
                          </div>
                          <div className="text-[10px] text-slate-500 truncate">{book.bookName}</div>
                        </div>
                      </td>
                    )
                  })}
                  
                  {/* Fill empty cells if fewer than 6 books */}
                  {Array.from({ length: Math.max(0, 6 - bet.bookOdds.length) }).map((_, i) => (
                    <td key={`empty-${i}`} className="p-1.5">
                      <div className="bg-slate-800/20 rounded p-2 text-center text-slate-700 text-xs">—</div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="p-3 border-t border-slate-800 flex items-center gap-2 text-xs text-slate-500">
        <Info className="w-3.5 h-3.5" />
        <span>Pinnacle = fair odds baseline. Books sorted left→right by edge. Green highlight = best available odds. Alt rows with under 1% edge are hidden unless &quot;All alt lines&quot; is on.</span>
      </div>
    </div>
  )
}
