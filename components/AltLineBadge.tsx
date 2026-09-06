export default function AltLineBadge({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide bg-purple-500/15 text-purple-300 border border-purple-500/30 ${className}`}
      title="Alternate spread or total (not the main line)"
    >
      Alt
    </span>
  )
}
