'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { isAccountAdmin } from '@/lib/account-admin'
import { ADMIN_UNLOCK_STORAGE_KEY } from '@/lib/admin-settings'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { browserSupabaseEnv, describeSupabaseAuthSetup } from '@/lib/supabase-public'

type AuthSessionValue = {
  user: User | null
  ready: boolean
  isAdmin: boolean
}

const AuthSessionContext = createContext<AuthSessionValue>({
  user: null,
  ready: false,
  isAdmin: false,
})

export function AuthSessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (describeSupabaseAuthSetup(browserSupabaseEnv()) !== 'ready') {
      setUser(null)
      setReady(true)
      return
    }
    const supabase = getSupabaseBrowserClient()
    if (!supabase) {
      setUser(null)
      setReady(true)
      return
    }
    let active = true
    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return
      setUser(error ? null : data.session?.user ?? null)
      setReady(true)
    }).catch(() => {
      if (!active) return
      setUser(null)
      setReady(true)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setReady(true)
    })
    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [])

  const isAdmin = isAccountAdmin(user)

  useEffect(() => {
    if (!ready || isAdmin) return
    try {
      sessionStorage.removeItem(ADMIN_UNLOCK_STORAGE_KEY)
    } catch {
      // A signed-out browser simply does not send the backup odds key.
    }
  }, [ready, isAdmin])

  const value = useMemo(() => ({ user, ready, isAdmin }), [user, ready, isAdmin])
  return <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>
}

export function useAuthSession(): AuthSessionValue {
  return useContext(AuthSessionContext)
}
