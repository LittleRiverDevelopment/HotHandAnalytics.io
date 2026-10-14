'use client'

import { useSyncExternalStore } from 'react'

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

/** Phones and coarse pointers open the sportsbook in this tab so the app can take over. */
export function useMobileBookLayout() {
  return useSyncExternalStore(
    subscribeMobileLayout,
    getMobileLayoutSnapshot,
    getServerMobileLayoutSnapshot
  )
}
