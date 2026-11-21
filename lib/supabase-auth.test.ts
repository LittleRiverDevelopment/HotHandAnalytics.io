import assert from 'node:assert/strict'
import test from 'node:test'
import { EMPTY_AUTH_MESSAGE, validateAuthFields } from './auth-form'
import { createSupabaseBrowserClient } from './supabase-browser'
import {
  describeSupabaseAuthSetup,
  isSecretSupabaseKey,
  readSupabasePublicConfig,
} from './supabase-public'

function jwt(role: string): string {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url')
  return `${encode({ alg: 'none', typ: 'JWT' })}.${encode({ role })}.signature`
}

test('public supabase config is missing until both values are set', () => {
  assert.equal(readSupabasePublicConfig({}), null)
  assert.equal(describeSupabaseAuthSetup({}), 'missing')
  assert.equal(readSupabasePublicConfig({
    NEXT_PUBLIC_SUPABASE_URL: '   ',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon',
  }), null)
  assert.equal(readSupabasePublicConfig({
    NEXT_PUBLIC_SUPABASE_URL: 'https://example.com',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: ' ',
  }), null)
  assert.equal(readSupabasePublicConfig({
    NEXT_PUBLIC_SUPABASE_URL: 'not-a-url',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon',
  }), null)
  assert.equal(describeSupabaseAuthSetup({
    NEXT_PUBLIC_SUPABASE_URL: 'not-a-url',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon',
  }), 'invalid')

  const config = readSupabasePublicConfig({
    NEXT_PUBLIC_SUPABASE_URL: ' https://example.com/ ',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: ' public-anon-key ',
    SUPABASE_SERVICE_ROLE_KEY: 'ignored-secret',
  })
  assert.deepEqual(config, { url: 'https://example.com/', anonKey: 'public-anon-key' })
  assert.equal(describeSupabaseAuthSetup({
    NEXT_PUBLIC_SUPABASE_URL: 'https://example.com',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'public-anon-key',
  }), 'ready')
})

test('a service-role key is refused for the public client', () => {
  const serviceJwt = jwt('service_role')
  assert.equal(isSecretSupabaseKey(serviceJwt), true)
  assert.equal(isSecretSupabaseKey('sb_secret_example'), true)
  assert.equal(isSecretSupabaseKey(jwt('anon')), false)
  assert.equal(isSecretSupabaseKey('sb_publishable_example'), false)
  assert.equal(readSupabasePublicConfig({
    NEXT_PUBLIC_SUPABASE_URL: 'https://example.com',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: serviceJwt,
  }), null)
  assert.equal(describeSupabaseAuthSetup({
    NEXT_PUBLIC_SUPABASE_URL: 'https://example.com',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'sb_secret_example',
  }), 'secret')
  assert.equal(createSupabaseBrowserClient(null), null)
})

test('a public url and anon key can build a client', () => {
  const client = createSupabaseBrowserClient({
    url: 'https://example.com',
    anonKey: 'public-anon-key',
  })
  assert.ok(client)
  client?.auth.stopAutoRefresh()
})

test('auth form rejects empty email or password before any request', () => {
  assert.equal(validateAuthFields('', '', 'sign-in'), EMPTY_AUTH_MESSAGE)
  assert.equal(validateAuthFields('   ', '   ', 'sign-up'), EMPTY_AUTH_MESSAGE)
  assert.equal(validateAuthFields('person@example.com', '', 'sign-in'), EMPTY_AUTH_MESSAGE)
  assert.equal(validateAuthFields('', 'secret-password', 'sign-up'), EMPTY_AUTH_MESSAGE)
  assert.equal(validateAuthFields('not-an-email', 'secret-password', 'sign-in'), 'Enter a valid email address.')
  assert.equal(validateAuthFields('person@example.com', 'short', 'sign-up'), 'Use a password of at least 6 characters.')
  assert.equal(validateAuthFields(' person@example.com ', 'secret-password', 'sign-in'), null)
  assert.equal(validateAuthFields('person@example.com', 'secret-password', 'sign-up'), null)
})
