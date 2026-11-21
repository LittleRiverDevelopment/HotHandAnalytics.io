/** Supabase Auth user fields the browser can see. Role must come from app_metadata. */
export type AccountClaims = {
  app_metadata?: Record<string, unknown>
  user_metadata?: Record<string, unknown>
}

/**
 * Admin is granted in the Supabase dashboard on app_metadata, which the user cannot edit.
 * user_metadata is ignored because a signed-in person can change it themselves.
 */
export function isAccountAdmin(user: AccountClaims | null | undefined): boolean {
  return user?.app_metadata?.role === 'admin'
}
