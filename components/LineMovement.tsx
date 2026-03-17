'use client'

import { useState, useEffect } from 'react'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { OddsEvent } from '@/lib/types'
import { TrendingUp, Trash2, Info } from 'lucide-react'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
)

const HISTORY_STORAGE_KEY = 'hothand_line_history'
const MAX_HISTORY_POINTS = 50

interface LineSnapshot {
  timestamp: number
  odds: { [gameId: string]: { [bookKey: string]: number } }
}

interface LineMovementProps {
  events: OddsEvent[]
  onHistoryUpdate?: () => void
}

const BOOK_COLORS: { [key: string]: string } = {
  draftkings: '#53d337',
  fanduel: '#1493ff',
  betmgm: '#c4a634',
  caesars: '#1d5c2e',
  pointsbetus: '#e51a38',
  betrivers: '#0055a5',
  pinnacle: '#dc2626',
}

const BOOK_NAMES: { [key: string]: string } = {
  draftkings: 'DraftKings',
  fanduel: 'FanDuel',
  betmgm: 'BetMGM',
  caesars: 'Caesars',
  pointsbetus: 'PointsBet',
  betrivers: 'BetRivers',
  pinnacle: 'Pinnacle',
}

function getHistory(): LineSnapshot[] {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem(HISTORY_STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function saveHistory(history: LineSnapshot[]): void {
  if (typeof window === 'undefined') return
  try {
    const trimmed = history.slice(-MAX_HISTORY_POINTS)
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(trimmed))
  } catch {
    // localStorage full
  }
}

function clearHistory(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(HISTORY_STORAGE_KEY)
}

export function recordOddsSnapshot(events: OddsEvent[]): void {
  if (events.length === 0) return
  
  const history = getHistory()
  const lastSnapshot = history[history.length - 1]
  
  // Don't record if last snapshot was less than 1 minute ago
  if (lastSnapshot && Date.now() - lastSnapshot.timestamp < 60000) {
    return
  }
  
  const snapshot: LineSnapshot = {
    timestamp: Date.now(),
    odds: {}
  }
  
  events.forEach(event => {
    snapshot.odds[event.id] = {}
    event.bookmakers.forEach(bookmaker => {
      const h2h = bookmaker.markets.find(m => m.key === 'h2h')
      if (h2h && h2h.outcomes[0]) {
        // Store home team moneyline
        const homeOutcome = h2h.outcomes.find(o => o.name === event.home_team)
        if (homeOutcome) {
          snapshot.odds[event.id][bookmaker.key] = homeOutcome.price
        }
      }
    })
  })
  
  history.push(snapshot)
  saveHistory(history)
}

export default function LineMovement({ events }: LineMovementProps) {
  const [history, setHistory] = useState<LineSnapshot[]>([])
  const [selectedGame, setSelectedGame] = useState<string>('')
  const [selectedBooks, setSelectedBooks] = useState<string[]>(['draftkings', 'fanduel', 'pinnacle'])

  useEffect(() => {
    setHistory(getHistory())
    if (events.length > 0 && !selectedGame) {
      setSelectedGame(events[0].id)
    }
  }, [events, selectedGame])

  const handleClearHistory = () => {
    clearHistory()
    setHistory([])
  }

  const toggleBook = (bookKey: string) => {
    setSelectedBooks(prev => 
      prev.includes(bookKey) 
        ? prev.filter(b => b !== bookKey)
        : [...prev, bookKey]
    )
  }

  const selectedEvent = events.find(e => e.id === selectedGame)
  const availableBooks = selectedEvent?.bookmakers.map(b => b.key) || []

  const chartData = {
    labels: history.map(h => {
      const date = new Date(h.timestamp)
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }),
    datasets: selectedBooks
      .filter(book => availableBooks.includes(book))
      .map(bookKey => ({
        label: BOOK_NAMES[bookKey] || bookKey,
        data: history.map(h => h.odds[selectedGame]?.[bookKey] ?? null),
        borderColor: BOOK_COLORS[bookKey] || '#888',
        backgroundColor: BOOK_COLORS[bookKey] || '#888',
        tension: 0.3,
        pointRadius: 3,
        spanGaps: true,
      }))
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#94a3b8',
          usePointStyle: true,
          padding: 15,
        }
      },
      tooltip: {
        callbacks: {
          label: (context: { dataset: { label: string }; parsed: { y: number } }) => {
            const value = context.parsed.y
            return `${context.dataset.label}: ${value > 0 ? '+' : ''}${value}`
          }
        }
      }
    },
    scales: {
      x: {
        grid: { color: '#1e293b' },
        ticks: { color: '#64748b' }
      },
      y: {
        grid: { color: '#1e293b' },
        ticks: { 
          color: '#64748b',
          callback: (value: number | string) => {
            const num = Number(value)
            return num > 0 ? `+${num}` : num
          }
        }
      }
    }
  }

  return (
    <div className="card">
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-cyan-400" />
            <h2 className="font-semibold">Line Movement</h2>
            <span className="text-xs text-slate-500">({history.length} snapshots)</span>
          </div>
          
          <div className="flex items-center gap-2">
            <select
              value={selectedGame}
              onChange={(e) => setSelectedGame(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm max-w-[200px]"
            >
              {events.map(event => (
                <option key={event.id} value={event.id}>
                  {event.away_team.split(' ').pop()} @ {event.home_team.split(' ').pop()}
                </option>
              ))}
            </select>
            
            <button
              onClick={handleClearHistory}
              className="p-2 text-slate-400 hover:text-red-400 transition-colors"
              title="Clear history"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="flex flex-wrap gap-2 mb-4">
          {availableBooks.map(bookKey => (
            <button
              key={bookKey}
              onClick={() => toggleBook(bookKey)}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                selectedBooks.includes(bookKey)
                  ? 'bg-slate-700 text-white'
                  : 'bg-slate-800/50 text-slate-500'
              }`}
              style={{
                borderColor: selectedBooks.includes(bookKey) ? BOOK_COLORS[bookKey] : 'transparent',
                borderWidth: 2,
              }}
            >
              {BOOK_NAMES[bookKey] || bookKey}
            </button>
          ))}
        </div>

        {history.length < 2 ? (
          <div className="h-[300px] flex items-center justify-center text-slate-500 text-sm">
            <div className="text-center">
              <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Not enough data yet.</p>
              <p className="text-xs mt-1">Refresh odds a few times to track line movement.</p>
            </div>
          </div>
        ) : (
          <div className="h-[300px]">
            <Line data={chartData} options={chartOptions} />
          </div>
        )}
      </div>

      <div className="p-3 border-t border-slate-800 flex items-center gap-2 text-xs text-slate-500">
        <Info className="w-3.5 h-3.5" />
        <span>Tracks home team moneyline. History saved locally, builds over time.</span>
      </div>
    </div>
  )
}
