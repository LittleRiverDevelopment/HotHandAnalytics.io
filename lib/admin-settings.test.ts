import { test, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { ODDS_KEY_STORAGE_KEYS, readKeyOverrides, saveKeyOverrides } from './admin-settings'
import { listOddsApiKeys, oddsKeyDetails, fetchOddsClient, getIncludeAltLines, setIncludeAltLines } from './odds-api'

class FakeStorage {
  data = new Map<string, string>()
  failRead = false
  failWrite: ((key: string) => boolean) | undefined
  getItem(key: string) {
    if (this.failRead) throw new Error('Synthetic denied read')
    return this.data.get(key) ?? null
  }
  setItem(key: string, value: string) {
    if (this.failWrite?.(key)) throw new Error('Synthetic denied write')
    this.data.set(key, value)
  }
  removeItem(key: string) {
    if (this.failWrite?.(key)) throw new Error('Synthetic denied remove')
    this.data.delete(key)
  }
}

const oldWindow = Object.getOwnPropertyDescriptor(globalThis, 'window')
const oldStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
const oldFetch = globalThis.fetch
const oldPrimary = process.env.NEXT_PUBLIC_ODDS_API_KEY
const oldBackup = process.env.NEXT_PUBLIC_ODDS_API_KEY_2
let storage: FakeStorage
let requests: string[]

beforeEach(() => {
  storage = new FakeStorage()
  requests = []
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { localStorage: storage } })
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage })
  process.env.NEXT_PUBLIC_ODDS_API_KEY = 'synthetic-site-primary'
  process.env.NEXT_PUBLIC_ODDS_API_KEY_2 = 'synthetic-site-backup'
  globalThis.fetch = async input => {
    requests.push(String(input))
    return new Response('[]', { status: 200 })
  }
})

afterEach(() => {
  if (oldWindow) Object.defineProperty(globalThis, 'window', oldWindow)
  else Reflect.deleteProperty(globalThis, 'window')
  if (oldStorage) Object.defineProperty(globalThis, 'localStorage', oldStorage)
  else Reflect.deleteProperty(globalThis, 'localStorage')
  globalThis.fetch = oldFetch
  if (oldPrimary === undefined) delete process.env.NEXT_PUBLIC_ODDS_API_KEY
  else process.env.NEXT_PUBLIC_ODDS_API_KEY = oldPrimary
  if (oldBackup === undefined) delete process.env.NEXT_PUBLIC_ODDS_API_KEY_2
  else process.env.NEXT_PUBLIC_ODDS_API_KEY_2 = oldBackup
})

test('empty overrides retain both site defaults and truthful configuration status', () => {
  assert.deepEqual(readKeyOverrides(), { ok: true, keys: ['', ''] })
  assert.deepEqual(listOddsApiKeys(), ['synthetic-site-primary', 'synthetic-site-backup'])
  assert.deepEqual(oddsKeyDetails(1), { source: 'site', state: 'ready' })
  assert.equal(requests.length, 0)
})

test('save trims overrides, gives per-slot precedence, and makes no requests', () => {
  assert.deepEqual(saveKeyOverrides([' synthetic-browser-primary ', '']), { ok: true })
  assert.deepEqual(readKeyOverrides().keys, ['synthetic-browser-primary', ''])
  assert.deepEqual(listOddsApiKeys(), ['synthetic-browser-primary', 'synthetic-site-backup'])
  assert.deepEqual(oddsKeyDetails(1), { source: 'browser', state: 'ready' })
  assert.equal(oddsKeyDetails(2).source, 'site')
  assert.equal(requests.length, 0)
})

test('backup override and duplicate-key deduplication preserve existing behavior', () => {
  saveKeyOverrides(['', 'synthetic-browser-backup'])
  assert.deepEqual(listOddsApiKeys(), ['synthetic-site-primary', 'synthetic-browser-backup'])
  saveKeyOverrides(['synthetic-same-key', 'synthetic-same-key'])
  assert.deepEqual(listOddsApiKeys(), ['synthetic-same-key'])
})

test('reset removes only overrides, retains cache and unrelated data, and makes no requests', () => {
  storage.setItem('hothand_odds_cache', '{"synthetic":"cached payload"}')
  storage.setItem('hothand_exhausted_odds_keys', '{}')
  saveKeyOverrides(['synthetic-browser-primary', 'synthetic-browser-backup'])
  assert.deepEqual(saveKeyOverrides(['', '']), { ok: true })
  assert.equal(storage.getItem(ODDS_KEY_STORAGE_KEYS[0]), null)
  assert.equal(storage.getItem(ODDS_KEY_STORAGE_KEYS[1]), null)
  assert.equal(storage.getItem('hothand_odds_cache'), '{"synthetic":"cached payload"}')
  assert.equal(storage.getItem('hothand_exhausted_odds_keys'), '{}')
  assert.deepEqual(listOddsApiKeys(), ['synthetic-site-primary', 'synthetic-site-backup'])
  assert.equal(requests.length, 0)
})

test('no defaults and no overrides give missing status and no request', async () => {
  delete process.env.NEXT_PUBLIC_ODDS_API_KEY
  delete process.env.NEXT_PUBLIC_ODDS_API_KEY_2
  assert.deepEqual(listOddsApiKeys(), [])
  assert.deepEqual(oddsKeyDetails(1), { source: 'none', state: 'missing' })
  const response = await fetchOddsClient('baseball_mlb', undefined, true)
  assert.equal(response.data, null)
  assert.ok(response.error)
  assert.equal(requests.length, 0)
})

