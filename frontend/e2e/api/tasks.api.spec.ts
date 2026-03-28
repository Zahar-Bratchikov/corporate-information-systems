import { test, expect } from '@playwright/test'
import { endpoints } from '../../src/api/endpoints'
import { authHeaders, obtainJwt } from '../helpers/api-auth'

test.describe('API: tasks', () => {
  test('GET tasks without auth returns 401', async ({ request }) => {
    const res = await request.get(endpoints.tasks.list())
    expect(res.status()).toBe(401)
  })

  test('GET tasks with token returns array', async ({ request }) => {
    const token = await obtainJwt(request, 'admin', 'password')
    const res = await request.get(endpoints.tasks.list(), {
      headers: authHeaders(token),
    })
    expect(res.status()).toBe(200)
    const tasks = await res.json()
    expect(Array.isArray(tasks)).toBe(true)
    expect(tasks.length).toBeGreaterThan(0)
  })
})
