import { test, expect, type APIResponse } from '@playwright/test'
import { endpoints } from '../../src/api/endpoints'
import { authHeaders, obtainJwt } from '../helpers/api-auth'
import { annotateTzCase, annotateTzPassed } from '../helpers/tz-metadata'

/** Сидер БД (`docs/database/seed.sql`): исполнитель с задачами — Козлов, id = 3 */
const SEEDED_ASSIGNEE_ID = 3

async function expectBinaryReport(
  res: APIResponse,
  contentTypePart: string,
  minBytes = 100
): Promise<Buffer> {
  expect(res.status()).toBe(200)
  expect(res.headers()['content-type'] ?? '').toContain(contentTypePart)
  const buf = await res.body()
  expect(buf.length).toBeGreaterThan(minBytes)
  return buf
}

test.describe('API: отчёты (файлы и превью) — соответствие ТЗ §2.2.4', () => {
  test('GET report without JWT returns 401', async ({ request }) => {
    const res = await request.get(endpoints.reports.itProjectsSummary('pdf'))
    expect(res.status()).toBe(401)
  })

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
    await expectBinaryReport(res, 'spreadsheet')
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
    await expectBinaryReport(res, 'pdf', 200)
    annotateTzPassed(testInfo)
  })

  test('GET tasks-by-assignee xlsx/docx/pdf returns non-empty files', async ({ request }, testInfo) => {
    annotateTzCase(testInfo, {
      tcId: 'TC-RPT-ASSIGNEE-ALL (API)',
      reportSection: '2.2.4 Отчёты',
      testedFunction: 'Генерация отчёта по исполнителю во всех поддерживаемых форматах',
      inputs: `JWT admin; assigneeId=${SEEDED_ASSIGNEE_ID}; format=xlsx|docx|pdf`,
      expected: '200, корректный Content-Type, ненулевое тело',
    })
    const token = await obtainJwt(request, 'admin', 'password')
    const h = authHeaders(token)
    await expectBinaryReport(
      await request.get(endpoints.reports.tasksByAssignee(SEEDED_ASSIGNEE_ID, 'xlsx'), { headers: h }),
      'spreadsheet'
    )
    await expectBinaryReport(
      await request.get(endpoints.reports.tasksByAssignee(SEEDED_ASSIGNEE_ID, 'docx'), { headers: h }),
      'wordprocessingml'
    )
    await expectBinaryReport(
      await request.get(endpoints.reports.tasksByAssignee(SEEDED_ASSIGNEE_ID, 'pdf'), { headers: h }),
      'pdf',
      200
    )
    annotateTzPassed(testInfo)
  })

  test('GET overdue-tasks xlsx and pdf return files', async ({ request }, testInfo) => {
    annotateTzCase(testInfo, {
      tcId: 'TC-RPT-OVERDUE (API)',
      reportSection: '2.2.4 Отчёты',
      testedFunction: 'Отчёт просроченных задач (Excel и PDF)',
      inputs: 'JWT admin; /api/reports/overdue-tasks?format=xlsx|pdf',
      expected: '200, бинарный ответ ненулевого размера',
    })
    const token = await obtainJwt(request, 'admin', 'password')
    const h = authHeaders(token)
    await expectBinaryReport(await request.get(endpoints.reports.overdueTasks('xlsx'), { headers: h }), 'spreadsheet')
    await expectBinaryReport(await request.get(endpoints.reports.overdueTasks('pdf'), { headers: h }), 'pdf', 200)
    annotateTzPassed(testInfo)
  })

  test('GET team-assignee-workload xlsx returns spreadsheet', async ({ request }, testInfo) => {
    annotateTzCase(testInfo, {
      tcId: 'TC-RPT-TEAM-XLSX (API)',
      reportSection: '2.2.4 Отчёты',
      testedFunction: 'Загрузка команды в Excel',
      inputs: 'format=xlsx',
      expected: '200, spreadsheetml',
    })
    const token = await obtainJwt(request, 'admin', 'password')
    const res = await request.get(endpoints.reports.teamAssigneeWorkload('xlsx'), {
      headers: authHeaders(token),
    })
    await expectBinaryReport(res, 'spreadsheet')
    annotateTzPassed(testInfo)
  })

  test('GET it-projects-status-overview pdf returns PDF', async ({ request }, testInfo) => {
    annotateTzCase(testInfo, {
      tcId: 'TC-RPT-STATUS-PDF (API)',
      reportSection: '2.2.4 Отчёты',
      testedFunction: 'Статусы IT-проектов в PDF',
      inputs: 'format=pdf',
      expected: '200, application/pdf',
    })
    const token = await obtainJwt(request, 'admin', 'password')
    const res = await request.get(endpoints.reports.itProjectsStatusOverview('pdf'), {
      headers: authHeaders(token),
    })
    await expectBinaryReport(res, 'pdf', 200)
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

  test('GET previews: assignee, overdue, team, status return JSON', async ({ request }, testInfo) => {
    annotateTzCase(testInfo, {
      tcId: 'TC-RPT-PREVIEWS-ALL (API)',
      reportSection: '2.2.4 Отчёты',
      testedFunction: 'JSON-превью всех отчётов',
      inputs: 'JWT admin; endpoints.previews.*',
      expected: '200, ожидаемая структура тел (массивы rows/tasks и т.д.)',
    })
    const token = await obtainJwt(request, 'admin', 'password')
    const h = authHeaders(token)

    const assignee = await request.get(endpoints.reports.previews.tasksByAssignee(SEEDED_ASSIGNEE_ID), { headers: h })
    expect(assignee.status()).toBe(200)
    const assigneeJson = await assignee.json()
    expect(typeof assigneeJson.assigneeName).toBe('string')
    expect(Array.isArray(assigneeJson.tasks)).toBe(true)

    const overdue = await request.get(endpoints.reports.previews.overdueTasks, { headers: h })
    expect(overdue.status()).toBe(200)
    const overdueJson = await overdue.json()
    expect(Array.isArray(overdueJson.tasks)).toBe(true)
    expect(Array.isArray(overdueJson.byProject)).toBe(true)

    const team = await request.get(endpoints.reports.previews.teamAssigneeWorkload(), { headers: h })
    expect(team.status()).toBe(200)
    const teamJson = await team.json()
    expect(Array.isArray(teamJson.rows)).toBe(true)
    expect(teamJson.rows.length).toBeGreaterThan(0)

    const status = await request.get(endpoints.reports.previews.itProjectsStatusOverview, { headers: h })
    expect(status.status()).toBe(200)
    const statusJson = await status.json()
    expect(Array.isArray(statusJson.rows)).toBe(true)
    expect(statusJson.rows.length).toBeGreaterThan(0)
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
    await expectBinaryReport(res, 'wordprocessingml')
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
    await expectBinaryReport(res, 'wordprocessingml')
    annotateTzPassed(testInfo)
  })

  test('GET team-assignee-workload with sprintId query still returns 200', async ({ request }) => {
    const token = await obtainJwt(request, 'admin', 'password')
    const res = await request.get(endpoints.reports.teamAssigneeWorkload('xlsx', '1'), {
      headers: authHeaders(token),
    })
    await expectBinaryReport(res, 'spreadsheet')
  })
})
