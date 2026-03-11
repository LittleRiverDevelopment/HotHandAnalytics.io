'use client'

import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { User, TrendingUp, Target, Calendar, ChevronDown, BarChart3 } from 'lucide-react'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ChartData, ChartOptions } from 'chart.js'
import { Bar } from 'react-chartjs-2'
import { PlayerProp, StatType, STAT_LABELS, PlayerGameLog } from '@/lib/types'
import { PLAYER_STAT_LINES } from '@/lib/mock-data'
import { format, parseISO } from 'date-fns'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

interface Props {
  playerProps: PlayerProp[]
}

const STAT_OPTIONS: StatType[] = ['PTS', 'REB', 'AST', 'BLK']

export default function PlayerPropAnalyzer({ playerProps }: Props) {
  const [selectedPlayer, setSelectedPlayer] = useState(playerProps[0]?.playerId || '')
  const [selectedStat, setSelectedStat] = useState<StatType>('PTS')
  const [propLine, setPropLine] = useState(25.5)
  const [numGames, setNumGames] = useState(20)
  const [isPlayerDropdownOpen, setIsPlayerDropdownOpen] = useState(false)
  
  const currentProp = useMemo(() => {
    return playerProps.find(p => p.playerId === selectedPlayer)
  }, [playerProps, selectedPlayer])
  
  useEffect(() => {
    if (selectedPlayer && PLAYER_STAT_LINES[selectedPlayer]) {
      setPropLine(PLAYER_STAT_LINES[selectedPlayer][selectedStat] || 20)
    }
  }, [selectedPlayer, selectedStat])
  
  const filteredGames = useMemo(() => {
    if (!currentProp) return []
    return currentProp.recentGames.slice(-numGames)
  }, [currentProp, numGames])
  
  const getStatValue = (game: PlayerGameLog): number => {
    switch (selectedStat) {
      case 'PTS': return game.points
      case 'REB': return game.rebounds
      case 'AST': return game.assists
      case 'BLK': return game.blocks
      case 'STL': return game.steals
      default: return game.points
    }
  }
  
  const hitRate = useMemo(() => {
    if (filteredGames.length === 0) return 0
    const hits = filteredGames.filter(g => getStatValue(g) > propLine).length
    return (hits / filteredGames.length) * 100
  }, [filteredGames, propLine, selectedStat])
  
  const avgValue = useMemo(() => {
    if (filteredGames.length === 0) return 0
    return filteredGames.reduce((sum, g) => sum + getStatValue(g), 0) / filteredGames.length
  }, [filteredGames, selectedStat])
  
  const chartData: ChartData<'bar'> = {
    labels: filteredGames.map(g => format(parseISO(g.date), 'M/d')),
    datasets: [
      {
        label: STAT_LABELS[selectedStat],
        data: filteredGames.map(g => getStatValue(g)),
        backgroundColor: filteredGames.map(g => 
          getStatValue(g) > propLine 
            ? 'rgba(34, 197, 94, 0.8)' 
            : getStatValue(g) < propLine 
              ? 'rgba(239, 68, 68, 0.8)' 
              : 'rgba(100, 116, 139, 0.8)'
        ),
        borderColor: filteredGames.map(g => 
          getStatValue(g) > propLine 
            ? 'rgb(34, 197, 94)' 
            : getStatValue(g) < propLine 
              ? 'rgb(239, 68, 68)' 
              : 'rgb(100, 116, 139)'
        ),
        borderWidth: 1,
        borderRadius: 4,
      }
    ]
  }
  
  const chartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(18, 20, 26, 0.95)',
        titleColor: '#f1f5f9',
        bodyColor: '#94a3b8',
        borderColor: 'rgba(30, 33, 41, 0.8)',
        borderWidth: 1,
        padding: 12,
        callbacks: {
          title: (items) => {
            const idx = items[0].dataIndex
            const game = filteredGames[idx]
            return `${format(parseISO(game.date), 'MMM d, yyyy')} ${game.matchup}`
          },
          label: (item) => {
            const value = item.raw as number
            const diff = value - propLine
            const sign = diff > 0 ? '+' : ''
            return `${STAT_LABELS[selectedStat]}: ${value} (${sign}${diff.toFixed(1)} vs line)`
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(30, 33, 41, 0.5)',
        },
        ticks: {
          color: '#64748b',
          maxRotation: 45,
          minRotation: 45,
          font: { size: 10 }
        }
      },
      y: {
        grid: {
          color: 'rgba(30, 33, 41, 0.5)',
        },
        ticks: {
          color: '#64748b',
        },
        beginAtZero: true,
      }
    }
  }
  
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <User className="w-5 h-5 text-purple-400" />
        <h2 className="text-lg font-semibold">Player Prop Analyzer</h2>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-1 space-y-4">
          <div className="card p-4 space-y-4">
            <div className="relative">
              <label className="block text-sm text-slate-400 mb-1">Player</label>
              <button
                onClick={() => setIsPlayerDropdownOpen(!isPlayerDropdownOpen)}
                className="w-full flex items-center justify-between bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-left focus:outline-none focus:border-green-500"
              >
                <span>{currentProp?.playerName || 'Select player'}</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${isPlayerDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              
              <AnimatePresence>
                {isPlayerDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg overflow-hidden z-10"
                  >
                    {playerProps.map(prop => (
                      <button
                        key={prop.playerId}
                        onClick={() => {
                          setSelectedPlayer(prop.playerId)
                          setIsPlayerDropdownOpen(false)
                        }}
                        className={`w-full px-3 py-2 text-left hover:bg-slate-700 transition-colors ${
                          selectedPlayer === prop.playerId ? 'bg-green-500/10 text-green-400' : ''
                        }`}
                      >
                        <span className="font-medium">{prop.playerName}</span>
                        <span className="text-slate-500 ml-2">{prop.team}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            <div>
              <label className="block text-sm text-slate-400 mb-1">Stat Type</label>
              <div className="grid grid-cols-2 gap-2">
                {STAT_OPTIONS.map(stat => (
                  <button
                    key={stat}
                    onClick={() => setSelectedStat(stat)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedStat === stat 
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                        : 'bg-slate-800/50 border border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    {stat}
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <label className="block text-sm text-slate-400 mb-1">
                Prop Line ({STAT_LABELS[selectedStat]})
              </label>
              <input
                type="number"
                value={propLine}
                onChange={(e) => setPropLine(Number(e.target.value))}
                className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 focus:outline-none focus:border-green-500 mono"
                step="0.5"
                min="0"
              />
            </div>
            
            <div>
              <label className="block text-sm text-slate-400 mb-1">
                Last N Games: {numGames}
              </label>
              <input
                type="range"
                value={numGames}
                onChange={(e) => setNumGames(Number(e.target.value))}
                className="w-full accent-green-500"
                min="5"
                max="30"
                step="1"
              />
              <div className="flex justify-between text-xs text-slate-500">
                <span>5</span>
                <span>30</span>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <div className="card p-3">
              <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                <Target className="w-3 h-3" />
                Hit Rate
              </div>
              <p className={`text-xl font-bold mono ${hitRate >= 50 ? 'text-green-400' : 'text-red-400'}`}>
                {hitRate.toFixed(0)}%
              </p>
            </div>
            
            <div className="card p-3">
              <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                <TrendingUp className="w-3 h-3" />
                Average
              </div>
              <p className={`text-xl font-bold mono ${avgValue > propLine ? 'text-green-400' : 'text-slate-300'}`}>
                {avgValue.toFixed(1)}
              </p>
            </div>
          </div>
        </div>
        
        <div className="lg:col-span-3 card p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-slate-400" />
              <span className="font-medium">
                {currentProp?.playerName} - {STAT_LABELS[selectedStat]} vs Prop Line
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-green-500" />
                <span className="text-slate-400">Over</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-red-500" />
                <span className="text-slate-400">Under</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-6 h-0 border-t-2 border-dashed border-yellow-500" />
                <span className="text-slate-400">Line: {propLine}</span>
              </div>
            </div>
          </div>
          
          <div className="h-[300px]">
            <Bar data={chartData} options={chartOptions} />
          </div>
        </div>
      </div>
      
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="font-medium">Recent Game Log</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="table-header border-b border-slate-700/50">
                <th className="text-left py-2 px-4 text-xs font-medium text-slate-400">Date</th>
                <th className="text-left py-2 px-4 text-xs font-medium text-slate-400">Matchup</th>
                <th className="text-center py-2 px-4 text-xs font-medium text-slate-400">Result</th>
                <th className="text-center py-2 px-4 text-xs font-medium text-slate-400">MIN</th>
                <th className="text-center py-2 px-4 text-xs font-medium text-slate-400">PTS</th>
                <th className="text-center py-2 px-4 text-xs font-medium text-slate-400">REB</th>
                <th className="text-center py-2 px-4 text-xs font-medium text-slate-400">AST</th>
                <th className="text-center py-2 px-4 text-xs font-medium text-slate-400">BLK</th>
                <th className="text-center py-2 px-4 text-xs font-medium text-slate-400">vs Line</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {[...filteredGames].reverse().map((game, idx) => {
                const statValue = getStatValue(game)
                const diff = statValue - propLine
                const isOver = diff > 0
                const isPush = diff === 0
                
                return (
                  <tr key={idx} className="table-row">
                    <td className="py-2 px-4 text-sm">
                      {format(parseISO(game.date), 'MMM d')}
                    </td>
                    <td className="py-2 px-4 text-sm">{game.matchup}</td>
                    <td className="py-2 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        game.result === 'W' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {game.result}
                      </span>
                    </td>
                    <td className="py-2 px-4 text-center text-sm text-slate-400">{game.minutes}</td>
                    <td className={`py-2 px-4 text-center text-sm mono ${selectedStat === 'PTS' ? 'font-bold' : ''}`}>
                      {game.points}
                    </td>
                    <td className={`py-2 px-4 text-center text-sm mono ${selectedStat === 'REB' ? 'font-bold' : ''}`}>
                      {game.rebounds}
                    </td>
                    <td className={`py-2 px-4 text-center text-sm mono ${selectedStat === 'AST' ? 'font-bold' : ''}`}>
                      {game.assists}
                    </td>
                    <td className={`py-2 px-4 text-center text-sm mono ${selectedStat === 'BLK' ? 'font-bold' : ''}`}>
                      {game.blocks}
                    </td>
                    <td className="py-2 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium mono ${
                        isOver ? 'bg-green-500/20 text-green-400' : 
                        isPush ? 'bg-slate-500/20 text-slate-400' : 
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {diff > 0 ? '+' : ''}{diff.toFixed(1)}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
