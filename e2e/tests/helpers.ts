import { expect, type Page } from '@playwright/test'

export function uniqueUsername(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1e6)}`
}

// Fresh users default to the UTC time zone, so a plain UTC ISO slice matches
// what the datetime-local input expects.
export function toLocalInputValue(date: Date): string {
  return date.toISOString().slice(0, 19)
}

export async function registerAndLogin(page: Page, username: string, password = 'password123'): Promise<void> {
  await page.goto('/login')
  await page.getByTestId('tab-register').click()
  await page.getByTestId('input-username').fill(username)
  await page.getByTestId('input-email').fill(`${username}@example.com`)
  await page.getByTestId('input-password').fill(password)
  await page.getByTestId('submit-button').click()
  await expect(page).toHaveURL(/\/dashboard/)
}
