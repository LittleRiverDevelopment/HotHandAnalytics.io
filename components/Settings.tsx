'use client'

import { useState, useEffect, FormEvent } from 'react'
import { X, Key, Lock, Check, AlertCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { oddsKeyState } from '@/lib/odds-api'

interface SettingsProps {
  isOpen: boolean
  onClose: () => void
  onApiKeyChange: () => void
}

const API_KEY_STORAGE_KEY = 'hothand_odds_api_key'
const API_KEY_2_STORAGE_KEY = 'hothand_odds_api_key_2'
const ADMIN_UNLOCK_KEY = 'hothand_admin_unlocked'

// Admin password — type it in `.env` on this line's variable, then restart `npm run dev`:
//   NEXT_PUBLIC_ADMIN_PASSWORD=your-password
// For the live site, set the same value as the GitHub Actions secret
// NEXT_PUBLIC_ADMIN_PASSWORD and redeploy. Do not put the password in this file.
const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || ''

function readUnlocked(): boolean {
  if (typeof window === 'undefined') return false
  return sessionStorage.getItem(ADMIN_UNLOCK_KEY) === '1'
}

export default function Settings({ isOpen, onClose, onApiKeyChange }: SettingsProps) {
  const [unlocked, setUnlocked] = useState(false)
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [apiKey2, setApiKey2] = useState('')
  const [saved, setSaved] = useState(false)
  const [key1State, setKey1State] = useState<'missing' | 'ready' | 'spent'>('missing')
  const [key2State, setKey2State] = useState<'missing' | 'ready' | 'spent'>('missing')

  useEffect(() => {
    if (!isOpen) return
    setUnlocked(readUnlocked())
    setPassword('')
    setPasswordError('')
    setApiKey(localStorage.getItem(API_KEY_STORAGE_KEY) || '')
    setApiKey2(localStorage.getItem(API_KEY_2_STORAGE_KEY) || '')
    setKey1State(oddsKeyState(1))
    setKey2State(oddsKeyState(2))
    setSaved(false)
  }, [isOpen])

  const handleUnlock = (event: FormEvent) => {
    event.preventDefault()
    if (!ADMIN_PASSWORD || password !== ADMIN_PASSWORD) {
      setPasswordError('Wrong password.')
      return
    }
    sessionStorage.setItem(ADMIN_UNLOCK_KEY, '1')
    setUnlocked(true)
    setPassword('')
    setPasswordError('')
  }

  const handleLock = () => {
    sessionStorage.removeItem(ADMIN_UNLOCK_KEY)
    setUnlocked(false)
    setPassword('')
    setPasswordError('')
    setSaved(false)
  }

  const writeKey = (storageKey: string, value: string) => {
    const next = value.trim()
    if (next) localStorage.setItem(storageKey, next)
    else localStorage.removeItem(storageKey)
  }

  const refreshKeyState = () => {
    setKey1State(oddsKeyState(1))
    setKey2State(oddsKeyState(2))
  }

  const handleSave = () => {
    writeKey(API_KEY_STORAGE_KEY, apiKey)
    writeKey(API_KEY_2_STORAGE_KEY, apiKey2)
    refreshKeyState()
    setSaved(true)
    onApiKeyChange()
  }

  const handleClear = () => {
    setApiKey('')
    setApiKey2('')
    localStorage.removeItem(API_KEY_STORAGE_KEY)
    localStorage.removeItem(API_KEY_2_STORAGE_KEY)
    refreshKeyState()
    setSaved(false)
    onApiKeyChange()
  }

  const keyLabel = (state: 'missing' | 'ready' | 'spent') => {
    if (state === 'ready') return 'Ready'
    if (state === 'spent') return 'Used up'
    return 'Missing'
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70]"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-3 sm:inset-4 z-[70] flex items-center justify-center pointer-events-none"
          >
            <div className="card p-5 sm:p-6 w-full max-w-md pointer-events-auto max-h-[min(90dvh,40rem)] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/10 rounded-lg">
                    {unlocked ? (
                      <Key className="w-5 h-5 text-green-400" />
                    ) : (
                      <Lock className="w-5 h-5 text-green-400" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold leading-tight">Admin</h2>
                    <p className="text-xs text-slate-500">
                      {unlocked ? 'Odds key for this browser' : 'Password required'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close admin"
                  className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {unlocked ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg border border-slate-700/60 bg-slate-800/30 px-3 py-2">
                      <p className="text-slate-500">Key 1</p>
                      <p className={key1State === 'ready' ? 'text-green-400 mt-0.5' : key1State === 'spent' ? 'text-amber-400 mt-0.5' : 'text-slate-300 mt-0.5'}>
                        {keyLabel(key1State)}
                      </p>
                    </div>
                    <div className="rounded-lg border border-slate-700/60 bg-slate-800/30 px-3 py-2">
                      <p className="text-slate-500">Key 2</p>
                      <p className={key2State === 'ready' ? 'text-green-400 mt-0.5' : key2State === 'spent' ? 'text-amber-400 mt-0.5' : 'text-slate-300 mt-0.5'}>
                        {keyLabel(key2State)}
                      </p>
                    </div>
                  </div>

                  <form
                    onSubmit={(event) => {
                      event.preventDefault()
                      handleSave()
                    }}
                    className="space-y-4"
                  >
                    <div>
                      <label htmlFor="admin-odds-key" className="block text-sm font-medium mb-2">
                        Odds API key 1
                      </label>
                      <input
                        id="admin-odds-key"
                        type="password"
                        value={apiKey}
                        onChange={(e) => {
                          setApiKey(e.target.value)
                          setSaved(false)
                        }}
                        placeholder="Leave blank to use the site key"
                        autoComplete="off"
                        className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-green-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label htmlFor="admin-odds-key-2" className="block text-sm font-medium mb-2">
                        Odds API key 2
                      </label>
                      <input
                        id="admin-odds-key-2"
                        type="password"
                        value={apiKey2}
                        onChange={(e) => {
                          setApiKey2(e.target.value)
                          setSaved(false)
                        }}
                        placeholder="Backup key, used when key 1 is spent"
                        autoComplete="off"
                        className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-green-500 transition-colors"
                      />
                    </div>

                    <div className="flex items-start gap-2 p-3 bg-slate-800/30 rounded-lg">
                      <AlertCircle className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-slate-400">
                        Requests use key 1 until its monthly credits run out, then switch to key 2.
                        The two plans stay separate, so both quotas are available. A saved key replaces the site key for that slot in this browser.
                      </p>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={handleClear}
                        className="flex-1 min-h-[44px] px-4 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm font-medium transition-colors"
                      >
                        Clear
                      </button>
                      <button
                        type="submit"
                        disabled={saved}
                        className="flex-1 min-h-[44px] px-4 py-2.5 bg-green-600 hover:bg-green-500 disabled:bg-green-600/50 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        {saved ? (
                          <>
                            <Check className="w-4 h-4" />
                            Saved
                          </>
                        ) : (
                          'Save'
                        )}
                      </button>
                    </div>
                  </form>

                  <button
                    type="button"
                    onClick={handleLock}
                    className="w-full min-h-[44px] px-4 py-2.5 border border-slate-700 hover:bg-slate-800 rounded-lg text-sm text-slate-300 transition-colors"
                  >
                    Lock admin
                  </button>
                </div>
              ) : (
                <form onSubmit={handleUnlock} className="space-y-4">
                  <div>
                    <label htmlFor="admin-password" className="block text-sm font-medium mb-2">
                      Admin password
                    </label>
                    <input
                      id="admin-password"
                      type="password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value)
                        setPasswordError('')
                      }}
                      placeholder="Enter the admin password"
                      autoFocus
                      autoComplete="current-password"
                      className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-green-500 transition-colors"
                    />
                  </div>
                  {passwordError && (
                    <p className="text-sm text-red-400" role="alert">
                      {passwordError}
                    </p>
                  )}
                  <button
                    type="submit"
                    className="w-full min-h-[44px] px-4 py-2.5 bg-green-600 hover:bg-green-500 rounded-lg text-sm font-medium transition-colors"
                  >
                    Unlock
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
