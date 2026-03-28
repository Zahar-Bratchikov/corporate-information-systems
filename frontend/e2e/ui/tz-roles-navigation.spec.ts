import { test, expect, type Page } from '@playwright/test'
import { annotateTzCase, annotateTzPassed } from '../helpers/tz-metadata'

async function login(page: Page, loginName: string, password: string) {
  await page.goto('/login')
  await page.getByTestId('upzit-login-username').fill(loginName)
  await page.getByTestId('upzit-login-password').fill(password)
  await page.getByTestId('upzit-login-submit').click()
  await expect(page.getByTestId('upzit-app-shell')).toBeVisible({ timeout: 20_000 })
}

test.describe('ТЗ §2.2.2 Вид ИС под разными пользователями и навигация', () => {
  test('TC-NAV-001 — редирект с корня на проекты', async ({ page }, testInfo) => {
    annotateTzCase(testInfo, {
      tcId: 'TC-NAV-001',
      reportSection: '2.2.2 Навигация',
      testedFunction: 'Маршрут / после входа',
      inputs: 'Вход admin; переход на /',
      expected: 'Автоматический переход на /projects',
    })
    await login(page, 'admin', 'password')
    await page.goto('/')
    await expect(page).toHaveURL(/\/projects/)
    annotateTzPassed(testInfo)
  })

  test('TC-NAV-002 — переключение разделов меню', async ({ page }, testInfo) => {
    annotateTzCase(testInfo, {
      tcId: 'TC-NAV-002',
      reportSection: '2.2.2 Навигация',
      testedFunction: 'Боковое меню: проекты, задачи, пользователи, спринты, отчёты',
      inputs: 'Вход admin; последовательные переходы по пунктам меню',
      expected: 'Каждый раздел открывается без ошибки загрузки (страница с ожидаемым testid)',
    })
    await login(page, 'admin', 'password')
    await page.getByTestId('upzit-nav-tasks').click()
    await expect(page.getByTestId('upzit-tasks-page')).toBeVisible()
    await page.getByTestId('upzit-nav-users').click()
    await expect(page.getByTestId('upzit-users-page')).toBeVisible()
    await page.getByTestId('upzit-nav-sprints').click()
    await expect(page.getByTestId('upzit-sprints-page')).toBeVisible()
    await page.getByTestId('upzit-nav-reports').click()
    await expect(page.getByTestId('upzit-reports-page')).toBeVisible()
    await page.getByTestId('upzit-nav-projects').click()
    await expect(page.getByTestId('upzit-projects-page')).toBeVisible()
    annotateTzPassed(testInfo)
  })

  test('TC-NAV-003 — несуществующий URL', async ({ page }, testInfo) => {
    annotateTzCase(testInfo, {
      tcId: 'TC-NAV-003',
      reportSection: '2.2.2 Навигация',
      testedFunction: 'Обработка неизвестного маршрута',
      inputs: 'Вход admin; переход на /unknown-route-xyz',
      expected: 'Приложение не падает; редирект на допустимый маршрут (/)',
    })
    await login(page, 'admin', 'password')
    await page.goto('/unknown-route-xyz')
    await expect(page).not.toHaveURL(/unknown-route/)
    annotateTzPassed(testInfo)
  })

  test('TC-USR-001 — раздел «Пользователи» у администратора', async ({ page }, testInfo) => {
    annotateTzCase(testInfo, {
      tcId: 'TC-USR-001',
      reportSection: '2.2.2 Вид ИС по ролям',
      testedFunction: 'Список пользователей для администратора',
      inputs: 'Вход admin; раздел «Пользователи»',
      expected: 'Таблица пользователей загружена, видны строки сидера (например admin)',
    })
    await login(page, 'admin', 'password')
    await page.getByTestId('upzit-nav-users').click()
    await expect(page.getByTestId('upzit-users-table')).toBeVisible()
    await expect(page.getByTestId('upzit-user-row-1')).toBeVisible()
    annotateTzPassed(testInfo)
  })

  test('TC-USR-002 — разработчик: нет пункта «Пользователи», прямой /users запрещён', async ({
    page,
  }, testInfo) => {
    annotateTzCase(testInfo, {
      tcId: 'TC-USR-002',
      reportSection: '2.2.2 Вид ИС по ролям',
      testedFunction: 'Ограничение доступа к управлению пользователями',
      inputs: 'Вход dev_kozlov; вручную открыть /users',
      expected: 'Пункта «Пользователи» в меню нет; на /users — сообщение «Доступ запрещён» (только админ управляет пользователями в текущей реализации)',
    })
    await login(page, 'dev_kozlov', 'password')
    await expect(page.getByTestId('upzit-nav-users')).toHaveCount(0)
    await page.goto('/users')
    await expect(page.getByTestId('upzit-users-forbidden')).toBeVisible()
    annotateTzPassed(testInfo)
  })

  test('TC-TSK-005 — наблюдатель: нет кнопки добавления проекта', async ({ page }, testInfo) => {
    annotateTzCase(testInfo, {
      tcId: 'TC-TSK-005 (аналог для проектов)',
      reportSection: '2.2.2 Вид ИС по ролям',
      testedFunction: 'Режим просмотра без создания записей (наблюдатель)',
      inputs: 'Вход viewer; раздел «Проекты»',
      expected: 'Кнопки «Добавить проект» нет (canEdit === false)',
    })
    await login(page, 'viewer', 'password')
    await expect(page.getByTestId('upzit-projects-page')).toBeVisible()
    await expect(page.getByTestId('upzit-project-add-button')).toHaveCount(0)
    annotateTzPassed(testInfo)
  })

  test('TC-PM-USERS — руководитель: пункт меню есть, страница только для админа', async ({
    page,
  }, testInfo) => {
    annotateTzCase(testInfo, {
      tcId: 'TC-PM-USERS',
      reportSection: '2.2.2 Вид ИС по ролям',
      testedFunction: 'Меню «Пользователи» у руководителя и проверка страницы',
      inputs: 'Вход pm_sidorov; переход /users',
      expected:
        'В меню есть «Пользователи»; страница пользователей в коде доступна только администратору — отображается «Доступ запрещён»',
      comment: 'Соответствие ТЗ по меню частичное: UI ведёт на раздел, но CRUD пользователей реализован только для администратора.',
    })
    await login(page, 'pm_sidorov', 'password')
    await expect(page.getByTestId('upzit-nav-users')).toBeVisible()
    await page.goto('/users')
    await expect(page.getByTestId('upzit-users-forbidden')).toBeVisible()
    annotateTzPassed(testInfo)
  })
})
