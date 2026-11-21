/** Public Supabase settings compiled into the browser. Never a service-role key. */
export interface SupabasePublicConfig {
  url: string
  anonKey: string
}

export type SupabaseAuthSetup = 'missing' | 'secret' | 'invalid' | 'ready'

type Env = Record<string, string | undefined>

function nonEmpty(value: string | undefined): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function jwtRole(token: string): string | null {
  const parts = token.split('.')
  if (parts.length !== 3 || !parts[1]) return null
  try {
    const normalized = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const pad = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4))
    const payload = JSON.parse(atob(normalized + pad)) as { role?: unknown }
    return typeof payload.role === 'string' ? payload.role : null
  } catch {
    return null
  }
}

/** True for a service-role JWT or a secret API key. Those must not be used in the browser. */
export function isSecretSupabaseKey(key: string): boolean {
  const trimmed = key.trim()
  if (trimmed.startsWith('sb_secret_')) return true
  return jwtRole(trimmed) === 'service_role'
}

/**
 * Read the public project URL and anon (or publishable) key.
 * Blank values count as unset. A secret key is not returned for use as the client key.
 */
export function readSupabasePublicConfig(env: Env = process.env): SupabasePublicConfig | null {
  const url = nonEmpty(env.NEXT_PUBLIC_SUPABASE_URL)
  const anonKey = nonEmpty(env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  if (!url || !anonKey) return null
  if (isSecretSupabaseKey(anonKey)) return null
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null
  } catch {
    return null
  }
  return { url, anonKey }
}

export function describeSupabaseAuthSetup(env: Env = process.env): SupabaseAuthSetup {
  const url = nonEmpty(env.NEXT_PUBLIC_SUPABASE_URL)
  const anonKey = nonEmpty(env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  if (!url || !anonKey) return 'missing'
  if (isSecretSupabaseKey(anonKey)) return 'secret'
  if (!readSupabasePublicConfig(env)) return 'invalid'
  return 'ready'
}

/**
 * Direct `process.env.NEXT_PUBLIC_*` reads so Next can inline them into the browser bundle.
 * Dynamic access of `process.env` is empty on the client.
 */
export function browserSupabaseEnv(): Env {
  return {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  }
}
