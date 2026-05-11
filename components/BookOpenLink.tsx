'use client'

import { useMemo, useSyncExternalStore } from 'react'
import { ExternalLink } from 'lucide-react'
import { getSportsbookHomeUrlFromTitle } from '@/lib/sportsbook-links'

interface Props {
  bookTitle: string
  className?: string
  /** Stop row click / expand when used inside clickable tables */
  stopPropagation?: boolean
}

function subscribeMobileLayout(cb: () => void) {
  const mq = window.matchMedia('(max-width: 640px), (pointer: coarse)')
  mq.addEventListener('change', cb)
  return () => mq.removeEventListener('change', cb)
}

function getMobileLayoutSnapshot() {
  return window.matchMedia('(max-width: 640px), (pointer: coarse)').matches
}

function getServerMobileLayoutSnapshot() {
  return false
}

export default function BookOpenLink({ bookTitle, className = '', stopPropagation }: Props) {
  const useMobileLink = useSyncExternalStore(
    subscribeMobileLayout,
    getMobileLayoutSnapshot,
    getServerMobileLayoutSnapshot
  )

  const href = useMemo(
    () => getSportsbookHomeUrlFromTitle(bookTitle, { mobile: useMobileLink }),
    [bookTitle, useMobileLink]
  )

  if (!href) return null

  // Same-tab on phones avoids juggling tabs; new tab on desktop keeps HotHand open.
  return (
    <a
      href={href}
      target={useMobileLink ? undefined : '_blank'}
      rel="noopener noreferrer"
      title={`Open ${bookTitle}${useMobileLink ? '' : ' in new tab'}`}
      aria-label={`Open ${bookTitle} sportsbook`}
      onClick={e => {
        if (stopPropagation) e.stopPropagation()
      }}
      className={[
        'inline-flex items-center justify-center rounded-md text-slate-500',
        'hover:text-green-400 hover:bg-slate-800/80 active:bg-slate-700/80 transition-colors',
        'touch-manipulation select-none',
        'min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 p-2 sm:p-1',
        className,
      ].join(' ')}
    >
      <ExternalLink className="w-4 h-4 sm:w-3.5 sm:h-3.5" aria-hidden />
    </a>
  )
}
