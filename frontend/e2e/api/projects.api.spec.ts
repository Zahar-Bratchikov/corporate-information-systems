import { test, expect } from '@playwright/test'
import { endpoints } from '../../src/api/endpoints'
import { authHeaders, obtainJwt } from '../helpers/api-auth'

test.describe('API: projects', () => {
  test('GET list is public and returns projects', async ({ request }) => {
    const res = await request.get(endpoints.projects.list)
    expect(res.status()).toBe(200)
    const data = await res.json()
    expect(Array.isArray(data)).toBe(true)
    expect(data.length).toBeGreaterThan(0)
    expect(data[0]).toMatchObject({
      id: expect.any(Number),
      name: expect.any(String),
      code: expect.any(String),
    })
  })

  test('GET by id returns 404 for missing project', async ({ request }) => {
    const res = await request.get(endpoints.projects.byId(999_999))
    expect(res.status()).toBe(404)
  })

  test('POST create requires manager or admin', async ({ request }) => {
    const devToken = await obtainJwt(request, 'dev_kozlov', 'password')
    const res = await request.post(endpoints.projects.list, {
      headers: { ...authHeaders(devToken), 'Content-Type': 'application/json' },
      data: {
        name: 'E2E should not persist',
        code: `E2E-${Date.now()}`,
        releaseDate: '2026-12-31',
        responsibleId: 2,
      },
    })
    expect(res.status()).toBe(403)
  })

  test('POST create succeeds for project manager', async ({ request }) => {
    const token = await obtainJwt(request, 'pm_sidorov', 'password')
    const code = `PW-${Date.now()}`
    const res = await request.post(endpoints.projects.list, {
      headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
      data: {
        name: 'Playwright API project',
        code,
        releaseDate: '2026-06-01',
        responsibleId: 2,
      },
    })
    expect(res.status()).toBe(201)
    const created = await res.json()
    expect(created).toMatchObject({ code, name: 'Playwright API project' })
  })
})
