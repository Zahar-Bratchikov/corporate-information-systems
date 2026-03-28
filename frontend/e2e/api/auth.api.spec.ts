import { test, expect } from '@playwright/test'
import { endpoints } from '../../src/api/endpoints'

test.describe('API: authentication', () => {
  test('POST login returns 400 when body is empty object', async ({ request }) => {
    const res = await request.post(endpoints.authentication.signIn, {
      data: {},
    })
    expect(res.status()).toBe(400)
  })

  test('POST login returns 401 for unknown credentials', async ({ request }) => {
    const res = await request.post(endpoints.authentication.signIn, {
      data: { login: '__no_such_user__', password: 'wrong' },
    })
    expect(res.status()).toBe(401)
    const body = await res.json()
    expect(body).toHaveProperty('error')
  })

  test('POST login returns JWT for seeded admin', async ({ request }) => {
    const res = await request.post(endpoints.authentication.signIn, {
      data: { login: 'admin', password: 'password' },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body).toMatchObject({
      login: 'admin',
      roleName: 'Администратор',
    })
    expect(typeof body.token).toBe('string')
    expect(body.token.length).toBeGreaterThan(20)
  })

  test('legacy route api/auth/login works', async ({ request }) => {
    const res = await request.post('/api/auth/login', {
      data: { login: 'admin', password: 'password' },
    })
    expect(res.status()).toBe(200)
  })
})
