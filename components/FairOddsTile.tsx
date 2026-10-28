import { formatOdds } from '@/lib/odds-utils'

/** No-vig price from Pinnacle. Not ranked as a sportsbook best or worst. */
export default function FairOddsTile({ odds, point }: { odds: number; point?: number }) {
  return (
    <div className="rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-3 py-2.5 text-center">
      <div className="text-[10px] text-cyan-300/90 truncate">Pinnacle fair</div>
      <div className="font-mono text-sm font-semibold mt-1 text-cyan-300">{formatOdds(odds)}</div>
      {point !== undefined && (
        <div className="text-[10px] text-slate-500 mt-0.5">
          Line {point > 0 ? '+' : ''}{point}
        </div>
      )}
      <span className="text-[10px] text-cyan-300/80">No vig</span>
    </div>
  )
}
