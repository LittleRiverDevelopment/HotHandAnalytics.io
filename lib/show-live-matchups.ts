import { gameDisplayStatus } from './odds-utils'
import type { ScoreEvent } from './types'

/** `0` hides in-progress games. Missing or `1` keeps today's board. */
export const SHOW_LIVE_MATCHUPS_STORAGE_KEY = 'linesnipe_show_live_matchups'

type ReadableStore = Pick<Storage, 'getItem'>
type WritableStore = Pick<Storage, 'setItem'>

function browserStorage(): Storage | undefined {
  try {
    return typeof window === 'undefined' ? undefined : window.localStorage
  } catch {
    return undefined
  }
}

/** Missing or unreadable storage means show live matchups, which is today's board. */
export function getShowLiveMatchups(store: ReadableStore | undefined = browserStorage()): boolean {
  if (!store) return true
  try {
    return store.getItem(SHOW_LIVE_MATCHUPS_STORAGE_KEY) !== '0'
  } catch {
    return true
  }
}

export function setShowLiveMatchups(on: boolean, store: WritableStore | undefined = browserStorage()): void {
  if (!store) return
  try {
    store.setItem(SHOW_LIVE_MATCHUPS_STORAGE_KEY, on ? '1' : '0')
  } catch {
    // The open page can keep the choice in memory.
  }
}

/**
 * View filter only. On keeps every row. Off drops in-progress games and
 * leaves upcoming and finished games in place.
 */
export function includeMatchup(
  showLive: boolean,
  commenceTime: string | undefined,
  score: Pick<ScoreEvent, 'completed' | 'scores'> | undefined,
  now: number = Date.now()
): boolean {
  if (showLive) return true
  return gameDisplayStatus(commenceTime, score, now) !== 'live'
}
