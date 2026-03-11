'use client'

import { useState, useEffect } from 'react'
import { X, Key, ExternalLink, Check, AlertCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface SettingsProps {
  isOpen: boolean
  onClose: () => void
  onApiKeyChange: () => void
}

const API_KEY_STORAGE_KEY = 'hothand_odds_api_key'

export function getStoredApiKey(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(API_KEY_STORAGE_KEY)
}

export function setStoredApiKey(key: string): void {
  if (typeof window === 'undefined') return
  if (key) {
    localStorage.setItem(API_KEY_STORAGE_KEY, key)
  } else {
    localStorage.removeItem(API_KEY_STORAGE_KEY)
  }
}

export default function Settings({ isOpen, onClose, onApiKeyChange }: SettingsProps) {
  const [apiKey, setApiKey] = useState('')
  const [saved, setSaved] = useState(false)
  
  useEffect(() => {
    if (isOpen) {
      const stored = getStoredApiKey()
      setApiKey(stored || '')
      setSaved(false)
    }
  }, [isOpen])
  
  const handleSave = () => {
    setStoredApiKey(apiKey.trim())
    setSaved(true)
    onApiKeyChange()
    setTimeout(() => {
      onClose()
    }, 1000)
  }
  
  const handleClear = () => {
    setApiKey('')
    setStoredApiKey('')
    setSaved(false)
    onApiKeyChange()
  }
  
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md"
          >
            <div className="card p-6 m-4">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/10 rounded-lg">
                    <Key className="w-5 h-5 text-green-400" />
                  </div>
                  <h2 className="text-lg font-semibold">Settings</h2>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    The Odds API Key
                  </label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => {
                      setApiKey(e.target.value)
                      setSaved(false)
                    }}
                    placeholder="Enter your API key..."
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-green-500 transition-colors"
                  />
                </div>
                
                <div className="flex items-start gap-2 p-3 bg-slate-800/30 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-slate-400">
                    Your API key is stored locally in your browser and never sent to our servers.
                    Get a free key at{' '}
                    <a
                      href="https://the-odds-api.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green-400 hover:underline inline-flex items-center gap-1"
                    >
                      the-odds-api.com
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </p>
                </div>
                
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleClear}
                    className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm font-medium transition-colors"
                  >
                    Clear
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saved}
                    className="flex-1 px-4 py-2.5 bg-green-600 hover:bg-green-500 disabled:bg-green-600/50 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    {saved ? (
                      <>
                        <Check className="w-4 h-4" />
                        Saved!
                      </>
                    ) : (
                      'Save'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
