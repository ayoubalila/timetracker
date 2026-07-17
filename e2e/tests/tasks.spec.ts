import { test, expect } from '@playwright/test'
import { registerAndLogin, uniqueUsername } from './helpers'

// Issue #29 — E2E test: start task → stop task → edit task
test('start a task, stop it, then edit its description', async ({ page }) => {
  const username = uniqueUsername('dave')
  await registerAndLogin(page, username)

  await page.getByTestId('start-task-button').click()
  await page.getByTestId('start-description').fill('Deep work')
  await page.getByTestId('start-submit').click()

  await expect(page.getByTestId('current-task-panel')).toBeVisible()
  await expect(page.getByTestId('current-task-description')).toHaveText('Deep work')

  await page.getByTestId('stop-button').click()
  await expect(page.getByTestId('current-task-panel')).toBeHidden()

  const taskRow = page.getByTestId('task-list').locator('tr', { hasText: 'Deep work' })
  await expect(taskRow).toBeVisible()

  await taskRow.getByLabel('Edit task').click()
  await expect(page.getByTestId('task-form')).toBeVisible()

  const descriptionInput = page.getByTestId('task-description')
  await descriptionInput.fill('')
  await descriptionInput.fill('Code review')
  await page.getByTestId('task-form-save').click()
  await expect(page.getByTestId('task-form')).toBeHidden()

  await expect(page.getByTestId('task-list')).toContainText('Code review')
  await expect(page.getByTestId('task-list')).not.toContainText('Deep work')
})
