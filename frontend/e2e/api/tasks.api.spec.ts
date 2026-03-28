import { test, expect } from '@playwright/test'
import { endpoints } from '../../src/api/endpoints'
import { authHeaders, obtainJwt } from '../helpers/api-auth'
import { annotateTzCase, annotateTzPassed } from '../helpers/tz-metadata'

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

  test('POST create with empty title returns 400 (валидация ТЗ)', async ({ request }, testInfo) => {
    annotateTzCase(testInfo, {
      tcId: 'TC-VAL-TASK (API)',
      reportSection: '2.2.5 Ошибочный ввод',
      testedFunction: 'Создание задачи без названия',
      inputs: 'JWT pm_sidorov; title: ""',
      expected: '400 Bad Request (ошибка валидации модели)',
    })
    const token = await obtainJwt(request, 'pm_sidorov', 'password')
    const res = await request.post(endpoints.tasks.create, {
      headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
      data: {
        title: '',
        projectId: 1,
        typeId: 1,
        priorityId: 1,
        statusId: 1,
      },
    })
    expect(res.status()).toBe(400)
    annotateTzPassed(testInfo)
  })
})
