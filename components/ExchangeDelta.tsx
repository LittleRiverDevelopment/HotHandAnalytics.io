'use client'

import { useEffect, useMemo, useState } from 'react'
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
  Filler,
} from 'chart.js'
import { ArrowLeftRight } from 'lucide-react'
import type { OddsEvent, ScoreEvent } from '@/lib/types'
import { findExchangeDeltas, type ExchangeDelta } from '@/lib/exchange-delta'
import { formatOdds, impliedProbability } from '@/lib/odds-utils'
import { getLineHistory, type LineSnapshot } from './LineMovement'
import BookOpenLink from './BookOpenLink'
import LiveMatchupsToggle, { useShowLiveMatchups } from './LiveMatchupsToggle'
import { includeMatchup } from '@/lib/show-live-matchups'
import { findScoreForGame } from './LiveScore'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

interface Props {
  events: OddsEvent[]
  scores?: ScoreEvent[]
}

function formatGap(cents: number): string {
  const rounded = Math.round(cents * 10) / 10
  const text = rounded.toFixed(1)
  return rounded > 0 ? `+${text}¢` : `${text}¢`
}

function gapClass(cents: number): string {
  const abs = Math.abs(cents)
  if (abs >= 3) return 'text-green-400'
  if (abs >= 1.5) return 'text-amber-300'
  return 'text-slate-300'
}

function homeGapCents(snapshot: LineSnapshot, eventId: string): number | null {
  const kalshi = snapshot.odds[eventId]?.kalshi
  const polymarket = snapshot.odds[eventId]?.polymarket_us
  if (kalshi == null || polymarket == null) return null
  return (impliedProbability(kalshi) - impliedProbability(polymarket)) * 100
}

