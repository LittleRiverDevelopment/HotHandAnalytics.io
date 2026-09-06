'use client'

import { useState, useMemo } from 'react'
import { Scale, TrendingUp, Zap, AlertTriangle, ArrowUpDown, Download } from 'lucide-react'
import { ArbitrageOpportunity, ScoreEvent } from '@/lib/types'
import { formatOdds } from '@/lib/odds-utils'
import { format } from 'date-fns'
import BookOpenLink from './BookOpenLink'
import LiveScoreBadge, { findScoreForGame } from './LiveScore'
import AltLineBadge from './AltLineBadge'
import { downloadCsv, arbitrageToCsvRows } from '@/lib/csv-export'

interface Props {
  arbs: ArbitrageOpportunity[]
  scores?: ScoreEvent[]
}

type SortField = 'profit' | 'confidence' | 'game' | 'time'

export default function ArbitrageFinder({ arbs, scores }: Props) {
  const [sortField, setSortField] = useState<SortField>('profit')
  const [minProfit, setMinProfit] = useState(0)
  const [stakeTotal, setStakeTotal] = useState(1000)

  const sortedArbs = useMemo(() => {
    return [...arbs]
      .filter(a => a.profitPercent >= minProfit)
      .sort((a, b) => {
        switch (sortField) {
          case 'profit':
            return b.profitPercent - a.profitPercent
          case 'confidence':
            return b.confidenceScore - a.confidenceScore
          case 'game':
            return `${a.homeTeam} vs ${a.awayTeam}`.localeCompare(`${b.homeTeam} vs ${b.awayTeam}`)
          case 'time':
            return new Date(a.commenceTime).getTime() - new Date(b.commenceTime).getTime()
          default:
            return 0
        }
      })
  }, [arbs, sortField, minProfit])

  const getProfitColor = (p: number) => {
    if (p >= 3) return 'text-green-400'
    if (p >= 1.5) return 'text-emerald-400'
    if (p >= 0.5) return 'text-yellow-400'
    return 'text-orange-400'
  }

  const getConfidenceClass = (score: number) => {
    if (score >= 70) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
    if (score >= 45) return 'text-amber-300 bg-amber-500/10 border-amber-500/25'
    return 'text-slate-400 bg-slate-800/80 border-slate-600/50'
  }

  const totalGuaranteedProfit = useMemo(() => {
    return sortedArbs.reduce((sum, a) => sum + (stakeTotal * a.profitPercent) / 100, 0)
  }, [sortedArbs, stakeTotal])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <Scale className="w-5 h-5 text-green-400" />
          <h2 className="text-lg font-semibold">Arbitrage Finder</h2>
          <span className="text-sm text-slate-400 ml-2">
            {sortedArbs.length} locked-in {sortedArbs.length === 1 ? 'opportunity' : 'opportunities'}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-400">Min Profit%</label>
            <input
              type="number"
              value={minProfit}
              onChange={(e) => setMinProfit(Number(e.target.value))}
              className="w-16 bg-slate-800/50 border border-slate-700 rounded-lg px-2 py-1 text-sm focus:outline-none focus:border-green-500 mono"
              min="0"
              max="20"
              step="0.1"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-400">Total Stake</label>
            <input
              type="number"
              value={stakeTotal}
              onChange={(e) => setStakeTotal(Number(e.target.value))}
              className="w-24 bg-slate-800/50 border border-slate-700 rounded-lg px-2 py-1 text-sm focus:outline-none focus:border-green-500 mono"
              min="10"
              step="10"
            />
          </div>

          <button
            type="button"
            onClick={() =>
              downloadCsv(
                `arbitrage-${format(new Date(), 'yyyy-MM-dd-HHmm')}.csv`,
                arbitrageToCsvRows(sortedArbs)
              )
            }
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-slate-600 bg-slate-800/50 text-slate-300 hover:text-green-400 hover:border-green-500/40 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">Opportunities</span>
            <Zap className="w-4 h-4 text-yellow-400" />
          </div>
          <p className="text-2xl font-bold mt-1">{sortedArbs.length}</p>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">Best Profit%</span>
            <TrendingUp className="w-4 h-4 text-green-400" />
          </div>
          <p className="text-2xl font-bold mt-1 text-green-400">
            {sortedArbs.length > 0 ? `+${sortedArbs[0].profitPercent.toFixed(2)}%` : '0.00%'}
          </p>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">Guaranteed Profit</span>
            <Scale className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-2xl font-bold mt-1 text-cyan-400">
            ${totalGuaranteedProfit.toFixed(2)}
          </p>
          <p className="text-xs text-slate-500 mt-1">If ${stakeTotal} split across every leg below</p>
        </div>
      </div>

      <div className="card overflow-hidden">
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
                  Legs (stake split for ${stakeTotal})
                </th>
                <th
                  className="text-center py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-200"
                  onClick={() => setSortField('profit')}
                >
                  <div className="flex items-center justify-center gap-1">
                    Profit%
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  className="text-center py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-200"
                  onClick={() => setSortField('confidence')}
                  title="Higher with a bigger locked-in margin and closer-together book update times"
                >
                  <div className="flex items-center justify-center gap-1">
                    Confidence
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
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
                {sortedArbs.map(arb => {
                  const liveScore = findScoreForGame(scores, arb.eventId, arb.homeTeam, arb.awayTeam, arb.commenceTime)
                  return (
                    <tr
                      key={`${arb.eventId}-${arb.market}-${arb.legs.map(l => l.selection).join('|')}`}
                      className="table-row align-top"
                    >
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1">
                          <span className="font-medium text-sm">{arb.awayTeam}</span>
                          <span className="text-slate-400 text-sm">@ {arb.homeTeam}</span>
                          <span className="text-xs text-slate-500 inline-flex items-center gap-1.5">
                            {arb.market}
                            {arb.isAltLine && <AltLineBadge />}
                          </span>
                          {liveScore && (
                            <LiveScoreBadge score={liveScore} homeTeam={arb.homeTeam} awayTeam={arb.awayTeam} />
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1.5">
                          {arb.legs.map((leg, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <span className="text-sm font-medium min-w-[8rem]">{leg.selection}</span>
                              <span className="odds-badge text-green-400 font-semibold">
                                {formatOdds(leg.odds)}
                              </span>
                              <span className="px-2 py-0.5 bg-slate-800 rounded text-xs shrink-0">
                                {leg.book}
                              </span>
                              <BookOpenLink bookTitle={leg.book} deepLink={leg.deepLink} stopPropagation />
                              <span className="text-cyan-400 mono text-xs ml-auto shrink-0">
                                ${((stakeTotal * leg.stakePercent) / 100).toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`font-bold mono ${getProfitColor(arb.profitPercent)}`}>
                          +{arb.profitPercent.toFixed(2)}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex min-w-[3rem] justify-center rounded-md border px-2 py-1 font-mono text-sm font-semibold tabular-nums ${getConfidenceClass(arb.confidenceScore)}`}
                        >
                          {arb.confidenceScore}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex flex-col items-end">
                          <span className="text-sm">{format(new Date(arb.commenceTime), 'h:mm a')}</span>
                          <span className="text-xs text-slate-500">
                            {format(new Date(arb.commenceTime), 'MMM d, yyyy')}
                          </span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>

        {sortedArbs.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <AlertTriangle className="w-8 h-8 mb-2" />
            <p>No arbitrage opportunities right now</p>
            <p className="text-sm text-slate-500">True arbs are rare and close fast — try lowering the minimum profit%</p>
          </div>
        )}
      </div>

      <div className="card p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-yellow-500/10 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-yellow-400" />
          </div>
          <div>
            <h3 className="font-medium text-sm">Understanding Arbitrage Betting</h3>
            <p className="text-sm text-slate-400 mt-1">
              Each row bets every side of the same market at different books where the combined implied
              probability is under 100% — a profit locked in no matter which side wins. The stake split
              for each leg is sized so every outcome pays back the exact same profit. Odds move fast:
              confirm both prices are still live before placing either leg, and place the leg with the
              tighter line or lower limits first. Confidence (0–100) is higher with a bigger margin and
              when both books updated their lines close together in time (less risk one side already moved).
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
