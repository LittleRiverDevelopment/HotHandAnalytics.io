import { ScoreEvent } from '@/lib/types'
import { findMatchingScore, gameDisplayStatus, teamScoreValue } from '@/lib/odds-utils'
import { format } from 'date-fns'

interface Props {
  score: ScoreEvent | undefined
  homeTeam: string
  awayTeam: string
  commenceTime?: string
}

/** Finds the ScoreEvent for a game, matching by id first and falling back to nearby team names. */
export function findScoreForGame(
  scores: ScoreEvent[] | undefined,
  eventId: string,
  homeTeam: string,
  awayTeam: string,
  commenceTime?: string
): ScoreEvent | undefined {
  return findMatchingScore(
    {
      id: eventId,
      home_team: homeTeam,
      away_team: awayTeam,
      commence_time: commenceTime ?? '',
    },
    scores
  )
}

export function isLiveGame(commenceTime: string | undefined, score: ScoreEvent | undefined): boolean {
  return gameDisplayStatus(commenceTime, score) === 'live'
}

function scoreLine(away: string | undefined, home: string | undefined): string | null {
  if (away === undefined || home === undefined) return null
  return `${away}-${home}`
}

export default function LiveScoreBadge({ score, homeTeam, awayTeam, commenceTime }: Props) {
  const status = gameDisplayStatus(commenceTime, score)
  if (status === 'upcoming') return null

  const awayScore = teamScoreValue(score?.scores, awayTeam, score?.away_team)
  const homeScore = teamScoreValue(score?.scores, homeTeam, score?.home_team)
  const numbers = scoreLine(awayScore, homeScore)

  if (status === 'final') {
    if (!numbers) return null
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-700/40 border border-slate-600/50 text-xs font-mono shrink-0">
        <span className="text-slate-400 font-semibold tracking-wide">FINAL</span>
        <span className="text-slate-200">{numbers}</span>
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-red-500/10 border border-red-500/30 text-xs font-mono shrink-0">
      <span className="relative flex h-1.5 w-1.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
      </span>
      <span className="text-red-400 font-semibold tracking-wide">LIVE</span>
      {numbers && <span className="text-slate-200">{numbers}</span>}
    </span>
  )
}

/** Right-aligned tip-off, or Live once the game has started. */
export function StartTime({
  commenceTime,
  score,
  datePattern = 'MMM d, yyyy',
}: {
  commenceTime: string
  score?: ScoreEvent
  datePattern?: string
}) {
  const when = new Date(commenceTime)
  const valid = !Number.isNaN(when.getTime())
  if (gameDisplayStatus(commenceTime, score) === 'live') {
    return (
      <div className="flex flex-col items-end">
        <span className="text-sm font-semibold text-red-400 tracking-wide">Live</span>
        {valid && <span className="text-xs text-slate-500">{format(when, datePattern)}</span>}
      </div>
    )
  }
  if (!valid) return null
  return (
    <div className="flex flex-col items-end">
      <span className="text-sm">{format(when, 'h:mm a')}</span>
      <span className="text-xs text-slate-500">{format(when, datePattern)}</span>
    </div>
  )
}