test('blocked reads are disclosed, save fails without writes, site fallback remains usable', () => {
  storage.failRead = true
  assert.equal(readKeyOverrides().ok, false)
  const result = saveKeyOverrides(['synthetic-browser-primary', ''])
  assert.equal(result.ok, false)
  assert.equal(storage.data.size, 0)
  assert.equal(oddsKeyDetails(1).source, 'unavailable')
  assert.deepEqual(listOddsApiKeys(), ['synthetic-site-primary', 'synthetic-site-backup'])
})

test('blocked localStorage property does not throw', () => {
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { get localStorage() { throw new Error('Synthetic blocked storage') } },
  })
  assert.equal(readKeyOverrides().ok, false)
  assert.equal(saveKeyOverrides(['synthetic-browser-primary', '']).ok, false)
  assert.doesNotThrow(() => listOddsApiKeys())
})

test('second-slot save failure rolls back the first slot instead of claiming success', () => {
  saveKeyOverrides(['synthetic-old-primary', 'synthetic-old-backup'])
  let failed = false
  storage.failWrite = key => {
    if (key === ODDS_KEY_STORAGE_KEYS[1] && !failed) { failed = true; return true }
    return false
  }
  const result = saveKeyOverrides(['synthetic-new-primary', 'synthetic-new-backup'])
  assert.equal(result.ok, false)
  assert.deepEqual(readKeyOverrides().keys, ['synthetic-old-primary', 'synthetic-old-backup'])
  assert.equal(requests.length, 0)
})

test('reset failure restores previous overrides', () => {
  saveKeyOverrides(['synthetic-old-primary', 'synthetic-old-backup'])
  let failed = false
  storage.failWrite = key => {
    if (key === ODDS_KEY_STORAGE_KEYS[1] && !failed) { failed = true; return true }
    return false
  }
  assert.equal(saveKeyOverrides(['', '']).ok, false)
  assert.deepEqual(readKeyOverrides().keys, ['synthetic-old-primary', 'synthetic-old-backup'])
})

test('rollback failure is explicit and error never includes supplied keys', () => {
  saveKeyOverrides(['synthetic-old-primary', 'synthetic-old-backup'])
  storage.failWrite = key => key === ODDS_KEY_STORAGE_KEYS[1]
  const result = saveKeyOverrides(['synthetic-sensitive-primary', 'synthetic-sensitive-backup'])
  assert.equal(result.ok, false)
  if (!result.ok) {
    assert.match(result.error, /fully restore/)
    assert.doesNotMatch(result.error, /synthetic-/)
  }
})

test('recorded quota flag is distinguished from configured status', () => {
  const now = new Date()
  storage.setItem('hothand_exhausted_odds_keys', JSON.stringify({
    ['synthetic-site-primary'.slice(-8)]: `${now.getUTCFullYear()}-${now.getUTCMonth() + 1}`,
  }))
  assert.deepEqual(oddsKeyDetails(1), { source: 'site', state: 'spent' })
})

test('invalid primary still falls back to backup on explicit refresh', async () => {
  globalThis.fetch = async input => {
    requests.push(String(input))
    return new Response(requests.length === 1 ? '{}' : '[]', { status: requests.length === 1 ? 401 : 200 })
  }
  const result = await fetchOddsClient('baseball_mlb', undefined, true)
  assert.equal(result.error, null)
  assert.equal(requests.length, 2)
  assert.ok(requests[0].includes('synthetic-site-primary'))
  assert.ok(requests[1].includes('synthetic-site-backup'))
})

test('quota-exhausted primary still falls back to backup on explicit refresh', async () => {
  globalThis.fetch = async input => {
    requests.push(String(input))
    return new Response(requests.length === 1 ? '{}' : '[]', { status: requests.length === 1 ? 429 : 200 })
  }
  const result = await fetchOddsClient('baseball_mlb', undefined, true)
  assert.equal(result.error, null)
  assert.equal(requests.length, 2)
  assert.equal(oddsKeyDetails(1).state, 'spent')
})

test('blocked quota writes do not interrupt primary-to-backup failover', async () => {
  storage.failWrite = () => true
  globalThis.fetch = async input => {
    requests.push(String(input))
    return new Response(requests.length === 1 ? '{}' : '[]', { status: requests.length === 1 ? 429 : 200 })
  }
  const result = await fetchOddsClient('baseball_mlb', undefined, true)
  assert.equal(result.error, null)
  assert.equal(requests.length, 2)
})

test('blocked alt-line preference storage cannot prevent opening the app', () => {
  storage.failRead = true
  storage.failWrite = () => true
  assert.equal(getIncludeAltLines(), false)
  assert.doesNotThrow(() => setIncludeAltLines(true))
})

test('network exceptions never echo key-bearing URLs into visible errors', async () => {
  globalThis.fetch = async input => { throw new Error(`Synthetic failure fetching ${String(input)}`) }
  const result = await fetchOddsClient('baseball_mlb', undefined, true)
  assert.equal(result.data, null)
  assert.match(result.error || '', /Network request failed/)
  assert.doesNotMatch(result.error || '', /synthetic-|apiKey=/)
})
