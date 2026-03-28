import { test, expect, type Page } from '@playwright/test'

async function loginAs(page: Page, login: string, password: string) {
  await page.goto('/login')
  await page.getByTestId('upzit-login-username').fill(login)
  await page.getByTestId('upzit-login-password').fill(password)
  await page.getByTestId('upzit-login-submit').click()
  await expect(page.getByTestId('upzit-app-shell')).toBeVisible({ timeout: 20_000 })
}

test.describe('UI: navigation & RBAC', () => {
  test('admin sees Users section', async ({ page }) => {
    await loginAs(page, 'admin', 'password')
    await expect(page.getByTestId('upzit-nav-users')).toBeVisible()
  })

  test('viewer does not see Users section', async ({ page }) => {
    await loginAs(page, 'viewer', 'password')
    await expect(page.getByTestId('upzit-nav-users')).toHaveCount(0)
  })

  test('can open Tasks and Sprints from sidebar', async ({ page }) => {
    await loginAs(page, 'admin', 'password')
    await page.getByTestId('upzit-nav-tasks').click()
    await expect(page).toHaveURL(/\/tasks/)
    await page.getByTestId('upzit-nav-sprints').click()
    await expect(page).toHaveURL(/\/sprints/)
  })
})
