import { test, expect, type Page } from '@playwright/test'
import { annotateTzCase, annotateTzPassed } from '../helpers/tz-metadata'

async function login(page: Page, loginName: string, password: string) {
  await page.goto('/login')
  await page.getByTestId('upzit-login-username').fill(loginName)
  await page.getByTestId('upzit-login-password').fill(password)
  await page.getByTestId('upzit-login-submit').click()
  await expect(page.getByTestId('upzit-app-shell')).toBeVisible({ timeout: 20_000 })
}

test.describe.serial('ТЗ §2.2.3 Редактирование данных (CRUD в UI)', () => {
  test('TC-PRJ-002 — создание проекта (руководитель)', async ({ page }, testInfo) => {
    const code = `TZ-${Date.now()}`
    annotateTzCase(testInfo, {
      tcId: 'TC-PRJ-002',
      reportSection: '2.2.3 Редактирование БД',
      testedFunction: 'Создание IT-проекта через форму',
      inputs: `Вход pm_sidorov; новый проект: наименование «Проект ТЗ», код ${code}, дата релиза, ответственный из списка`,
      expected: 'Проект появляется в таблице с указанным кодом',
    })
    await login(page, 'pm_sidorov', 'password')
    await page.getByTestId('upzit-project-add-button').click()
    await expect(page.getByTestId('upzit-project-modal')).toBeVisible()
    await page.getByTestId('upzit-project-input-name').fill('Проект ТЗ (автотест)')
    await page.getByTestId('upzit-project-input-code').fill(code)
    await page.getByTestId('upzit-project-input-release-date').fill('2026-12-31')
    await page.getByTestId('upzit-project-select-responsible').selectOption({ index: 1 })
    await page.getByTestId('upzit-project-save').click()
    await expect(page.getByTestId('upzit-project-modal')).toBeHidden({ timeout: 15_000 })
    await expect(page.getByTestId('upzit-projects-table')).toContainText(code)
    annotateTzPassed(testInfo)
  })

  test('TC-PRJ-003 — изменение наименования проекта', async ({ page }, testInfo) => {
    annotateTzCase(testInfo, {
      tcId: 'TC-PRJ-003',
      reportSection: '2.2.3 Редактирование БД',
      testedFunction: 'Редактирование проекта',
      inputs: 'Вход pm_sidorov; редактирование первого проекта в списке (id=1 из сидера)',
      expected: 'После сохранения в таблице отображается обновлённое наименование; после повторного открытия формы значение сохранено',
    })
    await login(page, 'pm_sidorov', 'password')
    await page.getByTestId('upzit-project-edit-1').click()
    await expect(page.getByTestId('upzit-project-modal')).toBeVisible()
    const input = page.getByTestId('upzit-project-input-name')
    const before = await input.inputValue()
    const marker = ` [e2e-${Date.now()}]`
    await input.fill(before + marker)
    await page.getByTestId('upzit-project-save').click()
    await expect(page.getByTestId('upzit-project-modal')).toBeHidden({ timeout: 15_000 })
    await expect(page.getByTestId('upzit-project-cell-name-1')).toContainText(marker.trim())
    await page.getByTestId('upzit-project-edit-1').click()
    await expect(page.getByTestId('upzit-project-input-name')).toHaveValue(before + marker)
    await input.fill(before)
    await page.getByTestId('upzit-project-save').click()
    await expect(page.getByTestId('upzit-project-modal')).toBeHidden({ timeout: 15_000 })
    annotateTzPassed(testInfo)
  })

  test('TC-PRJ-005 — дубликат кода проекта', async ({ page }, testInfo) => {
    annotateTzCase(testInfo, {
      tcId: 'TC-PRJ-005',
      reportSection: '2.2.5 Ошибочный ввод',
      testedFunction: 'Валидация уникальности кода проекта',
      inputs: 'Вход pm_sidorov; создание проекта с кодом PORTAL (уже есть в сидере)',
      expected: 'Сохранение не выполняется; отображается сообщение об ошибке в форме',
    })
    await login(page, 'pm_sidorov', 'password')
    await page.getByTestId('upzit-project-add-button').click()
    await page.getByTestId('upzit-project-input-name').fill('Дубликат кода')
    await page.getByTestId('upzit-project-input-code').fill('PORTAL')
    await page.getByTestId('upzit-project-select-responsible').selectOption({ index: 1 })
    await page.getByTestId('upzit-project-save').click()
    await expect(page.getByTestId('upzit-project-form-error')).toBeVisible({ timeout: 15_000 })
    await page.getByTestId('upzit-project-cancel').click()
    annotateTzPassed(testInfo)
  })

  test('TC-TSK-002 — создание задачи', async ({ page }, testInfo) => {
    const title = `Задача ТЗ ${Date.now()}`
    annotateTzCase(testInfo, {
      tcId: 'TC-TSK-002',
      reportSection: '2.2.3 Редактирование БД',
      testedFunction: 'Создание задачи с привязкой к проекту',
      inputs: `Вход pm_sidorov; задача «${title}», тип/приоритет/статус по умолчанию в форме, первый доступный проект`,
      expected: 'Задача появляется в таблице задач',
    })
    await login(page, 'pm_sidorov', 'password')
    await page.getByTestId('upzit-nav-tasks').click()
    await expect(page.getByTestId('upzit-tasks-page')).toBeVisible()
    await page.getByTestId('upzit-task-add-button').click()
    await expect(page.getByTestId('upzit-task-modal')).toBeVisible()
    await page.getByTestId('upzit-task-input-title').fill(title)
    await page.getByTestId('upzit-task-save').click()
    await expect(page.getByTestId('upzit-task-modal')).toBeHidden({ timeout: 15_000 })
    await expect(page.getByTestId('upzit-tasks-table')).toContainText(title)
    annotateTzPassed(testInfo)
  })

  test('TC-SPR-001 — просмотр спринтов', async ({ page }, testInfo) => {
    annotateTzCase(testInfo, {
      tcId: 'TC-SPR-001',
      reportSection: '2.2.3 Редактирование БД',
      testedFunction: 'Загрузка списка спринтов',
      inputs: 'Вход admin; раздел «Спринты»',
      expected: 'Таблица спринтов отображается без ошибки',
    })
    await login(page, 'admin', 'password')
    await page.getByTestId('upzit-nav-sprints').click()
    await expect(page.getByTestId('upzit-sprints-table')).toBeVisible()
    await expect(page.getByTestId('upzit-sprints-page')).toContainText('Спринт')
    annotateTzPassed(testInfo)
  })
})
