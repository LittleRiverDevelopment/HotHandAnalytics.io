'use client'

import { useCallback, useEffect, useState } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'
import {
  fetchTodayTrends,
  trendsCenterKey,
  TRENDSCENTER_SPORTS,
  type TrendsCenterPayload,
  type TrendsCenterSport,
} from '@/lib/trendscenter'

function signed(value: number, digits = 1): string {
  const text = value.toFixed(digits)
  return value > 0 ? `+${text}` : text
}

export default function TrendsCenter() {
  const [sport, setSport] = useState<TrendsCenterSport>('NBA')
  const [payload, setPayload] = useState<TrendsCenterPayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const hasKey = trendsCenterKey().length > 0

  const load = useCallback(async (nextSport: TrendsCenterSport) => {
    if (!trendsCenterKey()) return
    setLoading(true)
    setError(null)
    try {
      setPayload(await fetchTodayTrends(nextSport))
    } catch (err) {
      setPayload(null)
      setError(err instanceof Error ? err.message : 'TrendsCenter request failed')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load(sport)
  }, [load, sport])

  if (!hasKey) {
    return (
      <div className="card p-5 space-y-2">
        <p className="font-medium text-slate-200">TrendsCenter key needed</p>
        <p className="text-sm text-slate-400">
          Add <span className="font-mono text-slate-300">NEXT_PUBLIC_TRENDSCENTER_KEY</span> to <span className="font-mono text-slate-300">.env</span> and restart the dev server. A <span className="font-mono text-slate-300">tc_test_</span> sandbox key returns sample data. This site compiles the key into the page, so a live key would be visible to anyone who loads it.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <label className="text-sm text-slate-400" htmlFor="trends-sport">Sport</label>
          <select
            id="trends-sport"
            value={sport}
            onChange={event => setSport(event.target.value as TrendsCenterSport)}
            className="bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
          >
            {TRENDSCENTER_SPORTS.map(item => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
          {payload?.sandbox && (
            <span className="text-xs text-amber-300">Sandbox sample</span>
          )}
        </div>
        <button
          type="button"
          onClick={() => void load(sport)}
          disabled={loading}
          className="flex items-center justify-center gap-2 min-h-[44px] px-4 py-2 text-sm bg-green-500/15 hover:bg-green-500/25 border border-green-500/30 text-green-400 rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="card p-4 border-yellow-500/30 bg-yellow-500/5">
          <div className="flex items-start gap-2 text-yellow-400">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        </div>
      )}

      {loading && !payload && (
        <div className="card p-8 text-center text-sm text-slate-400">Loading today’s trends…</div>
      )}

      {payload && payload.trends.length === 0 && !error && (
        <div className="card p-8 text-center text-sm text-slate-400">No trends for {sport} today.</div>
      )}

      <div className="grid gap-3">
        {payload?.trends.map(trend => (
          <article key={trend.id} className="card p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="font-medium text-slate-100">{trend.name}</h2>
                <p className="text-xs text-slate-500 mt-0.5 uppercase tracking-wide">
                  {[trend.sport, trend.betType].filter(Boolean).join(' · ')}
                </p>
              </div>
              {trend.record && (
                <span className="shrink-0 font-mono text-sm text-green-400">{trend.record}</span>
              )}
            </div>
            {trend.description && (
              <p className="text-sm text-slate-400">{trend.description}</p>
            )}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
              {trend.winRate !== null && <span>Win rate {trend.winRate}%</span>}
              {trend.roi !== null && <span>ROI {signed(trend.roi)}%</span>}
              {trend.units !== null && <span>Units {signed(trend.units)}</span>}
              {trend.streak !== null && <span>Streak {trend.streak}</span>}
            </div>
            {trend.games.length > 0 && (
              <ul className="space-y-1.5">
                {trend.games.map(game => (
                  <li key={`${trend.id}-${game.matchup}-${game.pick}`} className="text-sm text-slate-300">
                    <span>{game.matchup}</span>
                    {game.pick && <span className="text-slate-100"> · {game.pick}</span>}
                    {game.startLabel && <span className="text-slate-500"> · {game.startLabel}</span>}
                  </li>
                ))}
              </ul>
            )}
          </article>
        ))}
      </div>

      {payload && (
        <p className="text-xs text-slate-500">
          <a
            href={payload.attributionUrl}
            target="_blank"
            rel="noopener"
            className="underline decoration-slate-600 hover:text-slate-300"
          >
            {payload.attributionText}
          </a>
        </p>
      )}
    </div>
  )
}
