'use client'

import { Activity, Calculator, History, Menu, TrendingUp, X } from 'lucide-react'
import type { ComponentType } from 'react'

export type AppTab =
  | 'discrepancies'
  | 'ev'
  | 'arbitrage'
  | 'props'
  | 'overview'
  | 'analytics'
  | 'tracker'
  | 'simulator'

type TabDef = {
  id: AppTab
  label: string
  icon: ComponentType<{ className?: string }>
}

const PRIMARY: { id: AppTab | 'more'; label: string; icon: ComponentType<{ className?: string }> }[] = [
  { id: 'overview', label: 'Home', icon: Activity },
  { id: 'discrepancies', label: 'Shop', icon: TrendingUp },
  { id: 'ev', label: '+EV', icon: Calculator },
  { id: 'tracker', label: 'Bets', icon: History },
  { id: 'more', label: 'More', icon: Menu },
]

export const MORE_TABS: AppTab[] = ['arbitrage', 'analytics', 'props', 'simulator']

interface Props {
  tabs: readonly TabDef[]
  activeTab: AppTab
  moreOpen: boolean
  onSelect: (tab: AppTab) => void
  onToggleMore: () => void
  onCloseMore: () => void
}

export default function MobileBottomNav({
  tabs,
  activeTab,
  moreOpen,
  onSelect,
  onToggleMore,
  onCloseMore,
}: Props) {
  const moreTabs = tabs.filter(t => MORE_TABS.includes(t.id))
  const moreActive = MORE_TABS.includes(activeTab)

  return (
    <>
      {moreOpen && (
        <button
          type="button"
          aria-label="Close menu"
          className="lg:hidden fixed inset-0 z-[55] bg-black/55 backdrop-blur-sm"
          onClick={onCloseMore}
        />
      )}

      {moreOpen && (
        <div className="lg:hidden fixed inset-x-0 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-[60] px-3 pb-2">
          <div className="card p-2 shadow-2xl shadow-black/40">
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-500">More</span>
              <button
                type="button"
                onClick={onCloseMore}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/80"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-1">
              {moreTabs.map(tab => {
                const Icon = tab.icon
                const selected = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => onSelect(tab.id)}
                    className={`flex items-center gap-2 min-h-[48px] px-3 rounded-lg text-sm font-medium ${
                      selected
                        ? 'bg-green-500/10 text-green-400'
                        : 'text-slate-300 hover:bg-slate-800/70'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {tab.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      <nav
        className="lg:hidden fixed inset-x-0 bottom-0 z-50 border-t border-slate-800 bg-[#0a0b0f]/95 backdrop-blur-xl"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        aria-label="Primary"
      >
        <div className="grid grid-cols-5">
          {PRIMARY.map(item => {
            const Icon = item.icon
            const selected =
              item.id === 'more' ? moreOpen || moreActive : activeTab === item.id && !moreOpen
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  if (item.id === 'more') onToggleMore()
                  else onSelect(item.id)
                }}
                className={`flex flex-col items-center justify-center gap-0.5 min-h-[52px] text-[11px] font-medium ${
                  selected ? 'text-green-400' : 'text-slate-400'
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </button>
            )
          })}
        </div>
      </nav>
    </>
  )
}
