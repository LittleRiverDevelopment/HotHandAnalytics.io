'use client'

import { useState, useEffect, useCallback } from 'react'
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
  WifiOff
} from 'lucide-react'
import LineDiscrepancyTable from './LineDiscrepancy'
import EVCalculator from './EVCalculator'
import PlayerPropAnalyzer from './PlayerPropAnalyzer'
import { OddsEvent, LineDiscrepancy, EVBet, PlayerProp, SPORTS, SportKey } from '@/lib/types'
import { findLineDiscrepancies, findEVBets } from '@/lib/odds-utils'
import { MOCK_EVENTS, MOCK_PLAYER_PROPS } from '@/lib/mock-data'

type Tab = 'discrepancies' | 'ev' | 'props' | 'overview'

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [events, setEvents] = useState<OddsEvent[]>([])
  const [discrepancies, setDiscrepancies] = useState<LineDiscrepancy[]>([])
  const [evBets, setEvBets] = useState<EVBet[]>([])
  const [playerProps] = useState<PlayerProp[]>(MOCK_PLAYER_PROPS)
  const [selectedSport, setSelectedSport] = useState<SportKey>('basketball_nba')
  const [isLive, setIsLive] = useState(false)
  const [isCached, setIsCached] = useState(false)
  const [remainingRequests, setRemainingRequests] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  const loadData = useCallback(async (forceRefresh: boolean = false) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const refreshParam = forceRefresh ? '&refresh=true' : ''
      const response = await fetch(`/api/odds?sport=${selectedSport}${refreshParam}`)
      const result = await response.json()
      
      if (result.error && !result.data) {
        setError(result.error)
        setEvents(MOCK_EVENTS)
        setIsLive(false)
      } else {
        if (result.error) {
          setError(result.error)
        }
        setEvents(result.data || [])
        setIsLive(!result.mock)
        setIsCached(result.cached || false)
        if (result.remainingRequests !== undefined) {
          setRemainingRequests(result.remainingRequests)
        }
      }
      
      const eventData = result.data || MOCK_EVENTS
      setDiscrepancies(findLineDiscrepancies(eventData))
      setEvBets(findEVBets(eventData))
      setLastUpdated(new Date())
    } catch (err) {
      setError('Failed to fetch data')
      setEvents(MOCK_EVENTS)
      setDiscrepancies(findLineDiscrepancies(MOCK_EVENTS))
      setEvBets(findEVBets(MOCK_EVENTS))
      setIsLive(false)
    } finally {
      setIsLoading(false)
    }
  }, [selectedSport])
  
  useEffect(() => {
    loadData()
  }, [loadData])
  
  const tabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'discrepancies', label: 'Line Shop', icon: TrendingUp },
    { id: 'ev', label: '+EV Finder', icon: Calculator },
    { id: 'props', label: 'Player Props', icon: User },
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
              
              <div className="flex items-center gap-2 text-xs">
                {isLive ? (
                  <div className="flex items-center gap-1 text-green-400">
                    <Wifi className="w-3 h-3" />
                    <span className="hidden sm:inline">{isCached ? 'Cached' : 'Live'}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-yellow-400">
                    <WifiOff className="w-3 h-3" />
                    <span className="hidden sm:inline">Demo</span>
                  </div>
                )}
                {remainingRequests !== null && isLive && (
                  <span className="hidden sm:inline text-slate-500">
                    ({remainingRequests} API calls left)
                  </span>
                )}
              </div>
              
              <button
                onClick={() => loadData(true)}
                disabled={isLoading}
                title="Force refresh from API"
                className="p-2 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
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
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                            <p className="font-medium text-sm">{bet.selection}</p>
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
                  <span className="font-medium">Upcoming Games</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {events.slice(0, 6).map(event => (
                    <div key={event.id} className="p-4 bg-slate-800/30 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-slate-500">{event.sport_title}</span>
                        <span className="text-xs text-green-400">
                          {new Date(event.commence_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <p className="font-medium">{event.away_team}</p>
                        <p className="text-slate-400">@ {event.home_team}</p>
                      </div>
                    </div>
                  ))}
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
              <LineDiscrepancyTable discrepancies={discrepancies} />
            </motion.div>
          )}
          
          {activeTab === 'ev' && (
            <motion.div
              key="ev"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <EVCalculator evBets={evBets} />
            </motion.div>
          )}
          
          {activeTab === 'props' && (
            <motion.div
              key="props"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <PlayerPropAnalyzer playerProps={playerProps} />
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
    </div>
  )
}
