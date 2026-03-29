import { test, expect, type Page } from '@playwright/test'
import { annotateTzCase, annotateTzPassed } from '../helpers/tz-metadata'

async function login(page: Page) {
  await page.goto('/login')
  await page.getByTestId('upzit-login-username').fill('admin')
  await page.getByTestId('upzit-login-password').fill('password')
  await page.getByTestId('upzit-login-submit').click()
  await expect(page.getByTestId('upzit-app-shell')).toBeVisible({ timeout: 20_000 })
}

test.describe('ТЗ §2.2.4 Отчёты (превью в UI и файлы)', () => {
  test('TC-RPT-PREVIEW-001 — превью сводного отчёта по IT-проектам', async ({ page }, testInfo) => {
    annotateTzCase(testInfo, {
      tcId: 'TC-RPT-PREVIEW (сводка проектов)',
      reportSection: '2.2.4 Отчёты',
      testedFunction: 'Просмотр данных отчёта в модальном окне (JSON-превью)',
      inputs: 'Вход admin; раздел «Отчёты»; кнопка превью блока 1',
      expected: 'Открывается модальное окно с таблицей/данными превью',
    })
    await login(page)
    await page.getByTestId('upzit-nav-reports').click()
    await expect(page.getByTestId('upzit-reports-page')).toBeVisible()
    await page.getByTestId('upzit-report-preview-it-projects-summary').click()
    await expect(page.getByTestId('upzit-report-preview-modal')).toBeVisible({ timeout: 20_000 })
    await expect(page.getByTestId('upzit-report-preview-panel-it-projects-summary')).toBeVisible()
    await page.getByTestId('upzit-report-preview-modal-close').click()
    await expect(page.getByTestId('upzit-report-preview-modal')).toBeHidden()
    annotateTzPassed(testInfo)
  })

  test('TC-RPT-001 — скачивание сводного отчёта Excel', async ({ page }, testInfo) => {
    annotateTzCase(testInfo, {
      tcId: 'TC-RPT-001',
      reportSection: '2.2.4 Отчёты',
      testedFunction: 'Экспорт отчёта в файл MS Excel (.xlsx)',
      inputs: 'Вход admin; кнопка «Скачать Excel» в блоке сводного отчёта по проектам',
      expected: 'Браузер получает загрузку с расширением .xlsx; файл ненулевого размера',
    })
    await login(page)
    await page.getByTestId('upzit-nav-reports').click()
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 60_000 }),
      page.getByTestId('upzit-report-it-projects-summary-xlsx').click(),
    ])
    expect(download.suggestedFilename().toLowerCase()).toMatch(/\.xlsx$/)
    const p = await download.path()
    if (p) {
      const fs = await import('node:fs')
      expect(fs.statSync(p).size).toBeGreaterThan(64)
    }
    annotateTzPassed(testInfo)
  })

  test('TC-RPT-002 — скачивание сводного отчёта PDF', async ({ page }, testInfo) => {
    annotateTzCase(testInfo, {
      tcId: 'TC-RPT-002',
      reportSection: '2.2.4 Отчёты',
      testedFunction: 'Экспорт сводного отчёта в PDF',
      inputs: 'Кнопка «Скачать PDF» в том же блоке',
      expected: 'Файл .pdf успешно скачивается',
    })
    await login(page)
    await page.getByTestId('upzit-nav-reports').click()
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 60_000 }),
      page.getByTestId('upzit-report-it-projects-summary-pdf').click(),
    ])
    expect(download.suggestedFilename().toLowerCase()).toMatch(/\.pdf$/)
    annotateTzPassed(testInfo)
  })

  test('TC-RPT-003 — отчёт по исполнителю (Excel)', async ({ page }, testInfo) => {
    annotateTzCase(testInfo, {
      tcId: 'TC-RPT-003',
      reportSection: '2.2.4 Отчёты',
      testedFunction: 'Выгрузка отчёта по задачам исполнителя',
      inputs: 'Выбран первый исполнитель в списке, формат Excel, кнопка скачивания',
      expected: 'Файл .xlsx скачивается',
    })
    await login(page)
    await page.getByTestId('upzit-nav-reports').click()
    await page.getByTestId('upzit-report-select-assignee').selectOption({ index: 1 })
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 60_000 }),
      page.getByTestId('upzit-report-assignee-download').click(),
    ])
    expect(download.suggestedFilename().toLowerCase()).toMatch(/\.xlsx$/)
    annotateTzPassed(testInfo)
  })

  test('TC-RPT-004 — отчёт по исполнителю Word и PDF', async ({ page }, testInfo) => {
    annotateTzCase(testInfo, {
      tcId: 'TC-RPT-004',
      reportSection: '2.2.4 Отчёты',
      testedFunction: 'Генерация отчёта исполнителя в docx и pdf через UI',
      inputs: 'Первый исполнитель в списке; формат Word / PDF',
      expected: 'Скачиваются .docx и .pdf',
    })
    await login(page)
    await page.getByTestId('upzit-nav-reports').click()
    await page.getByTestId('upzit-report-select-assignee').selectOption({ index: 1 })

    await page.getByTestId('upzit-report-select-assignee-format').selectOption('docx')
    const [dlDocx] = await Promise.all([
      page.waitForEvent('download', { timeout: 60_000 }),
      page.getByTestId('upzit-report-assignee-download').click(),
    ])
    expect(dlDocx.suggestedFilename().toLowerCase()).toMatch(/\.docx$/)

    await page.getByTestId('upzit-report-select-assignee-format').selectOption('pdf')
    const [dlPdf] = await Promise.all([
      page.waitForEvent('download', { timeout: 60_000 }),
      page.getByTestId('upzit-report-assignee-download').click(),
    ])
    expect(dlPdf.suggestedFilename().toLowerCase()).toMatch(/\.pdf$/)
    annotateTzPassed(testInfo)
  })

  test('TC-RPT-020 — просроченные задачи: Excel и PDF', async ({ page }, testInfo) => {
    annotateTzCase(testInfo, {
      tcId: 'TC-RPT-020',
      reportSection: '2.2.4 Отчёты',
      testedFunction: 'Выгрузка отчёта просроченных задач',
      inputs: 'Кнопки скачивания в блоке 3',
      expected: 'Файлы .xlsx и .pdf',
    })
    await login(page)
    await page.getByTestId('upzit-nav-reports').click()
    const [xlsx] = await Promise.all([
      page.waitForEvent('download', { timeout: 60_000 }),
      page.getByTestId('upzit-report-overdue-tasks-xlsx').click(),
    ])
    expect(xlsx.suggestedFilename().toLowerCase()).toMatch(/\.xlsx$/)
    const xlsxPath = await xlsx.path()
    if (xlsxPath) {
      const fs = await import('node:fs')
      expect(fs.statSync(xlsxPath).size).toBeGreaterThan(64)
    }
    const [pdf] = await Promise.all([
      page.waitForEvent('download', { timeout: 60_000 }),
      page.getByTestId('upzit-report-overdue-tasks-pdf').click(),
    ])
    expect(pdf.suggestedFilename().toLowerCase()).toMatch(/\.pdf$/)
    annotateTzPassed(testInfo)
  })

  test('TC-RPT-021 — загрузка команды: Excel и Word', async ({ page }, testInfo) => {
    annotateTzCase(testInfo, {
      tcId: 'TC-RPT-021',
      reportSection: '2.2.4 Отчёты',
      testedFunction: 'Выгрузка сводки по загрузке команды',
      inputs: 'Блок 4; формат xlsx и docx',
      expected: 'Скачиваются .xlsx и .docx',
    })
    await login(page)
    await page.getByTestId('upzit-nav-reports').click()
    await page.getByTestId('upzit-report-select-team-format').selectOption('xlsx')
    const [xlsx] = await Promise.all([
      page.waitForEvent('download', { timeout: 60_000 }),
      page.getByTestId('upzit-report-team-workload-download').click(),
    ])
    expect(xlsx.suggestedFilename().toLowerCase()).toMatch(/\.xlsx$/)
    await page.getByTestId('upzit-report-select-team-format').selectOption('docx')
    const [docx] = await Promise.all([
      page.waitForEvent('download', { timeout: 60_000 }),
      page.getByTestId('upzit-report-team-workload-download').click(),
    ])
    expect(docx.suggestedFilename().toLowerCase()).toMatch(/\.docx$/)
    annotateTzPassed(testInfo)
  })

  test('TC-RPT-022 — статусы IT-проектов: Word и PDF', async ({ page }, testInfo) => {
    annotateTzCase(testInfo, {
      tcId: 'TC-RPT-022',
      reportSection: '2.2.4 Отчёты',
      testedFunction: 'Выгрузка отчёта по статусам проектов',
      inputs: 'Блок 5; кнопки Word и PDF',
      expected: 'Файлы .docx и .pdf',
    })
    await login(page)
    await page.getByTestId('upzit-nav-reports').click()
    const [docx] = await Promise.all([
      page.waitForEvent('download', { timeout: 60_000 }),
      page.getByTestId('upzit-report-it-projects-status-docx').click(),
    ])
    expect(docx.suggestedFilename().toLowerCase()).toMatch(/\.docx$/)
    const [pdf] = await Promise.all([
      page.waitForEvent('download', { timeout: 60_000 }),
      page.getByTestId('upzit-report-it-projects-status-pdf').click(),
    ])
    expect(pdf.suggestedFilename().toLowerCase()).toMatch(/\.pdf$/)
    annotateTzPassed(testInfo)
  })

  test('TC-RPT-PREVIEW-ALL — превью всех пяти отчётов открывается', async ({ page }, testInfo) => {
    annotateTzCase(testInfo, {
      tcId: 'TC-RPT-PREVIEW-ALL',
      reportSection: '2.2.4 Отчёты',
      testedFunction: 'Проверка загрузки JSON-превью в модальном окне для каждого отчёта',
      inputs: 'admin; по очереди «Показать в приложении» в блоках 1–5',
      expected: 'Модальное окно с панелью, соответствующей отчёту',
    })
    await login(page)
    await page.getByTestId('upzit-nav-reports').click()

    await page.getByTestId('upzit-report-preview-it-projects-summary').click()
    await expect(page.getByTestId('upzit-report-preview-panel-it-projects-summary')).toBeVisible({
      timeout: 20_000,
    })
    await page.getByTestId('upzit-report-preview-modal-close').click()

    await page.getByTestId('upzit-report-select-assignee').selectOption({ index: 1 })
    await page.getByTestId('upzit-report-assignee-preview').click()
    await expect(page.getByTestId('upzit-report-preview-panel-assignee')).toBeVisible({ timeout: 20_000 })
    await page.getByTestId('upzit-report-preview-modal-close').click()

    await page.getByTestId('upzit-report-preview-overdue-tasks').click()
    await expect(page.getByTestId('upzit-report-preview-panel-overdue')).toBeVisible({ timeout: 20_000 })
    await page.getByTestId('upzit-report-preview-modal-close').click()

    await page.getByTestId('upzit-report-team-workload-preview').click()
    await expect(page.getByTestId('upzit-report-preview-panel-team')).toBeVisible({ timeout: 20_000 })
    await page.getByTestId('upzit-report-preview-modal-close').click()

    await page.getByTestId('upzit-report-preview-it-projects-status').click()
    await expect(page.getByTestId('upzit-report-preview-panel-it-projects-status')).toBeVisible({
      timeout: 20_000,
    })
    await page.getByTestId('upzit-report-preview-modal-close').click()

    annotateTzPassed(testInfo)
  })
})
