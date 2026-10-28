'use client'

import { useEffect, useMemo, useState } from 'react'
import { Gift, TrendingUp, Layers, AlertTriangle } from 'lucide-react'
import { OddsEvent, ScoreEvent } from '@/lib/types'
import { formatOdds } from '@/lib/odds-utils'
import { findAttractiveLines, bestLegsByBook, buildParlay, buildParlays, maxParlayLegs, BuiltParlay } from '@/lib/parlay'
import { format } from 'date-fns'
import BookOpenLink from './BookOpenLink'
import LiveScoreBadge, { findScoreForGame } from './LiveScore'

interface Props {
  events: OddsEvent[]
  scores?: ScoreEvent[]
}

const LEG_CHOICES = [2, 3, 4, 5, 6]

function money(amount: number): string {
  return amount.toLocaleString(undefined, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function evClass(evPercent: number): string {
  if (evPercent >= 5) return 'text-green-400'
  if (evPercent >= 1) return 'text-emerald-400'
  if (evPercent >= 0) return 'text-yellow-400'
  return 'text-slate-400'
}

function signedPercent(evPercent: number): string {
  return `${evPercent >= 0 ? '+' : ''}${evPercent.toFixed(1)}%`
}

export default function BonusParlays({ events, scores }: Props) {
  const [legCount, setLegCount] = useState(3)
  const [stake, setStake] = useState(50)
  const [book, setBook] = useState<string>('best')
  const [swappedIn, setSwappedIn] = useState<string | null>(null)

  const attractive = useMemo(() => findAttractiveLines(events ?? []), [events])
  const longest = maxParlayLegs(attractive)
  const activeLegs = longest < 2 ? 2 : Math.min(legCount, longest)

  const legsByBook = useMemo(() => bestLegsByBook(attractive), [attractive])
  const tickets = useMemo(() => buildParlays(attractive, activeLegs), [attractive, activeLegs])

  useEffect(() => {
    setSwappedIn(null)
  }, [activeLegs, book])

  useEffect(() => {
    if (book !== 'best' && !tickets.some(ticket => ticket.book === book)) {
      setBook('best')
    }
  }, [tickets, book])

  const featured: BuiltParlay | null = useMemo(() => {
    if (tickets.length === 0) return null
    const base = book === 'best' ? tickets[0] : tickets.find(t => t.book === book) ?? tickets[0]
    if (!swappedIn || swappedIn === base.legs[base.legs.length - 1]?.eventId) return base

    const pool = legsByBook.get(base.book) ?? []
    const incoming = pool.find(leg => leg.eventId === swappedIn)
    if (!incoming || base.legs.some(leg => leg.eventId === incoming.eventId)) return base

    const kept = base.legs.slice(0, -1)
    return buildParlay(base.book, [...kept, incoming].sort((a, b) => b.edge - a.edge || b.odds - a.odds))
  }, [tickets, book, swappedIn, legsByBook])

  const alternates = useMemo(() => {
    if (!featured) return []
    const pool = legsByBook.get(featured.book) ?? []
    const used = new Set(featured.legs.map(leg => leg.eventId))
    return pool.filter(leg => !used.has(leg.eventId))
  }, [featured, legsByBook])

  const otherBooks = tickets.filter(t => t.book !== featured?.book)
  const stakeAmount = Number.isFinite(stake) && stake > 0 ? stake : 0
  const toWin = featured ? stakeAmount * (featured.decimalOdds - 1) : 0
  const expectedProfit = featured && featured.evPercent !== null ? stakeAmount * (featured.evPercent / 100) : null

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <Gift className="w-5 h-5 text-green-400" />
          <h2 className="text-lg font-semibold">Bonus Parlays</h2>
          <span className="text-sm text-slate-400 ml-2">
            {tickets.length === 0
              ? 'Need 2+ games at one book'
              : `${tickets.length} ${tickets.length === 1 ? 'book' : 'books'} can build a ${activeLegs}-leg`}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-400">Stake</label>
          <input
            type="number"
            value={stake}
            onChange={(e) => setStake(Number(e.target.value))}
            className="w-24 bg-slate-800/50 border border-slate-700 rounded-lg px-2 py-1 text-sm focus:outline-none focus:border-green-500 mono"
            min="1"
            step="10"
          />
        </div>
      </div>

      <div className="card p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-slate-200">Parlay legs</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Best price at one book, one game each
            </p>
          </div>
          <div className="flex items-center gap-2">
            {LEG_CHOICES.map(count => {
              const disabled = count > longest
              const selected = count === activeLegs && !disabled
              return (
                <button
                  key={count}
                  type="button"
                  disabled={disabled}
                  onClick={() => setLegCount(count)}
                  className={`min-w-10 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                    selected
                      ? 'bg-green-500/15 border-green-500/40 text-green-400'
                      : disabled
                        ? 'border-slate-800 text-slate-600 cursor-not-allowed'
                        : 'border-slate-700 text-slate-300 hover:border-slate-500 hover:text-slate-100'
                  }`}
                >
                  {count}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {featured && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="card p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Parlay odds</span>
                <Layers className="w-4 h-4 text-green-400" />
              </div>
              <p className="text-2xl font-bold mt-1">{formatOdds(featured.americanOdds)}</p>
              <p className="text-xs text-slate-500 mt-1">{featured.decimalOdds.toFixed(2)} decimal</p>
            </div>
            <div className="card p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Price edge</span>
                <TrendingUp className="w-4 h-4 text-green-400" />
              </div>
              <p className="text-2xl font-bold mt-1 text-green-400">+{featured.priceEdge.toFixed(1)}%</p>
              <p className="text-xs text-slate-500 mt-1">better than the next book</p>
            </div>
            <div className="card p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">To win</span>
                <Gift className="w-4 h-4 text-cyan-400" />
              </div>
              <p className="text-2xl font-bold mt-1 text-cyan-400">{money(toWin)}</p>
              <p className="text-xs text-slate-500 mt-1">on {money(stakeAmount)} stake</p>
            </div>
            <div className="card p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Fair EV</span>
                <TrendingUp className="w-4 h-4 text-yellow-400" />
              </div>
              <p className={`text-2xl font-bold mt-1 ${featured.evPercent === null ? 'text-slate-400' : evClass(featured.evPercent)}`}>
                {featured.evPercent === null ? '—' : signedPercent(featured.evPercent)}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {expectedProfit === null ? featured.book : `${money(expectedProfit)} expected`}
              </p>
            </div>
          </div>

          {tickets.length > 1 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs uppercase tracking-wider text-slate-500">Book</span>
              <button
                type="button"
                onClick={() => setBook('best')}
                className={`px-3 py-1 rounded-full text-xs border ${
                  book === 'best'
                    ? 'border-green-500/40 text-green-400 bg-green-500/10'
                    : 'border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                Best price
              </button>
              {tickets.map(ticket => (
                <button
                  key={ticket.book}
                  type="button"
                  onClick={() => setBook(ticket.book)}
                  className={`px-3 py-1 rounded-full text-xs border ${
                    book === ticket.book
                      ? 'border-green-500/40 text-green-400 bg-green-500/10'
                      : 'border-slate-700 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {ticket.book} · +{ticket.priceEdge.toFixed(1)}%
                </button>
              ))}
            </div>
          )}

          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-medium">
                {featured.legs.length}-leg {featured.book} parlay
              </h3>
              <span className="text-xs text-slate-500">Sorted by price edge</span>
            </div>
            <div className="divide-y divide-slate-800">
              {featured.legs.map((leg, index) => {
                const liveScore = findScoreForGame(scores, leg.eventId, leg.homeTeam, leg.awayTeam)
                return (
                  <div key={`${leg.eventId}-${leg.selection}`} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <span className="mt-0.5 w-6 h-6 rounded-full bg-green-500/10 text-green-400 text-xs font-semibold flex items-center justify-center shrink-0">
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="text-sm font-bold truncate">
                          {leg.selection}
                        </div>
                        <div className="text-xs text-slate-500">
                          {leg.awayTeam} @ {leg.homeTeam} · {leg.market} · {format(new Date(leg.commenceTime), 'MMM d, h:mm a')}
                        </div>
                        {liveScore && (
                          <div className="mt-1">
                            <LiveScoreBadge score={liveScore} homeTeam={leg.homeTeam} awayTeam={leg.awayTeam} />
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 sm:gap-6 pl-9 sm:pl-0">
                      <div className="text-right">
                        <div className="text-sm font-semibold text-green-400">{formatOdds(leg.odds)}</div>
                        <div className="text-[10px] uppercase tracking-wider text-slate-500">Odds</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-green-400">+{leg.edge.toFixed(1)}%</div>
                        <div className="text-[10px] uppercase tracking-wider text-slate-500">
                          {leg.evPercent === null ? 'vs next' : `vs next · ${signedPercent(leg.evPercent)} EV`}
                        </div>
                      </div>
                      <BookOpenLink bookTitle={leg.book} deepLink={leg.bookDeepLink} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {alternates.length > 0 && (
            <div className="card p-4">
              <h3 className="text-sm font-medium">Swap a leg</h3>
              <p className="text-xs text-slate-500 mt-1">
                Replaces the smallest price edge and keeps this a {featured.legs.length}-leg ticket.
              </p>
              <div className="mt-3 flex flex-col gap-2">
                {alternates.map(leg => (
                  <button
                    key={leg.eventId}
                    type="button"
                    onClick={() => setSwappedIn(leg.eventId)}
                    className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 px-3 py-2 text-left hover:border-green-500/30 hover:bg-green-500/5 transition-colors"
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-bold truncate">{leg.selection}</span>
                      <span className="block text-xs text-slate-500 truncate">
                        {leg.awayTeam} @ {leg.homeTeam} · {leg.market}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block text-sm text-green-400">{formatOdds(leg.odds)}</span>
                      <span className="block text-xs text-green-400/80">+{leg.edge.toFixed(1)}% vs next</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {otherBooks.length > 0 && book === 'best' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {otherBooks.map(ticket => (
                <button
                  key={ticket.book}
                  type="button"
                  onClick={() => setBook(ticket.book)}
                  className="card p-4 text-left hover:border-green-500/30 transition-colors"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium">{ticket.book}</span>
                    <span className="text-sm font-semibold text-green-400">
                      +{ticket.priceEdge.toFixed(1)}%
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {formatOdds(ticket.americanOdds)}
                    {ticket.legs.map(leg => (
                      <span key={`${leg.eventId}-${leg.selection}`}>
                        {' · '}
                        <span className="font-bold text-slate-200">{leg.selection}</span>
                      </span>
                    ))}
                  </p>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {!featured && (
        <div className="card flex flex-col items-center justify-center py-12 text-slate-400">
          <AlertTriangle className="w-8 h-8 mb-2" />
          <p>No parlay available yet</p>
          <p className="text-sm text-slate-500 text-center max-w-md mt-1">
            A ticket needs at least two games where the same book has the best price.
            Refresh the odds, or check another sport.
          </p>
        </div>
      )}

      <div className="card p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-yellow-500/10 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-yellow-400" />
          </div>
          <div>
            <h3 className="font-medium text-sm">How this parlay is built</h3>
            <p className="text-sm text-slate-400 mt-1">
              Each leg is a price that book has to itself: better than the next book on that same
              side, one game per leg, all on one ticket. The line does not have to be positive EV.
              Fair EV shows up when Pinnacle has a matching number. Confirm the price is still up
              before you place it.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
