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
})
