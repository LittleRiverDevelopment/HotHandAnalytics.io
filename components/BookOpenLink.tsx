'use client'

import { ExternalLink } from 'lucide-react'
import { getSportsbookHomeUrlFromTitle } from '@/lib/sportsbook-links'

interface Props {
  bookTitle: string
  className?: string
  /** Stop row click / expand when used inside clickable tables */
  stopPropagation?: boolean
}

export default function BookOpenLink({ bookTitle, className = '', stopPropagation }: Props) {
  const href = getSportsbookHomeUrlFromTitle(bookTitle)
  if (!href) return null

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={`Open ${bookTitle} in new tab`}
      aria-label={`Open ${bookTitle} sportsbook`}
      onClick={e => {
        if (stopPropagation) e.stopPropagation()
      }}
      className={`inline-flex items-center justify-center p-1 rounded-md text-slate-500 hover:text-green-400 hover:bg-slate-800/80 transition-colors ${className}`}
    >
      <ExternalLink className="w-3.5 h-3.5" />
    </a>
  )
}
