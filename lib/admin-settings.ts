/** Browser-only overrides. Site defaults remain part of the static build. */
export const ODDS_KEY_STORAGE_KEYS = ['hothand_odds_api_key', 'hothand_odds_api_key_2'] as const

type KeyStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
export type KeyOverrides = [string, string]
type ReadResult = { ok: true; keys: KeyOverrides } | { ok: false; keys: KeyOverrides }
export type SaveResult = { ok: true } | { ok: false; error: string }

function browserStorage(): KeyStorage | undefined {
  try {
    return typeof window === 'undefined' ? undefined : window.localStorage
  } catch {
    return undefined
  }
}

export function readKeyOverrides(storage: KeyStorage | undefined = browserStorage()): ReadResult {
  if (!storage) return { ok: false, keys: ['', ''] }
  try {
    return {
      ok: true,
      keys: ODDS_KEY_STORAGE_KEYS.map(key => storage.getItem(key)?.trim() || '') as KeyOverrides,
    }
  } catch {
    return { ok: false, keys: ['', ''] }
  }
}

/** Only writes overrides. Never fetches, edits site defaults, or clears odds caches. */
export function saveKeyOverrides(
  keys: KeyOverrides,
  storage: KeyStorage | undefined = browserStorage()
): SaveResult {
  if (!storage) return { ok: false, error: 'Browser storage is unavailable. Settings were not saved.' }
  let previous: (string | null)[]
  try {
    previous = ODDS_KEY_STORAGE_KEYS.map(key => storage.getItem(key))
  } catch {
    return { ok: false, error: 'Could not read browser settings. Nothing was changed.' }
  }

  const write = (key: string, value: string | null) => {
    if (value) storage.setItem(key, value)
    else storage.removeItem(key)
  }
  try {
    ODDS_KEY_STORAGE_KEYS.forEach((key, index) => write(key, keys[index].trim()))
    return { ok: true }
  } catch {
    try {
      ODDS_KEY_STORAGE_KEYS.forEach((key, index) => write(key, previous[index]))
      return { ok: false, error: 'Could not save settings. Previous settings were restored.' }
    } catch {
      return {
        ok: false,
        error: 'Could not save both settings or fully restore them. Check key sources before retrying.',
      }
    }
  }
}
