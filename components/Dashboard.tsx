'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  TrendingUp, 
  Calculator, 
  User, 
  Zap, 
  RefreshCw, 
  ChevronRight,
  Activity,
  Target,
  BarChart3,
  AlertCircle,
  Wifi,
  WifiOff,
  Settings as SettingsIcon,
  Database,
  Clock,
  History,
  Scale,
  Dice5,
} from 'lucide-react'
import LineDiscrepancyTable from './LineDiscrepancy'
import EVCalculator from './EVCalculator'
import ArbitrageFinder from './ArbitrageFinder'
import PlayerPropAnalyzer from './PlayerPropAnalyzer'
import EdgeHeatmap from './EdgeHeatmap'
import LineMovement, { recordOddsSnapshot } from './LineMovement'
import LiveScoreBadge, { findScoreForGame } from './LiveScore'
import BetTracker from './BetTracker'
import BankrollSimulator from './BankrollSimulator'
import { OddsEvent, ScoreEvent, LineDiscrepancy, EVBet, ArbitrageOpportunity, PlayerProp, SPORTS, SportKey } from '@/lib/types'
import { findLineDiscrepancies, findEVBets, findArbitrageOpportunities, stripAltMarkets, filterUpcomingOrLiveEvents } from '@/lib/odds-utils'
import { MOCK_EVENTS, MOCK_PLAYER_PROPS } from '@/lib/mock-data'
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

