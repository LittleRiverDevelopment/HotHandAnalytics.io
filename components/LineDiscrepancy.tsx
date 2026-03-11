'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowUpDown, TrendingUp, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { LineDiscrepancy as LineDiscrepancyType } from '@/lib/types'
import { formatOdds } from '@/lib/odds-utils'
import { format } from 'date-fns'

interface Props {
  discrepancies: LineDiscrepancyType[]
}

type SortField = 'spread' | 'game' | 'market' | 'time'
type SortDirection = 'asc' | 'desc'

export default function LineDiscrepancyTable({ discrepancies }: Props) {
  const [sortField, setSortField] = useState<SortField>('spread')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  const [filterMarket, setFilterMarket] = useState<string>('all')
  
  const sortedDiscrepancies = useMemo(() => {
    return [...discrepancies].sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case 'spread':
          comparison = a.spread - b.spread
          break
        case 'game':
          comparison = `${a.homeTeam} vs ${a.awayTeam}`.localeCompare(`${b.homeTeam} vs ${b.awayTeam}`)
          break
        case 'market':
          comparison = a.market.localeCompare(b.market)
          break
        case 'time':
          comparison = new Date(a.commenceTime).getTime() - new Date(b.commenceTime).getTime()
          break
      }
      return sortDirection === 'desc' ? -comparison : comparison
    })
  }, [discrepancies, sortField, sortDirection])
  
  const filteredDiscrepancies = useMemo(() => {
    if (filterMarket === 'all') return sortedDiscrepancies
    return sortedDiscrepancies.filter(d => d.market.toLowerCase() === filterMarket.toLowerCase())
  }, [sortedDiscrepancies, filterMarket])
  
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }
  
  const getEdgeClass = (spread: number) => {
    if (spread >= 15) return 'edge-tag-high'
    if (spread >= 8) return 'edge-tag-medium'
    return 'edge-tag-low'
  }
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-green-400" />
          <h2 className="text-lg font-semibold">Line Discrepancies</h2>
          <span className="text-sm text-slate-400 ml-2">
            {filteredDiscrepancies.length} opportunities
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <select
            value={filterMarket}
            onChange={(e) => setFilterMarket(e.target.value)}
            className="bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-green-500"
          >
            <option value="all">All Markets</option>
            <option value="moneyline">Moneyline</option>
            <option value="spread">Spread</option>
            <option value="total">Total</option>
          </select>
        </div>
      </div>
      
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="table-header border-b border-slate-700/50">
                <th 
                  className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-200"
                  onClick={() => handleSort('game')}
                >
                  <div className="flex items-center gap-1">
                    Game
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th 
                  className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-200"
                  onClick={() => handleSort('market')}
                >
                  <div className="flex items-center gap-1">
                    Market
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Bet
                </th>
                <th className="text-center py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Best Odds
                </th>
                <th className="text-center py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Worst Odds
                </th>
                <th 
                  className="text-center py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-200"
                  onClick={() => handleSort('spread')}
                >
                  <div className="flex items-center justify-center gap-1">
                    Edge
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th 
                  className="text-right py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-200"
                  onClick={() => handleSort('time')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Time
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              <AnimatePresence>
                {filteredDiscrepancies.map((disc, index) => {
                  const rowKey = `${disc.eventId}-${disc.market}-${disc.betType}`
                  const isExpanded = expandedRow === rowKey
                  
                  return (
                    <motion.tr
                      key={rowKey}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ delay: index * 0.03 }}
                      className="table-row cursor-pointer"
                      onClick={() => setExpandedRow(isExpanded ? null : rowKey)}
                    >
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">{disc.awayTeam}</span>
                          <span className="text-slate-400 text-sm">@ {disc.homeTeam}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 bg-slate-800 rounded text-xs font-medium">
                          {disc.market}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm">{disc.betType}</td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex flex-col items-center">
                          <span className="odds-badge text-green-400 font-semibold">
                            {formatOdds(disc.bestOdds)}
                          </span>
                          <span className="text-xs text-slate-500">{disc.bestBook}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex flex-col items-center">
                          <span className="odds-badge text-slate-400">
                            {formatOdds(disc.worstOdds)}
                          </span>
                          <span className="text-xs text-slate-500">{disc.worstBook}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`edge-tag ${getEdgeClass(disc.spread)}`}>
                          +{disc.spread}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex flex-col items-end">
                          <span className="text-sm">
                            {format(new Date(disc.commenceTime), 'h:mm a')}
                          </span>
                          <span className="text-xs text-slate-500">
                            {format(new Date(disc.commenceTime), 'MMM d')}
                          </span>
                        </div>
                      </td>
                    </motion.tr>
                  )
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
        
        {filteredDiscrepancies.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <AlertCircle className="w-8 h-8 mb-2" />
            <p>No line discrepancies found</p>
            <p className="text-sm text-slate-500">Check back closer to game time</p>
          </div>
        )}
      </div>
      
      <div className="card p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-green-500/10 rounded-lg">
            <TrendingUp className="w-4 h-4 text-green-400" />
          </div>
          <div>
            <h3 className="font-medium text-sm">How to use Line Discrepancies</h3>
            <p className="text-sm text-slate-400 mt-1">
              Line discrepancies show the difference in odds between sportsbooks. 
              A higher edge means a bigger price difference. Always bet the best available line.
              An edge of 10+ cents is considered significant.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