export default function ExchangeDeltaBoard({ events, scores }: Props) {
  const [history, setHistory] = useState<LineSnapshot[]>([])
  const [market, setMarket] = useState('all')
  const [selectedGame, setSelectedGame] = useState('')
  const { showLiveMatchups, setShowLiveMatchups } = useShowLiveMatchups()

  useEffect(() => {
    setHistory(getLineHistory())
  }, [events])

  const rows = useMemo(() => findExchangeDeltas(events), [events])
  const visible = useMemo(() => {
    return rows.filter(row => {
      if (market !== 'all' && row.market !== market) return false
      return includeMatchup(
        showLiveMatchups,
        row.commenceTime,
        findScoreForGame(scores, row.eventId, row.homeTeam, row.awayTeam, row.commenceTime)
      )
    })
  }, [rows, market, showLiveMatchups, scores])

  const games = useMemo(() => {
    const seen = new Map<string, ExchangeDelta>()
    for (const row of rows) {
      if (!seen.has(row.eventId)) seen.set(row.eventId, row)
    }
    return Array.from(seen.values())
  }, [rows])

  useEffect(() => {
    if (games.length === 0) return
    if (!selectedGame || !games.some(game => game.eventId === selectedGame)) {
      setSelectedGame(games[0].eventId)
    }
  }, [games, selectedGame])

  const averageGap = visible.length
    ? visible.reduce((sum, row) => sum + Math.abs(row.gapCents), 0) / visible.length
    : 0
  const widest = visible[0]

  const chartPoints = history
    .map(snapshot => ({
      label: new Date(snapshot.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
      gap: selectedGame ? homeGapCents(snapshot, selectedGame) : null,
    }))
    .filter(point => point.gap != null)

  const selected = games.find(game => game.eventId === selectedGame)

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5 text-green-400 shrink-0" />
            <h2 className="text-lg font-semibold">Exchange delta</h2>
            <span className="text-sm text-slate-400">{visible.length}</span>
          </div>
          <p className="mt-1 text-sm text-slate-500 max-w-2xl">
            Kalshi minus Polymarket US, in cents of implied probability. A positive gap means Kalshi is the shorter price.
            Live pulls include each exchange&apos;s taker fee.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <LiveMatchupsToggle checked={showLiveMatchups} onChange={setShowLiveMatchups} />
          <select
            value={market}
            onChange={event => setMarket(event.target.value)}
            aria-label="Market"
            className="bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
          >
            <option value="all">All markets</option>
            <option value="Moneyline">Moneyline</option>
            <option value="Spread">Spread</option>
            <option value="Total">Total</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="card p-4">
          <p className="text-sm text-slate-400">Widest gap</p>
          <p className={`text-2xl font-bold mt-1 mono ${widest ? gapClass(widest.gapCents) : 'text-slate-500'}`}>
            {widest ? formatGap(widest.gapCents) : '—'}
          </p>
          <p className="text-xs text-slate-500 mt-1 truncate">
            {widest ? `${widest.selection} · ${widest.market}` : 'No shared line'}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-slate-400">Average gap</p>
          <p className="text-2xl font-bold mt-1 mono text-slate-200">
            {visible.length ? `${averageGap.toFixed(1)}¢` : '—'}
          </p>
          <p className="text-xs text-slate-500 mt-1">Absolute, across the rows below</p>
        </div>
      </div>

      <div className="card p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
          <div>
            <p className="font-medium">Home moneyline gap</p>
            <p className="text-xs text-slate-500">Each refresh in this browser adds a point.</p>
          </div>
          {games.length > 0 && (
            <select
              value={selectedGame}
              onChange={event => setSelectedGame(event.target.value)}
              aria-label="Game"
              className="bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500 max-w-full"
            >
              {games.map(game => (
                <option key={game.eventId} value={game.eventId}>
                  {game.awayTeam} @ {game.homeTeam}
                </option>
              ))}
            </select>
          )}
        </div>
        {chartPoints.length >= 2 ? (
          <div className="h-52">
            <Line
              data={{
                labels: chartPoints.map(point => point.label),
                datasets: [
                  {
                    label: selected ? `${selected.homeTeam} gap` : 'Gap',
                    data: chartPoints.map(point => Math.round((point.gap ?? 0) * 10) / 10),
                    borderColor: '#4ade80',
                    backgroundColor: 'rgba(74, 222, 128, 0.12)',
                    tension: 0.3,
                    pointRadius: 3,
                    fill: true,
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    callbacks: {
                      label: context => `Gap ${formatGap(Number(context.parsed.y))}`,
                    },
                  },
                },
                scales: {
                  x: { grid: { color: '#1e293b' }, ticks: { color: '#64748b', maxTicksLimit: 6 } },
                  y: {
                    grid: { color: '#1e293b' },
                    ticks: {
                      color: '#64748b',
                      callback: value => `${Number(value) > 0 ? '+' : ''}${value}¢`,
                    },
                  },
                },
              }}
            />
          </div>
        ) : (
          <p className="text-sm text-slate-500 py-6 text-center">
            {selected
              ? 'Refresh again and this line will show how the home moneyline gap has moved.'
              : 'Kalshi and Polymarket are not both quoting a game right now.'}
          </p>
        )}
      </div>

      {visible.length === 0 ? (
        <div className="card p-8 text-center text-slate-500">
          No shared lines. Both exchanges have to quote the same side and the same number.
        </div>
      ) : (
        <>
          <div className="md:hidden space-y-2">
            {visible.map(row => (
              <div
                key={row.id}
                onClick={() => setSelectedGame(row.eventId)}
                className={`card p-3 cursor-pointer ${selectedGame === row.eventId ? 'border-green-500/40' : ''}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">{row.selection}</p>
                    <p className="text-xs text-slate-500 truncate">{row.awayTeam} @ {row.homeTeam} · {row.market}</p>
                  </div>
                  <p className={`font-bold mono shrink-0 ${gapClass(row.gapCents)}`}>{formatGap(row.gapCents)}</p>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <BookOpenLink bookTitle="Kalshi" deepLink={row.kalshiLink} stopPropagation>
                    Kalshi {formatOdds(row.kalshiOdds)}
                  </BookOpenLink>
                  <BookOpenLink bookTitle="Polymarket US" deepLink={row.polymarketLink} stopPropagation>
                    Polymarket {formatOdds(row.polymarketOdds)}
                  </BookOpenLink>
                </div>
              </div>
            ))}
          </div>
          <div className="hidden md:block card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-500 border-b border-slate-800">
                    <th className="px-4 py-3 font-medium">Game</th>
                    <th className="px-4 py-3 font-medium">Side</th>
                    <th className="px-4 py-3 font-medium text-right">Kalshi</th>
                    <th className="px-4 py-3 font-medium text-right">Polymarket</th>
                    <th className="px-4 py-3 font-medium text-right">Gap</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {visible.map(row => (
                    <tr
                      key={row.id}
                      onClick={() => setSelectedGame(row.eventId)}
                      className={`cursor-pointer hover:bg-slate-800/40 ${selectedGame === row.eventId ? 'bg-slate-800/30' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium">{row.awayTeam} @ {row.homeTeam}</p>
                        <p className="text-xs text-slate-500">{row.market}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-200">{row.selection}</td>
                      <td className="px-4 py-3 text-right mono">
                        <BookOpenLink bookTitle="Kalshi" deepLink={row.kalshiLink} stopPropagation>
                          {formatOdds(row.kalshiOdds)}
                        </BookOpenLink>
                      </td>
                      <td className="px-4 py-3 text-right mono">
                        <BookOpenLink bookTitle="Polymarket US" deepLink={row.polymarketLink} stopPropagation>
                          {formatOdds(row.polymarketOdds)}
                        </BookOpenLink>
                      </td>
                      <td className={`px-4 py-3 text-right font-bold mono ${gapClass(row.gapCents)}`}>
                        {formatGap(row.gapCents)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
