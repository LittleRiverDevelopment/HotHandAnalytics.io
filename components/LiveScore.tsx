import { ScoreEvent } from '@/lib/types'
import { findMatchingScore } from '@/lib/odds-utils'

interface Props {
  score: ScoreEvent | undefined
  homeTeam: string
  awayTeam: string
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

export default function LiveScoreBadge({ score, homeTeam, awayTeam }: Props) {
  if (!score || !score.scores || score.scores.length === 0) return null

  const awayScore = score.scores.find(s => s.name === awayTeam)?.score
  const homeScore = score.scores.find(s => s.name === homeTeam)?.score
  if (awayScore === undefined || homeScore === undefined) return null

  if (score.completed) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-700/40 border border-slate-600/50 text-xs font-mono shrink-0">
        <span className="text-slate-400 font-semibold tracking-wide">FINAL</span>
        <span className="text-slate-200">{awayScore}-{homeScore}</span>
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
      <span className="text-slate-200">{awayScore}-{homeScore}</span>
    </span>
  )
}
