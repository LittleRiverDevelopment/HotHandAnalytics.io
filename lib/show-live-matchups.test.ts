import assert from 'node:assert/strict'
import test from 'node:test'
import { gameDisplayStatus } from './odds-utils'
import {
  SHOW_LIVE_MATCHUPS_STORAGE_KEY,
  getShowLiveMatchups,
  includeMatchup,
  setShowLiveMatchups,
} from './show-live-matchups'

test('includeMatchup hides only in-progress games', () => {
  const now = Date.parse('2026-11-14T19:00:00.000Z')
  const upcoming = new Date(now + 2 * 60 * 60 * 1000).toISOString()
  const started = new Date(now - 30 * 60 * 1000).toISOString()
  const finalScore = { completed: true, scores: [{ name: 'A', score: '10' }, { name: 'B', score: '8' }] }
  const liveScore = { completed: false, scores: [{ name: 'A', score: '10' }, { name: 'B', score: '8' }] }

  assert.equal(includeMatchup(true, started, liveScore, now), true)
  assert.equal(includeMatchup(true, upcoming, undefined, now), true)
  assert.equal(includeMatchup(true, started, finalScore, now), true)

  assert.equal(includeMatchup(false, started, liveScore, now), false)
  assert.equal(includeMatchup(false, started, undefined, now), false)
  assert.equal(includeMatchup(false, upcoming, undefined, now), true)
  assert.equal(includeMatchup(false, upcoming, liveScore, now), false)
  assert.equal(includeMatchup(false, started, finalScore, now), true)
  assert.equal(includeMatchup(false, upcoming, finalScore, now), true)
  assert.equal(gameDisplayStatus(started, finalScore, now), 'final')
  assert.equal(gameDisplayStatus(upcoming, liveScore, now), 'live')
})

test('show live matchups defaults on and persists', () => {
  const mem = new Map<string, string>()
  const store = {
    getItem: (key: string) => mem.get(key) ?? null,
    setItem: (key: string, value: string) => {
      mem.set(key, value)
    },
  }

  assert.equal(getShowLiveMatchups(store), true)
  setShowLiveMatchups(false, store)
  assert.equal(store.getItem(SHOW_LIVE_MATCHUPS_STORAGE_KEY), '0')
  assert.equal(getShowLiveMatchups(store), false)
  setShowLiveMatchups(true, store)
  assert.equal(store.getItem(SHOW_LIVE_MATCHUPS_STORAGE_KEY), '1')
  assert.equal(getShowLiveMatchups(store), true)
})

test('blocked storage does not throw and stays on', () => {
  const store = {
    getItem() {
      throw new Error('blocked')
    },
    setItem() {
      throw new Error('blocked')
    },
  }
  assert.equal(getShowLiveMatchups(store), true)
  assert.doesNotThrow(() => setShowLiveMatchups(false, store))
})
