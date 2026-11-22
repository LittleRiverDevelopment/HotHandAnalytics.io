import assert from 'node:assert/strict'
import test from 'node:test'
import { isAccountAdmin } from './account-admin'

test('admin role comes only from app_metadata', () => {
  assert.equal(isAccountAdmin(null), false)
  assert.equal(isAccountAdmin(undefined), false)
  assert.equal(isAccountAdmin({}), false)
  assert.equal(isAccountAdmin({ app_metadata: { role: 'admin' } }), true)
  assert.equal(isAccountAdmin({ app_metadata: { role: 'user' } }), false)
  assert.equal(isAccountAdmin({ user_metadata: { role: 'admin' } }), false)
  assert.equal(isAccountAdmin({
    app_metadata: {},
    user_metadata: { role: 'admin' },
  }), false)
})
