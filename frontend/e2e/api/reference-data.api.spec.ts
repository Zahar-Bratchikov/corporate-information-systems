import { test, expect } from '@playwright/test'
import { endpoints } from '../../src/api/endpoints'
import { authHeaders, obtainJwt } from '../helpers/api-auth'

test.describe('API: reference data', () => {
  test('GET roles is anonymous', async ({ request }) => {
    const res = await request.get(endpoints.referenceData.roles)
    expect(res.status()).toBe(200)
    const roles = await res.json()
    expect(roles.some((r: { name: string }) => r.name === 'Администратор')).toBe(true)
  })

  test('GET task-types without token returns 401', async ({ request }) => {
    const res = await request.get(endpoints.referenceData.taskTypes)
    expect(res.status()).toBe(401)
  })

  test('GET task-types with token returns list', async ({ request }) => {
    const token = await obtainJwt(request, 'viewer', 'password')
    const res = await request.get(endpoints.referenceData.taskTypes, {
      headers: authHeaders(token),
    })
    expect(res.status()).toBe(200)
    const list = await res.json()
    expect(list.length).toBeGreaterThan(0)
  })
})
