'use client'

import { useState, useEffect, useRef, FormEvent } from 'react'
import { X, Key, Lock, AlertCircle, RefreshCw } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { listOddsApiKeys, oddsKeyDetails } from '@/lib/odds-api'
import { readKeyOverrides, saveKeyOverrides, KeyOverrides } from '@/lib/admin-settings'

interface SettingsProps {
  isOpen: boolean
  onClose: () => void
  onRefresh: () => Promise<void>
  isRefreshing: boolean
  refreshError: string | null
}

const ADMIN_UNLOCK_KEY = 'hothand_admin_unlocked'
// This static-build password is a convenience guard, not secure authentication.
const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || ''
type KeyDetails = ReturnType<typeof oddsKeyDetails>
const EMPTY_DETAILS: KeyDetails = { source: 'none', state: 'missing' }

export default function Settings({ isOpen, onClose, onRefresh, isRefreshing, refreshError }: SettingsProps) {
  const [unlocked, setUnlocked] = useState(false)
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [keys, setKeys] = useState<KeyOverrides>(['', ''])
  const [savedKeys, setSavedKeys] = useState<KeyOverrides>(['', ''])
  const [details, setDetails] = useState<KeyDetails[]>([EMPTY_DETAILS, EMPTY_DETAILS])
  const [storageAvailable, setStorageAvailable] = useState(true)
  const [message, setMessage] = useState('')
  const [settingsError, setSettingsError] = useState('')
  const [sessionNotice, setSessionNotice] = useState('')
  const [confirmReset, setConfirmReset] = useState(false)
  const [refreshAttempted, setRefreshAttempted] = useState(false)
  const sessionRead = useRef(false)
  const dialogRef = useRef<HTMLDivElement>(null)
  const dirty = keys.some((key, index) => key.trim() !== savedKeys[index])
  const hasActiveKey = details.some(detail => detail.state !== 'missing')

  const updateDetails = () => setDetails([oddsKeyDetails(1), oddsKeyDetails(2)])

  useEffect(() => {
    if (!isOpen) return
    if (!sessionRead.current) {
      sessionRead.current = true
      try {
        setUnlocked(sessionStorage.getItem(ADMIN_UNLOCK_KEY) === '1')
      } catch {
        setSessionNotice('Session storage is unavailable. Unlock applies to this page only.')
      }
    }
    const stored = readKeyOverrides()
    setStorageAvailable(stored.ok)
    setKeys(stored.keys)
    setSavedKeys(stored.keys)
    setDetails([oddsKeyDetails(1), oddsKeyDetails(2)])
    setPassword('')
    setPasswordError('')
    setSettingsError(stored.ok ? '' : 'Browser storage is unavailable. Overrides cannot be read or saved.')
    setMessage('')
    setConfirmReset(false)
    setRefreshAttempted(false)
  }, [isOpen])

  useEffect(() => {
    if (isOpen && !isRefreshing) updateDetails()
  }, [isOpen, isRefreshing])

  // Keep keyboard focus in the dialog and return it to the opener when closed.
  useEffect(() => {
    if (!isOpen) return
    const opener = document.activeElement as HTMLElement | null
    const oldOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const focusable = () => Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled])'
    ) || [])
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      } else if (event.key === 'Tab') {
        const elements = focusable()
        const first = elements[0]
        const last = elements[elements.length - 1]
        if (event.shiftKey && (document.activeElement === first || !dialogRef.current?.contains(document.activeElement))) {
          event.preventDefault()
          last?.focus()
        } else if (!event.shiftKey && (document.activeElement === last || !dialogRef.current?.contains(document.activeElement))) {
          event.preventDefault()
          first?.focus()
        }
      }
    }
    document.addEventListener('keydown', onKeyDown)
    dialogRef.current?.focus()
    return () => {
      document.body.style.overflow = oldOverflow
      document.removeEventListener('keydown', onKeyDown)
      opener?.focus()
    }
  }, [isOpen, onClose])

  const handleUnlock = (event: FormEvent) => {
    event.preventDefault()
    if (!ADMIN_PASSWORD) {
      setPasswordError('Admin password is not configured in this build.')
      return
    }
    if (password !== ADMIN_PASSWORD) {
      setPasswordError('Wrong password.')
      return
    }
    try {
      sessionStorage.setItem(ADMIN_UNLOCK_KEY, '1')
    } catch {
      setSessionNotice('Session storage is unavailable. Unlock applies to this page only.')
    }
    setUnlocked(true)
    setPassword('')
    setPasswordError('')
  }

  const handleLock = () => {
    try {
      sessionStorage.removeItem(ADMIN_UNLOCK_KEY)
    } catch {
      setSessionNotice('Locked on this page. Close the tab to end any previously saved unlock session.')
    }
    setUnlocked(false)
    setPassword('')
    setPasswordError('')
    setMessage('')
    setConfirmReset(false)
  }

  const persist = (next: KeyOverrides, success: string) => {
    const result = saveKeyOverrides(next)
    const stored = readKeyOverrides()
    setStorageAvailable(stored.ok)
    updateDetails()
    setSavedKeys(stored.keys)
    setMessage('')
    if (!result.ok) {
      setSettingsError(result.error)
      return
    }
    if (!stored.ok) {
      setSettingsError('Settings were written, but could not be read back. Reopen Admin to verify.')
      return
    }
    setKeys(stored.keys)
    setSettingsError('')
    setMessage(success)
    setConfirmReset(false)
  }

  const handleRefresh = async () => {
    setRefreshAttempted(true)
    setMessage('')
    try {
      await onRefresh()
    } catch {
      setSettingsError('Could not refresh odds. Saved settings are unchanged.')
    }
    updateDetails()
  }

  const sourceLabel = (detail: KeyDetails) =>
    detail.source === 'browser' ? 'Browser override' : detail.source === 'site' ? 'Site default'
      : detail.source === 'unavailable' ? 'Override storage unreadable' : 'No key configured'
  const stateLabel = (detail: KeyDetails) =>
    detail.source === 'unavailable' ? 'Site fallback used if configured'
      : detail.state === 'missing' ? 'Not configured'
        : detail.state === 'spent' ? 'Quota limit previously recorded' : 'Configured · not validated'
  const inputClass = 'w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-green-500 transition-colors'
  const secondaryClass = 'min-h-[44px] px-4 py-2.5 border border-slate-700 hover:bg-slate-800 disabled:opacity-50 rounded-lg text-sm text-slate-200 transition-colors'

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70]" onClick={onClose} />
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-3 sm:inset-4 z-[70] flex items-center justify-center pointer-events-none">
            <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="admin-title" tabIndex={-1}
              className="card p-5 sm:p-6 w-full max-w-md pointer-events-auto max-h-[calc(100dvh-2rem)] overflow-y-auto">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/10 rounded-lg">
                    {unlocked ? <Key className="w-5 h-5 text-green-400" /> : <Lock className="w-5 h-5 text-green-400" />}
                  </div>
                  <div>
                    <h2 id="admin-title" className="text-lg font-semibold leading-tight">Admin</h2>
                    <p className="text-xs text-slate-400">{unlocked ? 'Personal odds settings' : 'Password required'}</p>
                  </div>
                </div>
                <button type="button" onClick={onClose} aria-label="Close admin"
                  className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-slate-800 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {sessionNotice && <p className="text-xs text-amber-300 mb-4" role="status">{sessionNotice}</p>}
              {unlocked ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {details.map((detail, index) => (
                      <div key={index} className="min-w-0 rounded-lg border border-slate-700/60 bg-slate-800/30 px-3 py-2">
                        <p className="text-slate-400">{index === 0 ? 'Primary key' : 'Backup key'}</p>
                        <p className="text-slate-200 mt-1">{sourceLabel(detail)}</p>
                        <p className={detail.state === 'spent' ? 'text-amber-300 mt-1' : 'text-slate-400 mt-1'}>{stateLabel(detail)}</p>
                      </div>
                    ))}
                  </div>

                  <form onSubmit={event => {
                    event.preventDefault()
                    persist(keys, 'Settings saved for this browser. No odds requested.')
                  }} className="space-y-4">
                    {keys.map((value, index) => (
                      <div key={index}>
                        <label htmlFor={`admin-odds-key-${index + 1}`} className="block text-sm font-medium mb-2">
                          {index === 0 ? 'Primary key override' : 'Backup key override'}
                        </label>
                        <input id={`admin-odds-key-${index + 1}`} type="password" value={value}
                          onChange={event => {
                            const next = [...keys] as KeyOverrides
                            next[index] = event.target.value
                            setKeys(next)
                            setMessage('')
                            setSettingsError('')
                            setConfirmReset(false)
                          }}
                          placeholder="Blank uses this slot's site default" autoComplete="off" spellCheck={false}
                          disabled={isRefreshing || !storageAvailable} className={inputClass} />
                      </div>
                    ))}
                    <p className="text-xs text-slate-400">
                      Overrides affect this browser only. Blank fields use the site defaults.
                      Primary is tried first, with backup on supported failures.
                      Status reflects configuration and recorded quota limits, not a live key check.
                    </p>
                    <button type="submit" disabled={!dirty || !storageAvailable || isRefreshing}
                      className="w-full min-h-[44px] px-4 py-2.5 bg-green-700 hover:bg-green-600 disabled:bg-slate-800 disabled:text-slate-400 rounded-lg text-sm font-medium transition-colors">
                      Save settings
                    </button>
                  </form>

                  {settingsError && <p className="text-sm text-red-300" role="alert">{settingsError}</p>}
                  {message && <p className="text-sm text-green-300" role="status">{message}</p>}
                  {dirty && <p className="text-xs text-amber-300" role="status">Unsaved changes. Save before refreshing odds.</p>}

                  {confirmReset ? (
                    <div className="rounded-lg border border-amber-400/40 p-3 space-y-3">
                      <p className="text-sm text-slate-200">Remove both browser overrides?</p>
                      <p className="text-xs text-slate-300">Site keys and cached odds stay unchanged. This will not request odds or rotate any keys.</p>
                      <div className="flex gap-2">
                        <button type="button" className={`${secondaryClass} flex-1`} onClick={() => setConfirmReset(false)}>Cancel</button>
                        <button type="button" className={`${secondaryClass} flex-1`} disabled={isRefreshing}
                          onClick={() => persist(['', ''], 'Site defaults restored for this browser. No odds requested.')}>
                          Confirm reset
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button type="button" className={`${secondaryClass} w-full`}
                      disabled={!storageAvailable || isRefreshing || (!savedKeys.some(Boolean) && !dirty)}
                      onClick={() => { setConfirmReset(true); setMessage('') }}>
                      Use site defaults
                    </button>
                  )}

                  <div className="border-t border-slate-700 pt-4 space-y-2">
                    <button type="button" onClick={handleRefresh}
                      disabled={dirty || confirmReset || isRefreshing || !hasActiveKey || !listOddsApiKeys().length}
                      className={`${secondaryClass} w-full flex items-center justify-center gap-2`}>
                      <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                      {isRefreshing ? 'Refreshing odds…' : 'Refresh odds'}
                    </button>
                    <p className="text-xs text-slate-400">Explicit refresh may use API credits. Results and freshness appear on the board.</p>
                    {!hasActiveKey && <p className="text-xs text-amber-300">No key configured. Save an override to request odds.</p>}
                    {refreshAttempted && refreshError && <p className="text-sm text-red-300" role="alert">{refreshError}</p>}
                    <button type="button" onClick={handleLock} className={`${secondaryClass} w-full`}>Lock admin</button>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-slate-400">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <p>Convenience guard only. Site keys and the password remain in the browser bundle; browser overrides are stored on this device.</p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleUnlock} className="space-y-4">
                  <div>
                    <label htmlFor="admin-password" className="block text-sm font-medium mb-2">Admin password</label>
                    <input id="admin-password" type="password" value={password}
                      onChange={event => { setPassword(event.target.value); setPasswordError('') }}
                      placeholder="Enter the admin password" autoFocus autoComplete="current-password" className={inputClass} />
                  </div>
                  {passwordError && <p className="text-sm text-red-300" role="alert">{passwordError}</p>}
                  <button type="submit" className="w-full min-h-[44px] px-4 py-2.5 bg-green-700 hover:bg-green-600 rounded-lg text-sm font-medium transition-colors">Unlock</button>
                </form>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
