import { test, expect } from '@playwright/test'

test.describe('UI: login', () => {
  test('shows login form', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByTestId('upzit-login-page')).toBeVisible()
    await expect(page.getByTestId('upzit-login-username')).toBeVisible()
    await expect(page.getByTestId('upzit-login-password')).toBeVisible()
    await expect(page.getByTestId('upzit-login-submit')).toBeVisible()
  })

  test('shows error on invalid credentials', async ({ page }) => {
    await page.goto('/login')
    await page.getByTestId('upzit-login-username').fill('admin')
    await page.getByTestId('upzit-login-password').fill('definitely_wrong_password')
    await page.getByTestId('upzit-login-submit').click()
    await expect(page.getByTestId('upzit-login-error')).toBeVisible({ timeout: 15_000 })
  })

  test('admin reaches projects after successful login', async ({ page }) => {
    await page.goto('/login')
    await page.getByTestId('upzit-login-username').fill('admin')
    await page.getByTestId('upzit-login-password').fill('password')
    await page.getByTestId('upzit-login-submit').click()
    await expect(page.getByTestId('upzit-app-shell')).toBeVisible({ timeout: 20_000 })
    await expect(page.getByTestId('upzit-current-user')).toContainText('Иванов')
    await expect(page.getByTestId('upzit-projects-table')).toBeVisible()
    await expect(page.getByTestId('upzit-project-row-1')).toBeVisible()
  })

  test('logout returns to login', async ({ page }) => {
    await page.goto('/login')
    await page.getByTestId('upzit-login-username').fill('admin')
    await page.getByTestId('upzit-login-password').fill('password')
    await page.getByTestId('upzit-login-submit').click()
    await expect(page.getByTestId('upzit-logout-button')).toBeVisible({ timeout: 20_000 })
    await page.getByTestId('upzit-logout-button').click()
    await expect(page.getByTestId('upzit-login-form')).toBeVisible()
  })
})
