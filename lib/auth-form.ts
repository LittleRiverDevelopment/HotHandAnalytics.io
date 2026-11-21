export type AuthMode = 'sign-in' | 'sign-up'

export const EMPTY_AUTH_MESSAGE = 'Enter an email and a password.'

/** Client-side checks that run before any login request. */
export function validateAuthFields(email: string, password: string, mode: AuthMode): string | null {
  const trimmedEmail = email.trim()
  if (!trimmedEmail || password.trim().length === 0) return EMPTY_AUTH_MESSAGE
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) return 'Enter a valid email address.'
  if (mode === 'sign-up' && password.length < 6) return 'Use a password of at least 6 characters.'
  return null
}
