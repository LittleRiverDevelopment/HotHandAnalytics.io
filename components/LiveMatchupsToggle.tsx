'use client'

import { useState } from 'react'
import { getShowLiveMatchups, setShowLiveMatchups as persistShowLiveMatchups } from '@/lib/show-live-matchups'

export function useShowLiveMatchups() {
  const [showLiveMatchups, setShow] = useState(() => getShowLiveMatchups())
  const setShowLiveMatchups = (on: boolean) => {
    persistShowLiveMatchups(on)
    setShow(on)
  }
  return { showLiveMatchups, setShowLiveMatchups }
}

export default function LiveMatchupsToggle({
  checked,
  onChange,
}: {
  checked: boolean
  onChange: (on: boolean) => void
}) {
  return (
    <label
      className="flex items-center gap-2 min-h-[44px] shrink-0 text-sm text-slate-300 cursor-pointer select-none"
      title="On shows in-progress games. Off hides them. Upcoming and finished games stay."
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        className="rounded border-slate-600 bg-slate-800 text-green-500 focus:ring-green-500/40 w-4 h-4"
      />
      <span>Live matchups</span>
    </label>
  )
}