type Tab = 'discrepancies' | 'ev' | 'arbitrage' | 'props' | 'overview' | 'analytics' | 'tracker' | 'simulator'

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
    <div className="flex flex-col gap-3 p-3 mb-4 rounded-lg border border-slate-700/50 bg-slate-900/40">
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
          <div className="flex items-center gap-1.5 text-slate-400">
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
            <span>Updated {lastUpdated.toLocaleString()}</span>
          </div>
          {remainingRequests !== null && isLive && (
            <span className="text-slate-500">{remainingRequests} API calls left</span>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <label
            className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer select-none"
            title={`Fetches alt spreads/totals for the ${ALT_EVENT_CAP} games with the highest main-line +EV. Extra Odds API credits (one call per game).`}
          >
            <input
              type="checkbox"
              checked={includeAltLines}
              onChange={e => onToggleAltLines(e.target.checked)}
              className="rounded border-slate-600 bg-slate-800 text-green-500 focus:ring-green-500/40"
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
            className="flex items-center justify-center gap-2 px-4 py-2 text-sm bg-green-500/15 hover:bg-green-500/25 border border-green-500/30 text-green-400 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh odds
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [events, setEvents] = useState<OddsEvent[]>([])
  const [scores, setScores] = useState<ScoreEvent[]>([])
  const [discrepancies, setDiscrepancies] = useState<LineDiscrepancy[]>([])
  const [evBets, setEvBets] = useState<EVBet[]>([])
  const [arbs, setArbs] = useState<ArbitrageOpportunity[]>([])
  const [playerProps] = useState<PlayerProp[]>(MOCK_PLAYER_PROPS)
  const [selectedSport, setSelectedSport] = useState<SportKey>('baseball_mlb')
  const [isLive, setIsLive] = useState(false)
  const [isCached, setIsCached] = useState(false)
  const [remainingRequests, setRemainingRequests] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)
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
    setEvents(eventData)
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
      if (result.data && !result.cached && !result.notModified) {
        recordOddsSnapshot(result.data, { force: forceRefresh })
      }
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
    } catch (err) {
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
  
  // Load cached data on mount (no API call unless user clicks refresh)
  useEffect(() => {
    if (hasCachedData(selectedSport)) {
      loadData(false) // Load from cache
    } else {
      // No cache - show mock data, user must click refresh
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
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'discrepancies', label: 'Line Shop', icon: TrendingUp },
    { id: 'ev', label: '+EV Finder', icon: Calculator },
    { id: 'arbitrage', label: 'Arbitrage', icon: Scale },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'props', label: 'Player Props', icon: User },
    { id: 'tracker', label: 'Bet Tracker', icon: History },
    { id: 'simulator', label: 'Bankroll Sim', icon: Dice5 },
  ] as const
  
  const topEVBets = evBets.slice(0, 3)
  const topDiscrepancies = discrepancies.slice(0, 3)
  
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#0a0b0f]/90 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Zap className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <h1 className="font-bold text-xl tracking-tight">
                  Hot<span className="text-green-400">Hand</span>
                </h1>
                <p className="text-xs text-slate-500">Analytics</p>
              </div>
            </div>
            
            <nav className="hidden md:flex items-center gap-1">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`nav-item flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
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
            
            <div className="flex items-center gap-3">
              <select
                value={selectedSport}
                onChange={(e) => setSelectedSport(e.target.value as SportKey)}
                className="hidden sm:block bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-green-500"
              >
                {SPORTS.map(sport => (
                  <option key={sport.key} value={sport.key}>{sport.title}</option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => setShowSettings(true)}
                title="Settings"
                className="p-2 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 transition-colors"
              >
                <SettingsIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <div className="md:hidden flex items-center gap-1 pb-3 overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.id 
                    ? 'bg-green-500/10 text-green-400' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
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
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <DataFreshnessStrip
                isLive={isLive}
                isCached={isCached}
                cacheAge={cacheAge}
                lastUpdated={lastUpdated}
                isLoading={isLoading}
                onRefresh={() => loadData(true)}
                sport={SPORTS.find(s => s.key === selectedSport)?.title || selectedSport}
                includeAltLines={includeAltLines}
                onToggleAltLines={handleToggleAltLines}
                altGames={altGames}
                altLoading={altLoading}
                remainingRequests={remainingRequests}
              />
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="card p-4 card-hover">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">Line Edges</span>
                    <TrendingUp className="w-4 h-4 text-green-400" />
                  </div>
                  <p className="text-3xl font-bold mt-2">{discrepancies.length}</p>
                  <p className="text-xs text-slate-500 mt-1">Active opportunities</p>
                </div>
                
                <div className="card p-4 card-hover">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">+EV Bets</span>
                    <Calculator className="w-4 h-4 text-cyan-400" />
                  </div>
                  <p className="text-3xl font-bold mt-2">{evBets.length}</p>
                  <p className="text-xs text-slate-500 mt-1">Positive expected value</p>
                </div>

                <div className="card p-4 card-hover">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">Arbitrage</span>
                    <Scale className="w-4 h-4 text-green-400" />
                  </div>
                  <p className="text-3xl font-bold mt-2">{arbs.length}</p>
                  <p className="text-xs text-slate-500 mt-1">Guaranteed profit spots</p>
                </div>
                
                <div className="card p-4 card-hover">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">Avg Edge</span>
                    <Target className="w-4 h-4 text-yellow-400" />
                  </div>
                  <p className="text-3xl font-bold mt-2 text-green-400">
                    {evBets.length > 0 
                      ? `${(evBets.reduce((s, b) => s + b.evPercent, 0) / evBets.length).toFixed(1)}%`
                      : '0%'
                    }
                  </p>
                  <p className="text-xs text-slate-500 mt-1">Expected value</p>
                </div>
                
                <div className="card p-4 card-hover">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">Games</span>
                    <BarChart3 className="w-4 h-4 text-purple-400" />
                  </div>
                  <p className="text-3xl font-bold mt-2">{events.length}</p>
                  <p className="text-xs text-slate-500 mt-1">With odds data</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="card overflow-hidden">
                  <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calculator className="w-4 h-4 text-cyan-400" />
                      <span className="font-medium">Top +EV Bets</span>
                    </div>
                    <button 
                      onClick={() => setActiveTab('ev')}
                      className="flex items-center gap-1 text-sm text-slate-400 hover:text-green-400 transition-colors"
                    >
                      View all <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="divide-y divide-slate-800">
                    {topEVBets.length > 0 ? topEVBets.map((bet, idx) => (
                      <div key={idx} className="p-4 hover:bg-slate-800/30 transition-colors">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm">
                              {bet.selection}
                              {bet.isAltLine && (
                                <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide bg-purple-500/15 text-purple-300 border border-purple-500/30">Alt</span>
                              )}
                            </p>
                            <p className="text-xs text-slate-500">{bet.awayTeam} @ {bet.homeTeam}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-green-400 font-bold mono">+{bet.evPercent.toFixed(1)}% EV</p>
                            <p className="text-xs text-slate-500">{bet.book}</p>
                          </div>
                        </div>
                      </div>
                    )) : (
                      <div className="p-8 text-center text-slate-500">
                        No +EV bets found
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="card overflow-hidden">
                  <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-green-400" />
                      <span className="font-medium">Best Line Shops</span>
                    </div>
                    <button 
                      onClick={() => setActiveTab('discrepancies')}
                      className="flex items-center gap-1 text-sm text-slate-400 hover:text-green-400 transition-colors"
                    >
                      View all <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="divide-y divide-slate-800">
                    {topDiscrepancies.length > 0 ? topDiscrepancies.map((disc, idx) => (
                      <div key={idx} className="p-4 hover:bg-slate-800/30 transition-colors">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm">{disc.betType}</p>
                            <p className="text-xs text-slate-500">{disc.awayTeam} @ {disc.homeTeam}</p>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center gap-2">
                              <span className="text-green-400 font-semibold mono">
                                {disc.bestOdds > 0 ? '+' : ''}{disc.bestOdds}
                              </span>
                              <span className="text-slate-500">→</span>
                              <span className="text-slate-400 mono">
                                {disc.worstOdds > 0 ? '+' : ''}{disc.worstOdds}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500">{disc.bestBook}</p>
                          </div>
                        </div>
                      </div>
                    )) : (
                      <div className="p-8 text-center text-slate-500">
                        No line discrepancies found
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="card p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="w-4 h-4 text-slate-400" />
                  <span className="font-medium">Upcoming & live</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {events.slice(0, 6).map(event => {
                    const score = findScoreForGame(scores, event.id, event.home_team, event.away_team, event.commence_time)
                    return (
                      <div key={event.id} className="p-4 bg-slate-800/30 rounded-lg">
                        <div className="flex items-center justify-between mb-2 gap-2">
                          <span className="text-xs text-slate-500">{event.sport_title}</span>
                          {score ? (
                            <LiveScoreBadge score={score} homeTeam={event.home_team} awayTeam={event.away_team} />
                          ) : (
                            <span className="text-xs text-green-400">
                              {new Date(event.commence_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                        <div className="space-y-1">
                          <p className="font-medium">{event.away_team}</p>
                          <p className="text-slate-400">@ {event.home_team}</p>
                        </div>
                      </div>
                    )
                  })}
                  {events.length === 0 && (
                    <div className="p-4 text-sm text-slate-500 md:col-span-3">
                      No upcoming or live games right now.
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
          
          {activeTab === 'discrepancies' && (
            <motion.div
              key="discrepancies"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <DataFreshnessStrip
                isLive={isLive}
                isCached={isCached}
                cacheAge={cacheAge}
                lastUpdated={lastUpdated}
                isLoading={isLoading}
                onRefresh={() => loadData(true)}
                sport={SPORTS.find(s => s.key === selectedSport)?.title || selectedSport}
                includeAltLines={includeAltLines}
                onToggleAltLines={handleToggleAltLines}
                altGames={altGames}
                altLoading={altLoading}
                remainingRequests={remainingRequests}
              />
              <LineDiscrepancyTable discrepancies={discrepancies} scores={scores} />
            </motion.div>
          )}
          
          {activeTab === 'ev' && (
            <motion.div
              key="ev"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <DataFreshnessStrip
                isLive={isLive}
                isCached={isCached}
                cacheAge={cacheAge}
                lastUpdated={lastUpdated}
                isLoading={isLoading}
                onRefresh={() => loadData(true)}
                sport={SPORTS.find(s => s.key === selectedSport)?.title || selectedSport}
                includeAltLines={includeAltLines}
                onToggleAltLines={handleToggleAltLines}
                altGames={altGames}
                altLoading={altLoading}
                remainingRequests={remainingRequests}
              />
              <EVCalculator evBets={evBets} scores={scores} />
            </motion.div>
          )}

          {activeTab === 'arbitrage' && (
            <motion.div
              key="arbitrage"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <DataFreshnessStrip
                isLive={isLive}
                isCached={isCached}
                cacheAge={cacheAge}
                lastUpdated={lastUpdated}
                isLoading={isLoading}
                onRefresh={() => loadData(true)}
                sport={SPORTS.find(s => s.key === selectedSport)?.title || selectedSport}
                includeAltLines={includeAltLines}
                onToggleAltLines={handleToggleAltLines}
                altGames={altGames}
                altLoading={altLoading}
                remainingRequests={remainingRequests}
              />
              <ArbitrageFinder arbs={arbs} scores={scores} />
            </motion.div>
          )}
          
          {activeTab === 'analytics' && (
            <motion.div
              key="analytics"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <DataFreshnessStrip
                isLive={isLive}
                isCached={isCached}
                cacheAge={cacheAge}
                lastUpdated={lastUpdated}
                isLoading={isLoading}
                onRefresh={() => loadData(true)}
                sport={SPORTS.find(s => s.key === selectedSport)?.title || selectedSport}
                includeAltLines={includeAltLines}
                onToggleAltLines={handleToggleAltLines}
                altGames={altGames}
                altLoading={altLoading}
                remainingRequests={remainingRequests}
              />
              <EdgeHeatmap events={events} />
              <LineMovement events={events} />
            </motion.div>
          )}
          
          {activeTab === 'props' && (
            <motion.div
              key="props"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="flex items-center justify-between p-3 mb-4 bg-slate-800/30 rounded-lg border border-slate-700/50">
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-2 h-2 bg-purple-400 rounded-full" />
                  <span className="text-slate-400">Sample data • No API calls used</span>
                </div>
              </div>
              <PlayerPropAnalyzer playerProps={playerProps} />
            </motion.div>
          )}

          {activeTab === 'tracker' && (
            <motion.div
              key="tracker"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <BetTracker />
            </motion.div>
          )}

          {activeTab === 'simulator' && (
            <motion.div
              key="simulator"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <BankrollSimulator />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      
      <footer className="border-t border-slate-800 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-slate-500">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-green-400" />
              <span>HotHand Analytics</span>
            </div>
            <div className="flex items-center gap-4">
              <span>Powered by The Odds API</span>
              <span>•</span>
              <span>Updated: {lastUpdated.toLocaleTimeString()}</span>
            </div>
          </div>
        </div>
      </footer>
      
      <Settings 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)}
        onApiKeyChange={() => loadData(true)}
      />
    </div>
  )
}
