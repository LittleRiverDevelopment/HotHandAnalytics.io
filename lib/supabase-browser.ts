import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { browserSupabaseEnv, readSupabasePublicConfig, type SupabasePublicConfig } from './supabase-public'

let cached: SupabaseClient | null | undefined

/** Build a browser client from the public URL and anon key. Returns null when login is off. */
export function createSupabaseBrowserClient(config: SupabasePublicConfig | null): SupabaseClient | null {
  if (!config) return null
  try {
    return createClient(config.url, config.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  } catch {
    return null
  }
}

export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (cached !== undefined) return cached
  cached = createSupabaseBrowserClient(readSupabasePublicConfig(browserSupabaseEnv()))
  return cached
}
