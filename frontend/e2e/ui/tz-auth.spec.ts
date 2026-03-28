import { test, expect, type Page } from '@playwright/test'
import { annotateTzCase, annotateTzPassed } from '../helpers/tz-metadata'

async function login(page: Page, login: string, password: string) {
  await page.goto('/login')
  await page.getByTestId('upzit-login-username').fill(login)
  await page.getByTestId('upzit-login-password').fill(password)
  await page.getByTestId('upzit-login-submit').click()
}

test.describe('ТЗ §2.2.1 Авторизация', () => {
  test('TC-AUTH-001 — успешный вход администратора', async ({ page }, testInfo) => {
    annotateTzCase(testInfo, {
      tcId: 'TC-AUTH-001',
      reportSection: '2.2.1 Авторизация',
      testedFunction: 'Вход в ИС по логину и паролю (JWT, сохранение сессии)',
      inputs: 'Логин: admin, пароль: password; страница /login',
      expected:
        'Успешный POST /api/authentication/login, переход в приложение, в шапке ФИО администратора и роль «Администратор», доступны разделы системы',
    })
    await login(page, 'admin', 'password')
    await expect(page.getByTestId('upzit-app-shell')).toBeVisible({ timeout: 20_000 })
    await expect(page.getByTestId('upzit-current-user')).toContainText('Иванов')
    await expect(page.locator('.layout-user-role')).toContainText('Администратор')
    annotateTzPassed(testInfo)
  })

  test('TC-AUTH-002 — успешный вход руководителя проекта', async ({ page }, testInfo) => {
    annotateTzCase(testInfo, {
      tcId: 'TC-AUTH-002',
      reportSection: '2.2.1 Авторизация',
      testedFunction: 'Вход под ролью «Руководитель проекта / Тимлид»',
      inputs: 'Логин: pm_sidorov, пароль: password',
      expected: 'Успешный вход; в интерфейсе отображается соответствующая роль',
    })
    await login(page, 'pm_sidorov', 'password')
    await expect(page.getByTestId('upzit-app-shell')).toBeVisible({ timeout: 20_000 })
    await expect(page.getByTestId('upzit-current-user')).toContainText('Сидоров')
    annotateTzPassed(testInfo)
  })

  test('TC-AUTH-003 — вход разработчика, пункт «Пользователи» скрыт', async ({ page }, testInfo) => {
    annotateTzCase(testInfo, {
      tcId: 'TC-AUTH-003',
      reportSection: '2.2.1–2.2.2 Авторизация и вид ИС',
      testedFunction: 'Отображение навигации для роли «Разработчик / QA»',
      inputs: 'Логин: dev_kozlov, пароль: password',
      expected: 'Успешный вход; ссылки «Пользователи» в меню нет',
    })
    await login(page, 'dev_kozlov', 'password')
    await expect(page.getByTestId('upzit-app-shell')).toBeVisible({ timeout: 20_000 })
    await expect(page.getByTestId('upzit-nav-users')).toHaveCount(0)
    annotateTzPassed(testInfo)
  })

  test('TC-AUTH-004 — вход наблюдателя', async ({ page }, testInfo) => {
    annotateTzCase(testInfo, {
      tcId: 'TC-AUTH-004',
      reportSection: '2.2.1–2.2.2',
      testedFunction: 'Вход под ролью «Наблюдатель»',
      inputs: 'Логин: viewer, пароль: password',
      expected: 'Успешный вход; расширенного редактирования (как у администратора) нет',
    })
    await login(page, 'viewer', 'password')
    await expect(page.getByTestId('upzit-app-shell')).toBeVisible({ timeout: 20_000 })
    await expect(page.getByTestId('upzit-nav-users')).toHaveCount(0)
    annotateTzPassed(testInfo)
  })

  test('TC-AUTH-005 — неверный пароль', async ({ page }, testInfo) => {
    annotateTzCase(testInfo, {
      tcId: 'TC-AUTH-005',
      reportSection: '2.2.5 Реакция на ошибочный ввод',
      testedFunction: 'Отказ во входе при неверном пароле',
      inputs: 'Логин: admin, пароль: wrong_password',
      expected: 'Сообщение об ошибке; пользователь остаётся на /login; в приложение не попадает',
    })
    await page.goto('/login')
    await page.getByTestId('upzit-login-username').fill('admin')
    await page.getByTestId('upzit-login-password').fill('wrong_password')
    await page.getByTestId('upzit-login-submit').click()
    await expect(page.getByTestId('upzit-login-error')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('upzit-login-page')).toBeVisible()
    await expect(page.getByTestId('upzit-app-shell')).toHaveCount(0)
    annotateTzPassed(testInfo)
  })

  test('TC-AUTH-006 — несуществующий логин', async ({ page }, testInfo) => {
    annotateTzCase(testInfo, {
      tcId: 'TC-AUTH-006',
      reportSection: '2.2.5 Реакция на ошибочный ввод',
      testedFunction: 'Отказ во входе при неизвестном логине',
      inputs: 'Логин: nonexistent_user_xyz, пароль: password',
      expected: 'Ошибка входа без перехода в основное приложение',
    })
    await page.goto('/login')
    await page.getByTestId('upzit-login-username').fill('nonexistent_user_xyz')
    await page.getByTestId('upzit-login-password').fill('password')
    await page.getByTestId('upzit-login-submit').click()
    await expect(page.getByTestId('upzit-login-error')).toBeVisible({ timeout: 15_000 })
    annotateTzPassed(testInfo)
  })

  test('TC-AUTH-007 — выход из системы', async ({ page }, testInfo) => {
    annotateTzCase(testInfo, {
      tcId: 'TC-AUTH-007',
      reportSection: '2.2.1 Авторизация',
      testedFunction: 'Завершение сессии (выход)',
      inputs: 'После входа admin — нажатие «Выход»',
      expected: 'Возврат на форму входа; повторный доступ к /projects требует авторизации',
    })
    await login(page, 'admin', 'password')
    await expect(page.getByTestId('upzit-logout-button')).toBeVisible({ timeout: 20_000 })
    await page.getByTestId('upzit-logout-button').click()
    await expect(page.getByTestId('upzit-login-form')).toBeVisible()
    await page.goto('/projects')
    await expect(page).toHaveURL(/\/login/)
    annotateTzPassed(testInfo)
  })

  test('TC-AUTH-008 — доступ к защищённым маршрутам без входа', async ({ page }, testInfo) => {
    annotateTzCase(testInfo, {
      tcId: 'TC-AUTH-008',
      reportSection: '2.2.1 Авторизация',
      testedFunction: 'Защита маршрутов без JWT',
      inputs: 'Новый контекст: переход на /projects без предварительного входа',
      expected: 'Редирект на /login',
    })
    await page.goto('/projects')
    await expect(page).toHaveURL(/\/login/)
    await expect(page.getByTestId('upzit-login-page')).toBeVisible()
    annotateTzPassed(testInfo)
  })
})
