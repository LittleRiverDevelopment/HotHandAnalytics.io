'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  TrendingUp,
  Calculator,
  Crosshair,
  RefreshCw,
  AlertCircle,
  Wifi,
  WifiOff,
  Settings as SettingsIcon,
  Database,
  Clock,
  Scale,
} from 'lucide-react'
import LineDiscrepancyTable from './LineDiscrepancy'
import EVCalculator from './EVCalculator'
import ArbitrageFinder from './ArbitrageFinder'
import { OddsEvent, ScoreEvent, LineDiscrepancy, EVBet, ArbitrageOpportunity, SPORTS, SportKey } from '@/lib/types'
import { findLineDiscrepancies, findEVBets, findArbitrageOpportunities, stripAltMarkets, filterUpcomingOrLiveEvents } from '@/lib/odds-utils'
import { MOCK_EVENTS } from '@/lib/mock-data'
import {
  fetchOddsClient,
  fetchScoresClient,
  getCacheAge,
  hasCachedData,
  peekCachedOdds,
  attachAltLines,
  getIncludeAltLines,
  setIncludeAltLines,
  ALT_EVENT_CAP,
} from '@/lib/odds-api'
import Settings from './Settings'

type Tab = 'ev' | 'discrepancies' | 'arbitrage'

function formatCacheAge(ms: number): string {
  const minutes = Math.floor(ms / 60000)
  const hours = Math.floor(minutes / 60)

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ago`
  }
  if (minutes > 0) {
    return `${minutes}m ago`
  }
  return 'Just now'
}

interface DataFreshnessStripProps {
  isLive: boolean
  isCached: boolean
  cacheAge: number | null
  lastUpdated: Date
  isLoading: boolean
  onRefresh: () => void
  sport: string
  includeAltLines: boolean
  onToggleAltLines: (on: boolean) => void
  altGames: number
  altLoading: boolean
  remainingRequests: number | null
}

function DataFreshnessStrip({
  isLive,
  isCached,
  cacheAge,
  lastUpdated,
  isLoading,
  onRefresh,
  sport,
  includeAltLines,
  onToggleAltLines,
  altGames,
  altLoading,
  remainingRequests,
}: DataFreshnessStripProps) {
  const source = !isLive ? 'Demo data' : isCached ? 'Cached odds' : 'Live fetch'

  return (
    <div className="flex flex-col gap-3 p-3 mb-4 rounded-lg border border-slate-700/50 bg-slate-900/80">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-300">
          <div className="flex items-center gap-2">
            {isLive ? (
              <Wifi className="w-4 h-4 text-green-400 shrink-0" />
            ) : (
              <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
            )}
            <span className="font-medium text-slate-200">{sport}</span>
            <span className="text-slate-500">·</span>
            <span className="text-slate-400">{source}</span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-slate-400">
            <Database className="w-3.5 h-3.5 shrink-0 text-slate-500" />
            <span>
              {cacheAge !== null && isLive
                ? `Data age ${formatCacheAge(cacheAge)}`
                : isLive
                  ? 'Fresh pull'
                  : 'Not connected to live odds'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400">
            <Clock className="w-3.5 h-3.5 shrink-0 text-slate-500" />
            <span className="sm:hidden">
              {lastUpdated.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', second: '2-digit', timeZoneName: 'short' })}
            </span>
            <span className="hidden sm:inline">
              Updated {lastUpdated.toLocaleString(undefined, { year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit', timeZoneName: 'short' })}
            </span>
          </div>
          {remainingRequests !== null && isLive && (
            <span className="inline-flex items-center text-slate-500">
              <span className="tabular-nums text-slate-400">{remainingRequests}</span>
              <span className="ml-1 sm:hidden">API left</span>
              <span className="ml-1 hidden sm:inline">API calls left</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <label
            className="flex items-center gap-2 min-h-[44px] sm:min-h-0 text-sm text-slate-300 cursor-pointer select-none"
            title={`Fetches alt spreads/totals for the ${ALT_EVENT_CAP} games with the highest main-line +EV. Extra Odds API credits (one call per game).`}
          >
            <input
              type="checkbox"
              checked={includeAltLines}
              onChange={e => onToggleAltLines(e.target.checked)}
              className="rounded border-slate-600 bg-slate-800 text-green-500 focus:ring-green-500/40 w-4 h-4"
            />
            <span>Alt lines</span>
            {includeAltLines && (
              <span className="text-xs text-purple-300">
                {altLoading
                  ? 'loading…'
                  : isLive
                    ? altGames > 0
                      ? `${altGames} game${altGames === 1 ? '' : 's'}`
                      : 'refresh to fetch'
                    : 'on'}
              </span>
            )}
          </label>
          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 min-h-[44px] px-4 py-2 text-sm bg-green-500/15 hover:bg-green-500/25 border border-green-500/30 text-green-400 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('ev')
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [scores, setScores] = useState<ScoreEvent[]>([])
  const [discrepancies, setDiscrepancies] = useState<LineDiscrepancy[]>([])
  const [evBets, setEvBets] = useState<EVBet[]>([])
  const [arbs, setArbs] = useState<ArbitrageOpportunity[]>([])
  const [selectedSport, setSelectedSport] = useState<SportKey>('basketball_nba')
  const [isLive, setIsLive] = useState(false)
  const [isCached, setIsCached] = useState(false)
  const [remainingRequests, setRemainingRequests] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const closeSettings = useCallback(() => setShowSettings(false), [])
  const [cacheAge, setCacheAge] = useState<number | null>(null)
  const [includeAltLines, setIncludeAltLinesState] = useState(() => getIncludeAltLines())
  const [altGames, setAltGames] = useState(0)
  const [altLoading, setAltLoading] = useState(false)
  const loadGenRef = useRef(0)
  const rawEventsRef = useRef<OddsEvent[]>([])
  const scoresRef = useRef<ScoreEvent[]>([])
  const sportForScoresRef = useRef<SportKey>(selectedSport)
  const lastBoardIdsRef = useRef('')

  const handleToggleAltLines = (on: boolean) => {
    setIncludeAltLines(on)
    setIncludeAltLinesState(on)
  }

  const applyBoard = (eventData: OddsEvent[]) => {
    setDiscrepancies(findLineDiscrepancies(eventData))
    setEvBets(findEVBets(eventData))
    setArbs(findArbitrageOpportunities(eventData))
    setLastUpdated(new Date())
  }

  const publishBoard = (
    eventData?: OddsEvent[],
    nextScores?: ScoreEvent[],
    opts?: { scoresOnly?: boolean }
  ) => {
    const sameEvents = eventData !== undefined && eventData === rawEventsRef.current
    if (eventData !== undefined) rawEventsRef.current = eventData
    if (nextScores !== undefined) scoresRef.current = nextScores
    const filtered = filterUpcomingOrLiveEvents(rawEventsRef.current, scoresRef.current)
    const ids = filtered.map(e => e.id).join('\0')
    if ((opts?.scoresOnly || sameEvents) && ids === lastBoardIdsRef.current) return
    lastBoardIdsRef.current = ids
    applyBoard(filtered)
  }

  const prepEvents = (eventData: OddsEvent[]) =>
    includeAltLines ? eventData : stripAltMarkets(eventData)

  const loadData = useCallback(async (forceRefresh: boolean = false) => {
    const loadId = ++loadGenRef.current
    if (sportForScoresRef.current !== selectedSport) {
      sportForScoresRef.current = selectedSport
      scoresRef.current = []
      lastBoardIdsRef.current = ''
      setScores([])
    }
    setIsLoading(true)
    setAltLoading(false)
    setError(null)

    if (forceRefresh) {
      const stale = peekCachedOdds(selectedSport)
      if (stale) {
        publishBoard(prepEvents(stale))
        setIsLive(true)
        setIsCached(true)
        setCacheAge(getCacheAge(selectedSport))
      }
    }

    try {
      const scoresPromise = fetchScoresClient(selectedSport, forceRefresh).then(scoresResult => {
        if (loadId !== loadGenRef.current) return scoresResult
        if (scoresResult.data) {
          scoresRef.current = scoresResult.data
          setScores(scoresResult.data)
          if (scoresResult.remainingRequests !== undefined) {
            setRemainingRequests(scoresResult.remainingRequests)
          }
          if (rawEventsRef.current.length > 0) {
            publishBoard(undefined, scoresResult.data, { scoresOnly: true })
          }
        }
        return scoresResult
      })

      const result = await fetchOddsClient(selectedSport, ['h2h', 'spreads', 'totals'], forceRefresh)
      if (loadId !== loadGenRef.current) return

      if (result.error && !result.data) {
        const cachedOdds = peekCachedOdds(selectedSport)
        if (cachedOdds) {
          setError(result.error)
          setIsLive(true)
          setIsCached(true)
          setCacheAge(getCacheAge(selectedSport))
          publishBoard(prepEvents(cachedOdds))
          setIsLoading(false)
          await scoresPromise
          return
        }
        setError(result.error)
        setIsLive(false)
        setIsCached(false)
        setCacheAge(null)
        scoresRef.current = []
        setScores([])
        publishBoard(prepEvents(MOCK_EVENTS), [])
        setAltGames(includeAltLines ? MOCK_EVENTS.filter(e =>
          e.bookmakers.some(b => b.markets.some(m => m.key.startsWith('alternate_')))
        ).length : 0)
        setIsLoading(false)
        return
      }

      if (result.error) setError(result.error)
      setIsLive(!!result.data)
      setIsCached(result.cached || false)
      if (result.remainingRequests !== undefined) {
        setRemainingRequests(result.remainingRequests)
      }
      setCacheAge(getCacheAge(selectedSport))

      const eventData = prepEvents(result.data || MOCK_EVENTS)

      publishBoard(eventData)
      setAltGames(0)
      setIsLoading(false)

      if (!result.data) {
        await scoresPromise
        return
      }

      const altsPromise = includeAltLines
        ? (setAltLoading(true), attachAltLines(selectedSport, result.data, forceRefresh, scoresRef.current))
        : Promise.resolve(null)

      const [, alt] = await Promise.all([scoresPromise, altsPromise])
      if (loadId !== loadGenRef.current) return

      if (alt) {
        publishBoard(alt.events, scoresRef.current)
        setAltGames(alt.altGames)
        if (alt.remainingRequests !== undefined) {
          setRemainingRequests(alt.remainingRequests)
        }
      }
    } catch {
      if (loadId !== loadGenRef.current) return
      setError('Failed to fetch data')
      const fallback = prepEvents(MOCK_EVENTS)
      publishBoard(fallback, [])
      setScores([])
      setIsLive(false)
      setAltGames(includeAltLines ? fallback.filter(e =>
        e.bookmakers.some(b => b.markets.some(m => m.key.startsWith('alternate_')))
      ).length : 0)
    } finally {
      if (loadId === loadGenRef.current) {
        setIsLoading(false)
        setAltLoading(false)
      }
    }
  }, [selectedSport, includeAltLines])

  useEffect(() => {
    if (hasCachedData(selectedSport)) {
      loadData(false)
    } else {
      const fallback = includeAltLines ? MOCK_EVENTS : stripAltMarkets(MOCK_EVENTS)
      scoresRef.current = []
      setScores([])
      publishBoard(fallback, [])
      setAltGames(includeAltLines ? fallback.filter(e =>
        e.bookmakers.some(b => b.markets.some(m => m.key.startsWith('alternate_')))
      ).length : 0)
      setIsLoading(false)
      setIsLive(false)
    }
  }, [selectedSport, loadData])

  const tabs = [
    { id: 'ev', label: 'Positive EV Finder', icon: Calculator },
    { id: 'discrepancies', label: 'Line Shop', icon: TrendingUp },
    { id: 'arbitrage', label: 'Arbitrage', icon: Scale },
  ] as const

  const sportTitle = SPORTS.find(s => s.key === selectedSport)?.title || selectedSport
  const freshness = (
    <DataFreshnessStrip
      isLive={isLive}
      isCached={isCached}
      cacheAge={cacheAge}
      lastUpdated={lastUpdated}
      isLoading={isLoading}
      onRefresh={() => loadData(true)}
      sport={sportTitle}
      includeAltLines={includeAltLines}
      onToggleAltLines={handleToggleAltLines}
      altGames={altGames}
      altLoading={altLoading}
      remainingRequests={remainingRequests}
    />
  )

  return (
    <div className="min-h-screen">
      <header
        className="sticky top-0 z-50 backdrop-blur-xl bg-[#0a0b0f]/90 border-b border-slate-800"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-3 h-14 lg:h-16">
            <div className="flex items-center gap-2 shrink-0">
              <div className="p-1.5 lg:p-2 bg-green-500/10 rounded-lg">
                <Crosshair className="w-5 h-5 text-green-400" />
              </div>
              <div className="leading-tight">
                <h1 className="font-bold text-lg lg:text-xl tracking-tight">
                  Line<span className="text-green-400">Snipe</span>
                </h1>
                <p className="hidden sm:block text-xs text-slate-500">Best number, better price</p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <select
                value={selectedSport}
                onChange={(e) => setSelectedSport(e.target.value as SportKey)}
                aria-label="Sport"
                className="bg-slate-800/50 border border-slate-700 rounded-lg px-2 sm:px-3 py-2 text-sm focus:outline-none focus:border-green-500"
              >
                {SPORTS.map(sport => (
                  <option key={sport.key} value={sport.key}>{sport.title}</option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => setShowSettings(true)}
                title="Admin"
                aria-label="Admin"
                className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg bg-slate-800/50 hover:bg-slate-700/50 transition-colors"
              >
                <SettingsIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          <nav aria-label="Features" className="flex items-center gap-0.5 overflow-x-auto pb-2">
            {tabs.map(tab => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={(event) => {
                  setActiveTab(tab.id)
                  event.currentTarget.scrollIntoView({ inline: 'nearest', block: 'nearest' })
                }}
                className={`nav-item shrink-0 flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'active text-green-400'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="card p-4 border-yellow-500/30 bg-yellow-500/5">
            <div className="flex items-center gap-2 text-yellow-400">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{error} - Showing demo data</span>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 lg:py-6 pb-8">
        <AnimatePresence mode="wait">
          {activeTab === 'ev' && (
            <motion.div
              key="ev"
              role="tabpanel"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {freshness}
              <EVCalculator evBets={evBets} scores={scores} />
            </motion.div>
          )}

          {activeTab === 'discrepancies' && (
            <motion.div
              key="discrepancies"
              role="tabpanel"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {freshness}
              <LineDiscrepancyTable discrepancies={discrepancies} scores={scores} />
            </motion.div>
          )}

          {activeTab === 'arbitrage' && (
            <motion.div
              key="arbitrage"
              role="tabpanel"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {freshness}
              <ArbitrageFinder arbs={arbs} scores={scores} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="border-t border-slate-800 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-slate-500">
            <div className="flex items-center gap-2">
              <Crosshair className="w-4 h-4 text-green-400" />
              <span>LineSnipe</span>
            </div>
            <div className="flex items-center gap-4">
              <span>Powered by The Odds API</span>
              <span>•</span>
              <span>Updated: {lastUpdated.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', second: '2-digit', timeZoneName: 'short' })}</span>
            </div>
          </div>
        </div>
      </footer>

      <Settings
        isOpen={showSettings}
        onClose={closeSettings}
        onRefresh={() => loadData(true)}
        isRefreshing={isLoading || altLoading}
        refreshError={error}
      />
    </div>
  )
}
