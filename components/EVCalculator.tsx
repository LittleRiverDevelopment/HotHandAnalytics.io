'use client'

import { Fragment, useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Calculator, TrendingUp, Zap, AlertTriangle, ArrowUpDown, Download, ChevronDown, ChevronUp } from 'lucide-react'
import { EVBet, ScoreEvent } from '@/lib/types'
import { formatOdds, formatOddsTimestamp } from '@/lib/odds-utils'
import { format } from 'date-fns'
import BookOpenLink from './BookOpenLink'
import LiveScoreBadge, { findScoreForGame } from './LiveScore'
import AltLineBadge from './AltLineBadge'
import { downloadCsv, evBetsToCsvRows } from '@/lib/csv-export'
import BookFilter, { bookOptions } from './BookFilter'
import FairOddsTile from './FairOddsTile'

interface Props {
  evBets: EVBet[]
  scores?: ScoreEvent[]
}

type SortField = 'ev' | 'confidence' | 'kelly' | 'game' | 'time' | 'book'

const VISIBLE_ROW_CAP = 40

function LineComparison({ bet }: { bet: EVBet }) {
  const rows = [...(bet.allBookOdds ?? [])].sort((a, b) => b.odds - a.odds)
  const best = rows[0]?.odds
  const worst = rows[rows.length - 1]?.odds

  return (
    <div onClick={e => e.stopPropagation()}>
      <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">
        All lines — {bet.selection} ({bet.market})
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
        <FairOddsTile odds={bet.fairOdds} point={rows[0]?.point} />
        {rows.map((row, i) => {
          const isBest = row.odds === best
          const isWorst = row.odds === worst
          return (
            <div
              key={`${row.book}-${i}`}
              className={`rounded-lg border px-3 py-2.5 text-center ${
                isBest
                  ? 'border-green-500/50 bg-green-500/10'
                  : isWorst
                    ? 'border-slate-600 bg-slate-800/40'
                    : 'border-slate-700/50 bg-slate-800/30'
              }`}
            >
              <div className="text-[10px] text-slate-500 truncate flex items-center justify-center gap-1" title={row.book}>
                <span className="truncate">{row.book}</span>
                <BookOpenLink bookTitle={row.book} deepLink={row.link} />
              </div>
              <div className={`font-mono text-sm font-semibold mt-1 ${isBest ? 'text-green-400' : 'text-slate-200'}`}>
                {formatOdds(row.odds)}
              </div>
              {row.point !== undefined && (
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Line {row.point > 0 ? '+' : ''}{row.point}
                </div>
              )}
              {isBest && <span className="text-[10px] text-green-400/90">Best</span>}
              {isWorst && !isBest && <span className="text-[10px] text-slate-500">Worst</span>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function EVCalculator({ evBets, scores }: Props) {
  const [sortField, setSortField] = useState<SortField>('ev')
  const [minEV, setMinEV] = useState(0)
  const [bankroll, setBankroll] = useState(1000)
  const [marketFilter, setMarketFilter] = useState('all')
  const [bookFilter, setBookFilter] = useState('all')
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  const books = useMemo(() => bookOptions(evBets.map(bet => bet.book)), [evBets])

  const sortedBets = useMemo(() => {
    return [...evBets]
      .filter(bet => bet.evPercent >= minEV)
      .filter(bet => {
        if (marketFilter === 'alt') return !!bet.isAltLine
        if (marketFilter === 'all') return true
        return bet.market.toLowerCase() === marketFilter.toLowerCase()
      })
      .filter(bet => bookFilter === 'all' || bet.book === bookFilter)
      .sort((a, b) => {
        switch (sortField) {
          case 'ev':
            return b.evPercent - a.evPercent
          case 'confidence':
            return b.confidenceScore - a.confidenceScore
          case 'kelly':
            return b.kellyCriterion - a.kellyCriterion
          case 'game':
            return `${a.homeTeam} vs ${a.awayTeam}`.localeCompare(`${b.homeTeam} vs ${b.awayTeam}`)
          case 'time':
            return new Date(a.commenceTime).getTime() - new Date(b.commenceTime).getTime()
          case 'book':
            return a.book.localeCompare(b.book)
          default:
            return 0
        }
      })
  }, [evBets, sortField, minEV, marketFilter, bookFilter])
  
  const getEVColor = (ev: number) => {
    if (ev >= 5) return 'text-green-400'
    if (ev >= 3) return 'text-emerald-400'
    if (ev >= 1) return 'text-yellow-400'
    return 'text-orange-400'
  }

  const getConfidenceClass = (score: number) => {
    if (score >= 70) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
    if (score >= 45) return 'text-amber-300 bg-amber-500/10 border-amber-500/25'
    return 'text-slate-400 bg-slate-800/80 border-slate-600/50'
  }
  
  const formatPinnacleAsOf = (iso: string) => formatOddsTimestamp(iso)

  const getKellyBet = (kelly: number) => {
    const fractionalKelly = kelly * 0.25
    return Math.round(bankroll * fractionalKelly)
  }
  
  const totalExpectedValue = useMemo(() => {
    return sortedBets.reduce((sum, bet) => {
      const betAmount = getKellyBet(bet.kellyCriterion)
      return sum + (betAmount * bet.ev)
    }, 0)
  }, [sortedBets, bankroll])

  const visibleBets = sortedBets.slice(0, VISIBLE_ROW_CAP)
  
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <Calculator className="w-5 h-5 text-green-400 shrink-0" />
          <h2 className="text-lg font-semibold">+EV Finder</h2>
          <span className="text-sm text-slate-400">
            {sortedBets.length}
            {sortedBets.length > VISIBLE_ROW_CAP && (
              <span className="text-slate-500"> · top {VISIBLE_ROW_CAP}</span>
            )}
          </span>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <BookFilter value={bookFilter} books={books} onChange={setBookFilter} />
          <select
            aria-label="Market"
            value={marketFilter}
            onChange={e => setMarketFilter(e.target.value)}
            className="flex-1 sm:flex-none min-h-[44px] bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
          >
            <option value="all">All Markets</option>
            <option value="moneyline">Moneyline</option>
            <option value="spread">Spread</option>
            <option value="total">Total</option>
            <option value="alt">Alt lines only</option>
          </select>
          <label className="flex items-center gap-2 min-h-[44px] text-sm text-slate-400">
            Min EV%
            <input
              type="number"
              value={minEV}
              onChange={(e) => setMinEV(Number(e.target.value))}
              className="w-16 min-h-[44px] bg-slate-800/50 border border-slate-700 rounded-lg px-2 py-2 text-sm focus:outline-none focus:border-green-500 mono"
              min="0"
              max="20"
              step="0.5"
            />
          </label>
          <label className="flex items-center gap-2 min-h-[44px] text-sm text-slate-400">
            Bankroll
            <input
              type="number"
              value={bankroll}
              onChange={(e) => setBankroll(Number(e.target.value))}
              className="w-24 min-h-[44px] bg-slate-800/50 border border-slate-700 rounded-lg px-2 py-2 text-sm focus:outline-none focus:border-green-500 mono"
              min="100"
              step="100"
            />
          </label>
          <button
            type="button"
            onClick={() =>
              downloadCsv(
                `ev-finder-${format(new Date(), 'yyyy-MM-dd-HHmm')}.csv`,
                evBetsToCsvRows(sortedBets)
              )
            }
            className="flex items-center justify-center gap-1.5 min-h-[44px] px-3 py-2 text-sm rounded-lg border border-slate-600 bg-slate-800/50 text-slate-300 hover:text-green-400 hover:border-green-500/40 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">Total +EV Bets</span>
            <Zap className="w-4 h-4 text-yellow-400" />
          </div>
          <p className="text-2xl font-bold mt-1">{sortedBets.length}</p>
        </div>
        
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">Avg EV%</span>
            <TrendingUp className="w-4 h-4 text-green-400" />
          </div>
          <p className="text-2xl font-bold mt-1 text-green-400">
            {sortedBets.length > 0 
              ? (sortedBets.reduce((sum, b) => sum + b.evPercent, 0) / sortedBets.length).toFixed(1)
              : '0.0'
            }%
          </p>
        </div>
        
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">Expected Value</span>
            <Calculator className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-2xl font-bold mt-1 text-cyan-400">
            ${totalExpectedValue.toFixed(2)}
          </p>
        </div>
      </div>
      
      <div className="md:hidden space-y-2">
        {visibleBets.map(bet => {
          const rowKey = `${marketFilter}-${bet.eventId}-${bet.selection}-${bet.book}`
          const isExpanded = expandedRow === rowKey
          const liveScore = findScoreForGame(scores, bet.eventId, bet.homeTeam, bet.awayTeam, bet.commenceTime)
          return (
            <div
              key={rowKey}
              role="button"
              tabIndex={0}
              onClick={() => setExpandedRow(isExpanded ? null : rowKey)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setExpandedRow(isExpanded ? null : rowKey)
                }
              }}
              className="card w-full text-left p-3 cursor-pointer"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate inline-flex items-center gap-1.5">
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                    <span className="truncate">{bet.awayTeam} @ {bet.homeTeam}</span>
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5 inline-flex items-center gap-1.5 flex-wrap">
                    <span>{bet.selection}</span>
                    {bet.isAltLine && <AltLineBadge />}
                  </p>
                  {liveScore && (
                    <div className="mt-1">
                      <LiveScoreBadge score={liveScore} homeTeam={bet.homeTeam} awayTeam={bet.awayTeam} />
                    </div>
                  )}
                </div>
                <span className={`font-bold mono shrink-0 ${getEVColor(bet.evPercent)}`}>
                  +{bet.evPercent.toFixed(1)}%
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between gap-2 text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="odds-badge text-green-400 font-semibold">{formatOdds(bet.odds)}</span>
                  <span className="text-slate-500 text-xs">fair {formatOdds(bet.fairOdds)}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="px-2 py-1 bg-slate-800 rounded text-xs">{bet.book}</span>
                  <BookOpenLink bookTitle={bet.book} deepLink={bet.bookDeepLink} stopPropagation />
                </div>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Kelly ${getKellyBet(bet.kellyCriterion)} · {format(new Date(bet.commenceTime), 'MMM d, h:mm a')}
              </p>
              {isExpanded && (
                <div className="mt-3">
                  <LineComparison bet={bet} />
                </div>
              )}
            </div>
          )
        })}
        {sortedBets.length === 0 && (
          <div className="card flex flex-col items-center justify-center py-12 text-slate-400">
            <AlertTriangle className="w-8 h-8 mb-2" />
            <p>No +EV bets match your criteria</p>
            <p className="text-sm text-slate-500">Try lowering the minimum EV%</p>
          </div>
        )}
      </div>

      <div className="hidden md:block card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="table-header border-b border-slate-700/50">
                <th 
                  className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-200"
                  onClick={() => setSortField('game')}
                >
                  <div className="flex items-center gap-1">
                    Game
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Selection
                </th>
                <th className="text-center py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Odds
                </th>
                <th className="text-center py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Fair Odds
                </th>
                <th 
                  className="text-center py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-200"
                  onClick={() => setSortField('ev')}
                >
                  <div className="flex items-center justify-center gap-1">
                    EV%
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th 
                  className="text-center py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-200"
                  onClick={() => setSortField('confidence')}
                  title="Higher when estimated edge and Kelly fraction are larger vs Pinnacle fair odds"
                >
                  <div className="flex items-center justify-center gap-1">
                    Confidence
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th 
                  className="text-center py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-200"
                  onClick={() => setSortField('kelly')}
                >
                  <div className="flex items-center justify-center gap-1">
                    Kelly Bet
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th 
                  className="text-right py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-200"
                  onClick={() => setSortField('time')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Starts
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  className="text-center py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-200"
                  onClick={() => setSortField('book')}
                >
                  <div className="flex items-center justify-center gap-1">
                    Book
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
                {visibleBets.map(bet => {
                  const rowKey = `${marketFilter}-${bet.eventId}-${bet.selection}-${bet.book}`
                  const isExpanded = expandedRow === rowKey
                  const pinnacleAsOf = formatPinnacleAsOf(bet.pinnacleLastUpdate)
                  const liveScore = findScoreForGame(scores, bet.eventId, bet.homeTeam, bet.awayTeam, bet.commenceTime)
                  return (
                  <Fragment key={rowKey}>
                  <tr
                    className={`table-row cursor-pointer hover:bg-slate-800/40 ${isExpanded ? 'bg-slate-800/30' : ''}`}
                    onClick={() => setExpandedRow(isExpanded ? null : rowKey)}
                    aria-expanded={isExpanded}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-start gap-2">
                        <span className="text-slate-500 mt-0.5 shrink-0" aria-hidden>
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </span>
                        <div className="flex flex-col min-w-0 gap-1">
                        <span className="font-medium text-sm">{bet.awayTeam}</span>
                        <span className="text-slate-400 text-sm">@ {bet.homeTeam}</span>
                        {liveScore && (
                          <LiveScoreBadge score={liveScore} homeTeam={bet.homeTeam} awayTeam={bet.awayTeam} />
                        )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium inline-flex items-center gap-1.5">
                          {bet.selection}
                          {bet.isAltLine && <AltLineBadge />}
                        </span>
                        <span className="text-xs text-slate-500">{bet.market}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="odds-badge text-green-400 font-semibold">
                        {formatOdds(bet.odds)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="odds-badge text-slate-400">
                          {formatOdds(bet.fairOdds)}
                        </span>
                        <span className="text-[10px] text-slate-500 leading-tight max-w-[9rem]">
                          {pinnacleAsOf ? (
                            <>Pinnacle line as of {pinnacleAsOf}</>
                          ) : (
                            <span className="text-slate-600">No Pinnacle timestamp</span>
                          )}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`font-bold mono ${getEVColor(bet.evPercent)}`}>
                        +{bet.evPercent.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex min-w-[3rem] justify-center rounded-md border px-2 py-1 font-mono text-sm font-semibold tabular-nums ${getConfidenceClass(bet.confidenceScore)}`}
                      >
                        {bet.confidenceScore}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex flex-col items-center">
                        <span className="font-medium text-cyan-400 mono">
                          ${getKellyBet(bet.kellyCriterion)}
                        </span>
                        <span className="text-xs text-slate-500">
                          {(bet.kellyCriterion * 25).toFixed(1)}% Kelly
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex flex-col items-end">
                        <span className="text-sm">
                          {format(new Date(bet.commenceTime), 'h:mm a')}
                        </span>
                        <span className="text-xs text-slate-500">
                          {format(new Date(bet.commenceTime), 'MMM d, yyyy')}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <span className="px-2 py-1 bg-slate-800 rounded text-xs">
                          {bet.book}
                        </span>
                        <BookOpenLink
                          bookTitle={bet.book}
                          deepLink={bet.bookDeepLink}
                          stopPropagation
                        />
                      </div>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr className="bg-slate-900/50">
                      <td colSpan={9} className="p-0 border-b border-slate-800">
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="px-4 py-4"
                        >
                          <LineComparison bet={bet} />
                        </motion.div>
                      </td>
                    </tr>
                  )}
                  </Fragment>
                  )
                })}
            </tbody>
          </table>
        </div>
        
        {sortedBets.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <AlertTriangle className="w-8 h-8 mb-2" />
            <p>No +EV bets match your criteria</p>
            <p className="text-sm text-slate-500">Try lowering the minimum EV%</p>
          </div>
        )}
      </div>
      
      <div className="card p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-yellow-500/10 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-yellow-400" />
          </div>
          <div>
            <h3 className="font-medium text-sm">Understanding +EV Betting</h3>
            <p className="text-sm text-slate-400 mt-1">
              Fair odds are calculated from <span className="text-cyan-400 font-medium">Pinnacle</span> (industry's sharpest book) with vig removed.
              +EV bets have better odds than Pinnacle's no-vig line. Kelly Criterion suggests 
              optimal bet sizing based on edge. We use quarter-Kelly for conservative bankroll management.
              Confidence (0–100) reflects stronger estimated edge and Kelly-suggested stake versus that fair line.
              Rows are dropped when Pinnacle&apos;s line for that market is more than about 25 minutes older than the local book&apos;s update, or when the fair price cannot be paired to the correct counter-side (common with many alternate lines in one market). Alternate spreads/totals are tagged Alt and compared to Pinnacle&apos;s matching number.
            </p>
            <p className="text-sm text-slate-400 mt-2">
              <strong className="text-slate-300">About bet links:</strong> We use deep links from The Odds API when available.
              If automatic bet slip population isn&apos;t working, see BETTING_LINKS_STATUS.md for details and please report
              which sportsbook(s) previously worked for you.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
