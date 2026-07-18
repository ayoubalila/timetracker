import { test, expect } from '@playwright/test'
import { registerAndLogin, uniqueUsername } from './helpers'

// Issue #14 — E2E test: register → login → logout flow
test.describe('Authentication', () => {
  test('register, log out, then log back in with the same credentials', async ({ page }) => {
    const username = uniqueUsername('alice')

    await registerAndLogin(page, username)
    await expect(page.getByTestId('nav-dashboard')).toBeVisible()

    await page.getByTestId('logout-button').click()
    await expect(page).toHaveURL(/\/login/)
    await expect(page.getByTestId('input-username')).toBeVisible()

    await page.getByTestId('input-username').fill(username)
    await page.getByTestId('input-password').fill('password123')
    await page.getByTestId('submit-button').click()

    await expect(page).toHaveURL(/\/dashboard/)
    await expect(page.getByTestId('nav-dashboard')).toBeVisible()
  })

  test('shows an error and stays on the login page for a wrong password', async ({ page }) => {
    const username = uniqueUsername('bob')
    await registerAndLogin(page, username)
    await page.getByTestId('logout-button').click()
    await expect(page).toHaveURL(/\/login/)

    await page.getByTestId('input-username').fill(username)
    await page.getByTestId('input-password').fill('wrong-password')
    await page.getByTestId('submit-button').click()

    await expect(page.getByTestId('error-message')).toBeVisible()
    await expect(page).toHaveURL(/\/login/)
  })
})
