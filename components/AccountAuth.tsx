'use client'

import { FormEvent, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { LogIn, LogOut, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { User } from '@supabase/supabase-js'
import { validateAuthFields, type AuthMode } from '@/lib/auth-form'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { browserSupabaseEnv, describeSupabaseAuthSetup, type SupabaseAuthSetup } from '@/lib/supabase-public'

const MISSING_MESSAGE = 'Signed out. Email login is not configured for this build. The odds boards stay available.'
const SECRET_MESSAGE = 'Signed out. The public login setting contains a secret key, so login stays off. Use the anon key.'
const INVALID_MESSAGE = 'Signed out. The Supabase URL or anon key in this build could not be used.'

function setupMessage(setup: SupabaseAuthSetup, clientFailed: boolean): string | null {
  if (setup === 'secret') return SECRET_MESSAGE
  if (setup === 'invalid' || clientFailed) return INVALID_MESSAGE
  if (setup === 'missing') return MISSING_MESSAGE
  return null
}

function accountLabel(user: User): string {
  const email = user.email?.trim()
  return email || user.id
}

function requestError(error: { message?: string } | null): string {
  const message = error?.message?.trim()
  if (!message) return 'Something went wrong. Try again.'
  if (/failed to fetch|network|load failed/i.test(message)) {
    return 'Could not reach the login service. The odds boards are still available.'
  }
  return message
}

export default function AccountAuth() {
  const [setup] = useState<SupabaseAuthSetup>(() => describeSupabaseAuthSetup(browserSupabaseEnv()))
  const [clientFailed, setClientFailed] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<AuthMode>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const dialogRef = useRef<HTMLDivElement>(null)
  const blockedMessage = setupMessage(setup, clientFailed)
  const label = user ? accountLabel(user) : ''

  useEffect(() => {
    if (setup !== 'ready') return
    const supabase = getSupabaseBrowserClient()
    if (!supabase) {
      setClientFailed(true)
      return
    }
    let active = true
    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return
      if (sessionError) {
        setNotice('Signed out. A saved login could not be read.')
        setUser(null)
        return
      }
      setUser(data.session?.user ?? null)
    }).catch(() => {
      if (active) setNotice('Signed out. A saved login could not be read.')
    })
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [setup])

  useEffect(() => {
    if (!open) return
    const opener = document.activeElement as HTMLElement | null
    const oldOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const focusable = () => Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled])'
    ) || [])
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setOpen(false)
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
  }, [open])

  const close = () => {
    setOpen(false)
    setError('')
    setBusy(false)
  }

  const handleSignOut = async () => {
    const supabase = getSupabaseBrowserClient()
    if (!supabase) return
    setBusy(true)
    setNotice('')
    const { error: signOutError } = await supabase.auth.signOut()
    setBusy(false)
    if (signOutError) {
      setNotice(requestError(signOutError))
      return
    }
    setUser(null)
    setPassword('')
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setNotice('')
    const validation = validateAuthFields(email, password, mode)
    if (validation) {
      setError(validation)
      return
    }
    if (blockedMessage) {
      setError(blockedMessage)
      return
    }
    const supabase = getSupabaseBrowserClient()
    if (!supabase) {
      setClientFailed(true)
      setError(INVALID_MESSAGE)
      return
    }
    setBusy(true)
    setError('')
    const trimmedEmail = email.trim()
    try {
      if (mode === 'sign-up') {
        const redirectTo = `${window.location.origin}${window.location.pathname}`
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: trimmedEmail,
          password,
          options: { emailRedirectTo: redirectTo },
        })
        if (signUpError) {
          setError(requestError(signUpError))
          return
        }
        if (data.session?.user) {
          setUser(data.session.user)
          setPassword('')
          close()
          return
        }
        setPassword('')
        setNotice('Check your email to confirm this account, then sign in.')
        return
      }
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      })
      if (signInError) {
        setError(requestError(signInError))
        return
      }
      if (data.user) setUser(data.user)
      setPassword('')
      close()
    } catch {
      setError('Could not reach the login service. The odds boards are still available.')
    } finally {
      setBusy(false)
    }
  }

  const inputClass = 'w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-green-500 transition-colors'
  const headerButton = 'shrink-0 whitespace-nowrap min-h-[44px] px-2.5 sm:px-3 py-2 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 text-sm text-slate-200 transition-colors disabled:opacity-50'
  const dialog = (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]" onClick={close} />
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 pointer-events-none">
            <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="account-title" tabIndex={-1}
              className="card p-5 sm:p-6 w-full max-w-md pointer-events-auto max-h-[calc(100dvh-2rem)] overflow-y-auto">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 id="account-title" className="text-lg font-semibold leading-tight">
                    {mode === 'sign-in' ? 'Sign in' : 'Create account'}
                  </h2>
                  <p className="text-xs text-slate-400">Signed out</p>
                </div>
                <button type="button" onClick={close} aria-label="Close sign in"
                  className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-slate-800 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {blockedMessage && (
                <p className="text-sm text-amber-200 mb-4" role="status">{blockedMessage}</p>
              )}

              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                <div>
                  <label htmlFor="account-email" className="block text-sm font-medium mb-2">Email</label>
                  <input id="account-email" type="email" value={email} autoComplete="email"
                    onChange={event => { setEmail(event.target.value); setError('') }}
                    className={inputClass} />
                </div>
                <div>
                  <label htmlFor="account-password" className="block text-sm font-medium mb-2">Password</label>
                  <input id="account-password" type="password" value={password}
                    autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'}
                    onChange={event => { setPassword(event.target.value); setError('') }}
                    className={inputClass} />
                  {mode === 'sign-up' && (
                    <p className="text-xs text-slate-400 mt-2">At least 6 characters.</p>
                  )}
                </div>
                {error && <p className="text-sm text-red-300" role="alert">{error}</p>}
                {notice && <p className="text-sm text-green-300" role="status">{notice}</p>}
                <button type="submit" disabled={busy}
                  className="w-full min-h-[44px] px-4 py-2.5 bg-green-700 hover:bg-green-600 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors">
                  {busy ? 'Working…' : mode === 'sign-in' ? 'Sign in' : 'Create account'}
                </button>
              </form>

              <button type="button" className="mt-4 text-sm text-slate-300 hover:text-slate-100"
                onClick={() => { setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in'); setError(''); setNotice('') }}>
                {mode === 'sign-in' ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )

  return (
    <div className="flex items-center gap-1.5 min-w-0">
      {user ? (
        <>
          <span className="text-xs text-slate-200 truncate max-w-[6.5rem] sm:max-w-[14rem]" title={label}>
            {label}
          </span>
          <button type="button" onClick={handleSignOut} disabled={busy} className={headerButton} aria-label="Sign out">
            <LogOut className="w-4 h-4 sm:hidden" aria-hidden="true" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </>
      ) : (
        <>
          <span className="hidden md:inline text-xs text-slate-400 whitespace-nowrap">Signed out</span>
          <button type="button" onClick={() => { setOpen(true); setError(''); setNotice('') }} className={`${headerButton} inline-flex items-center gap-1.5`}>
            <LogIn className="w-4 h-4" aria-hidden="true" />
            Sign in
          </button>
        </>
      )}
      {notice && !open && <span className="sr-only" role="status">{notice}</span>}
      {typeof document !== 'undefined' && createPortal(dialog, document.body)}
    </div>
  )
}
