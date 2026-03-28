import { test, expect } from '@playwright/test'
import { endpoints } from '../../src/api/endpoints'
import { authHeaders, obtainJwt } from '../helpers/api-auth'
import { annotateTzCase, annotateTzPassed } from '../helpers/tz-metadata'

test.describe('API: отчёты (файлы и превью) — соответствие ТЗ §2.2.4', () => {
  test('GET it-projects-summary xlsx returns non-empty file', async ({ request }, testInfo) => {
    annotateTzCase(testInfo, {
      tcId: 'TC-RPT-001 (API)',
      reportSection: '2.2.4 Отчёты',
      testedFunction: 'Формирование сводного отчёта по IT-проектам в Excel',
      inputs: 'JWT admin; GET /api/reports/it-projects-summary?format=xlsx',
      expected: 'Код 200, Content-Type spreadsheet, тело ответа — ненулевой бинарный файл',
    })
    const token = await obtainJwt(request, 'admin', 'password')
    const res = await request.get(endpoints.reports.itProjectsSummary('xlsx'), {
      headers: authHeaders(token),
    })
    expect(res.status()).toBe(200)
    expect(res.headers()['content-type']).toContain('spreadsheet')
    const buf = await res.body()
    expect(buf.length).toBeGreaterThan(100)
    annotateTzPassed(testInfo)
  })

  test('GET it-projects-summary pdf returns PDF', async ({ request }, testInfo) => {
    annotateTzCase(testInfo, {
      tcId: 'TC-RPT-002 (API)',
      reportSection: '2.2.4 Отчёты',
      testedFunction: 'Экспорт сводного отчёта в PDF',
      inputs: 'JWT admin; format=pdf',
      expected: 'Код 200, application/pdf',
    })
    const token = await obtainJwt(request, 'admin', 'password')
    const res = await request.get(endpoints.reports.itProjectsSummary('pdf'), {
      headers: authHeaders(token),
    })
    expect(res.status()).toBe(200)
    expect(res.headers()['content-type']).toContain('pdf')
    annotateTzPassed(testInfo)
  })

  test('GET tasks-by-assignee without assigneeId returns 400', async ({ request }, testInfo) => {
    annotateTzCase(testInfo, {
      tcId: 'TC-RPT-ERR',
      reportSection: '2.2.5 Ошибочный ввод',
      testedFunction: 'Параметры отчёта по исполнителю',
      inputs: 'GET tasks-by-assignee без assigneeId',
      expected: '400 и сообщение об ошибке',
    })
    const token = await obtainJwt(request, 'admin', 'password')
    const res = await request.get('/api/reports/tasks-by-assignee?format=xlsx', {
      headers: authHeaders(token),
    })
    expect(res.status()).toBe(400)
    annotateTzPassed(testInfo)
  })

  test('GET preview it-projects-summary returns JSON', async ({ request }, testInfo) => {
    annotateTzCase(testInfo, {
      tcId: 'TC-RPT-PREVIEW (API)',
      reportSection: '2.2.4 Отчёты',
      testedFunction: 'JSON-превью для отображения в приложении',
      inputs: 'GET /api/reports/previews/it-projects-summary',
      expected: '200, тело с массивом rows',
    })
    const token = await obtainJwt(request, 'admin', 'password')
    const res = await request.get(endpoints.reports.previews.itProjectsSummary, {
      headers: authHeaders(token),
    })
    expect(res.status()).toBe(200)
    const json = await res.json()
    expect(Array.isArray(json.rows)).toBe(true)
    expect(json.rows.length).toBeGreaterThan(0)
    annotateTzPassed(testInfo)
  })

  test('GET team-assignee-workload docx', async ({ request }, testInfo) => {
    annotateTzCase(testInfo, {
      tcId: 'TC-RPT-010 (API)',
      reportSection: '2.2.4 Отчёты',
      testedFunction: 'Отчёт загрузки команды в Word',
      inputs: 'format=docx',
      expected: '200, wordprocessingml document',
    })
    const token = await obtainJwt(request, 'admin', 'password')
    const res = await request.get(endpoints.reports.teamAssigneeWorkload('docx'), {
      headers: authHeaders(token),
    })
    expect(res.status()).toBe(200)
    expect(res.headers()['content-type']).toContain('wordprocessingml')
    annotateTzPassed(testInfo)
  })

  test('GET it-projects-status-overview docx', async ({ request }, testInfo) => {
    annotateTzCase(testInfo, {
      tcId: 'TC-RPT-011 (API)',
      reportSection: '2.2.4 Отчёты',
      testedFunction: 'Статусы IT-проектов в Word',
      inputs: 'format=docx',
      expected: '200, docx',
    })
    const token = await obtainJwt(request, 'admin', 'password')
    const res = await request.get(endpoints.reports.itProjectsStatusOverview('docx'), {
      headers: authHeaders(token),
    })
    expect(res.status()).toBe(200)
    expect(res.headers()['content-type']).toContain('wordprocessingml')
    annotateTzPassed(testInfo)
  })
})
