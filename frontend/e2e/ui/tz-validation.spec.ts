import { test, expect, type Page } from '@playwright/test'
import { annotateTzCase, annotateTzPassed } from '../helpers/tz-metadata'

async function login(page: Page, loginName: string, password: string) {
  await page.goto('/login')
  await page.getByTestId('upzit-login-username').fill(loginName)
  await page.getByTestId('upzit-login-password').fill(password)
  await page.getByTestId('upzit-login-submit').click()
  await expect(page.getByTestId('upzit-app-shell')).toBeVisible({ timeout: 20_000 })
}

test.describe('ТЗ §2.2.5 Реакция на ошибочный ввод', () => {
  test('Пустой логин — HTML5-валидация формы входа', async ({ page }, testInfo) => {
    annotateTzCase(testInfo, {
      tcId: 'TC-VAL-LOGIN',
      reportSection: '2.2.5 Ошибочный ввод',
      testedFunction: 'Клиентская валидация обязательных полей входа',
      inputs: 'Страница /login; поле логина пустое, пароль заполнен; отправка формы',
      expected: 'Нативная валидация браузера не даёт отправить форму (поле login required)',
    })
    await page.goto('/login')
    await page.getByTestId('upzit-login-password').fill('password')
    await page.getByTestId('upzit-login-username').clear()
    const valid = await page.getByTestId('upzit-login-username').evaluate((el: HTMLInputElement) => el.checkValidity())
    expect(valid).toBe(false)
    annotateTzPassed(testInfo)
  })

  test('Задача: только пробелы в названии — ошибка от API', async ({ page }, testInfo) => {
    annotateTzCase(testInfo, {
      tcId: 'TC-VAL-TASK (см. отчёт скриншот)',
      reportSection: '2.2.5 Ошибочный ввод',
      testedFunction: 'Создание задачи с пустым названием после trim',
      inputs: 'Вход pm_sidorov; новая задача; в названии только пробелы; сохранить',
      expected:
        'Сервер отклоняет запрос (400); в форме отображается сообщение об ошибке (текст зависит от ответа API — часто «Bad Request» или поле errors)',
    })
    await login(page, 'pm_sidorov', 'password')
    await page.getByTestId('upzit-nav-tasks').click()
    await page.getByTestId('upzit-task-add-button').click()
    await page.getByTestId('upzit-task-input-title').fill('   ')
    await page.getByTestId('upzit-task-save').click()
    const errBox = page.getByTestId('upzit-task-form-error')
    await expect(errBox).toBeVisible({ timeout: 15_000 })
    await expect(errBox).not.toBeEmpty()
    await page.getByTestId('upzit-task-cancel').click()
    annotateTzPassed(testInfo)
  })
})
