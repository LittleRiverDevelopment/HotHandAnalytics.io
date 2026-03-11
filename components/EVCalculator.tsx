'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calculator, TrendingUp, Zap, AlertTriangle, ArrowUpDown } from 'lucide-react'
import { EVBet } from '@/lib/types'
import { formatOdds } from '@/lib/odds-utils'

interface Props {
  evBets: EVBet[]
}

type SortField = 'ev' | 'kelly' | 'game' | 'time'

export default function EVCalculator({ evBets }: Props) {
  const [sortField, setSortField] = useState<SortField>('ev')
  const [minEV, setMinEV] = useState(0)
  const [bankroll, setBankroll] = useState(1000)
  
  const sortedBets = useMemo(() => {
    return [...evBets]
      .filter(bet => bet.evPercent >= minEV)
      .sort((a, b) => {
        switch (sortField) {
          case 'ev':
            return b.evPercent - a.evPercent
          case 'kelly':
            return b.kellyCriterion - a.kellyCriterion
          case 'game':
            return `${a.homeTeam} vs ${a.awayTeam}`.localeCompare(`${b.homeTeam} vs ${b.awayTeam}`)
          case 'time':
            return new Date(a.commenceTime).getTime() - new Date(b.commenceTime).getTime()
          default:
            return 0
        }
      })
  }, [evBets, sortField, minEV])
  
  const getEVColor = (ev: number) => {
    if (ev >= 5) return 'text-green-400'
    if (ev >= 3) return 'text-emerald-400'
    if (ev >= 1) return 'text-yellow-400'
    return 'text-orange-400'
  }
  
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
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <Calculator className="w-5 h-5 text-green-400" />
          <h2 className="text-lg font-semibold">+EV Finder</h2>
          <span className="text-sm text-slate-400 ml-2">
            {sortedBets.length} positive EV bets
          </span>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-400">Min EV%</label>
            <input
              type="number"
              value={minEV}
              onChange={(e) => setMinEV(Number(e.target.value))}
              className="w-16 bg-slate-800/50 border border-slate-700 rounded-lg px-2 py-1 text-sm focus:outline-none focus:border-green-500 mono"
              min="0"
              max="20"
              step="0.5"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-400">Bankroll</label>
            <input
              type="number"
              value={bankroll}
              onChange={(e) => setBankroll(Number(e.target.value))}
              className="w-24 bg-slate-800/50 border border-slate-700 rounded-lg px-2 py-1 text-sm focus:outline-none focus:border-green-500 mono"
              min="100"
              step="100"
            />
          </div>
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
                  onClick={() => setSortField('kelly')}
                >
                  <div className="flex items-center justify-center gap-1">
                    Kelly Bet
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="text-center py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Book
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              <AnimatePresence>
                {sortedBets.map((bet, index) => (
                  <motion.tr
                    key={`${bet.eventId}-${bet.selection}-${bet.book}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ delay: index * 0.03 }}
                    className="table-row"
                  >
                    <td className="py-3 px-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">{bet.awayTeam}</span>
                        <span className="text-slate-400 text-sm">@ {bet.homeTeam}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{bet.selection}</span>
                        <span className="text-xs text-slate-500">{bet.market}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="odds-badge text-green-400 font-semibold">
                        {formatOdds(bet.odds)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="odds-badge text-slate-400">
                        {formatOdds(bet.fairOdds)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`font-bold mono ${getEVColor(bet.evPercent)}`}>
                        +{bet.evPercent.toFixed(1)}%
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
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-1 bg-slate-800 rounded text-xs">
                        {bet.book}
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
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
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
