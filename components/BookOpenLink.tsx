'use client'

import { useMemo, useSyncExternalStore, type ReactNode } from 'react'
import { ExternalLink } from 'lucide-react'
import { getSportsbookHomeUrlFromTitle } from '@/lib/sportsbook-links'

interface Props {
  bookTitle: string
  /** The Odds API deep link (event / market / betslip) — takes priority over homepage */
  deepLink?: string | null
  className?: string
  /** Stop row click / expand when used inside clickable tables */
  stopPropagation?: boolean
  /** When set, shown instead of the icon (e.g. bet label) */
  children?: ReactNode
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

export default function BookOpenLink({
  bookTitle,
  deepLink,
  className = '',
  stopPropagation,
  children,
}: Props) {
  const useMobileLayout = useSyncExternalStore(
    subscribeMobileLayout,
    getMobileLayoutSnapshot,
    getServerMobileLayoutSnapshot
  )

  const trimmedDeep = deepLink?.trim()
  const href = useMemo(() => {
    if (trimmedDeep && /^https?:\/\//i.test(trimmedDeep)) return trimmedDeep
    return getSportsbookHomeUrlFromTitle(bookTitle, {
      mobile: useMobileLayout,
    })
  }, [bookTitle, trimmedDeep, useMobileLayout])

  if (!href) {
    if (children) return <span className={className}>{children}</span>
    return null
  }

  const isApiDeepLink = !!(trimmedDeep && /^https?:\/\//i.test(trimmedDeep))

  return (
    <a
      href={href}
      target={useMobileLayout ? undefined : '_blank'}
      rel="noopener noreferrer"
      title={
        isApiDeepLink
          ? `Open at ${bookTitle}`
          : `Open ${bookTitle}${useMobileLayout ? '' : ' in new tab'}`
      }
      aria-label={isApiDeepLink ? `Open this bet at ${bookTitle}` : `Open ${bookTitle} sportsbook`}
      onClick={e => {
        if (stopPropagation) e.stopPropagation()
      }}
      className={[
        children
          ? 'inline-flex items-center min-h-[44px] py-1.5 sm:min-h-0 sm:py-0 text-left font-medium text-slate-200 hover:text-green-400 hover:underline decoration-green-400/50 underline-offset-2'
          : 'inline-flex items-center justify-center rounded-md text-slate-500 hover:text-green-400 hover:bg-slate-800/80 active:bg-slate-700/80 transition-colors touch-manipulation select-none min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 p-2 sm:p-1',
        className,
      ].join(' ')}
    >
      {children ?? <ExternalLink className="w-4 h-4 sm:w-3.5 sm:h-3.5" aria-hidden />}
    </a>
  )
}
