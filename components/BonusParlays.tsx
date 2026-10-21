'use client'

import { useMemo } from 'react'
import { ExternalLink } from 'lucide-react'
import { OddsEvent, ScoreEvent } from '@/lib/types'
import { formatOdds } from '@/lib/odds-utils'
import { bestValueParlay, findAttractiveLines, parlayTapLabel } from '@/lib/parlay'
import { bonusParlayHref } from '@/lib/sportsbook-links'
import { format } from 'date-fns'
import LiveScoreBadge, { findScoreForGame } from './LiveScore'
import { useMobileBookLayout } from './useMobileBookLayout'

interface Props {
  events: OddsEvent[]
  scores?: ScoreEvent[]
}

function signedPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`
}

export default function BonusParlays({ events, scores }: Props) {
  const mobile = useMobileBookLayout()
  const pick = useMemo(
    () => bestValueParlay(findAttractiveLines(events ?? [])),
    [events]
  )
  const destination = useMemo(() => {
    if (!pick) return null
    return bonusParlayHref(
      pick.parlay.book,
      pick.parlay.legs.map(leg => leg.bookDeepLink),
      { mobile }
    )
  }, [pick, mobile])

  if (!pick || !destination?.href) {
    return (
      <div className="card flex items-center justify-center py-12 text-slate-400">
        <p>No parlay yet</p>
      </div>
    )
  }

  const { parlay } = pick
  const { label } = parlayTapLabel(parlay, destination.prefilled)

  return (
    <a
      href={destination.href}
      target={mobile ? undefined : '_blank'}
      rel="noopener noreferrer"
      aria-label={label}
      className="card block p-4 sm:p-5 transition-colors hover:border-green-500/40 active:border-green-500/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
    >
      <div className="flex items-start justify-between gap-4">
        <h3 className="text-xl font-semibold">
          {parlay.legs.length}-leg {parlay.book}
        </h3>
        <div className="text-right shrink-0">
          <p className="text-2xl font-bold text-green-400">{formatOdds(parlay.americanOdds)}</p>
          <p className="text-xs text-slate-500 mt-1">
            {parlay.evPercent === null ? `+${parlay.priceEdge.toFixed(1)}%` : `${signedPercent(parlay.evPercent)} EV`}
          </p>
        </div>
      </div>

      <div className="mt-4 divide-y divide-slate-800 border-y border-slate-800">
          {parlay.legs.map((leg, index) => {
            const liveScore = findScoreForGame(scores, leg.eventId, leg.homeTeam, leg.awayTeam)
            return (
              <div key={`${leg.eventId}-${leg.selection}`} className="py-3 flex items-start gap-3">
                <span className="mt-0.5 w-6 h-6 rounded-full bg-green-500/10 text-green-400 text-xs font-semibold flex items-center justify-center shrink-0">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">
                    {leg.selection}
                    <span className="text-slate-400 font-normal"> · {formatOdds(leg.odds)}</span>
                  </div>
                  <div className="text-xs text-slate-500 truncate">
                    {leg.awayTeam} @ {leg.homeTeam} · {leg.market} · {format(new Date(leg.commenceTime), 'MMM d, h:mm a')}
                  </div>
                  {liveScore && (
                    <div className="mt-1">
                      <LiveScoreBadge score={liveScore} homeTeam={leg.homeTeam} awayTeam={leg.awayTeam} />
                    </div>
                  )}
                </div>
              </div>
            )
          })}
      </div>

      <span className="mt-4 flex items-center justify-center gap-2 min-h-12 rounded-lg bg-green-500 text-slate-950 font-semibold">
        <ExternalLink className="w-4 h-4" aria-hidden />
        {parlay.book}
      </span>
    </a>
  )
}
