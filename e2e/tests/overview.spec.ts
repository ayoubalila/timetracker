import { test, expect } from '@playwright/test'
import { registerAndLogin, uniqueUsername, toLocalInputValue } from './helpers'

// Issue #38 — E2E test: project total time updates after task add/stop
test('project total time and task list update after adding and stopping tasks', async ({ page }) => {
  const username = uniqueUsername('erin')
  await registerAndLogin(page, username)

  await page.getByTestId('nav-projects').click()
  await page.getByTestId('new-project-button').click()
  await page.getByTestId('create-name-input').fill('Focus Project')
  await page.getByTestId('create-submit').click()
  await expect(page.getByTestId('create-form')).toBeHidden()

  const tree = page.getByTestId('project-tree')
  await tree.getByText('Focus Project', { exact: true }).click()
  await expect(page.getByTestId('project-total-time-value')).toHaveText('0m')

  // add a manual 1-hour task tied to the project
  await page.getByTestId('nav-dashboard').click()
  await page.getByTestId('add-task-button').click()
  await page.getByTestId('task-description').fill('Planning work')

  const now = new Date()
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
  await page.getByTestId('task-start-time').fill(toLocalInputValue(oneHourAgo))
  await page.getByTestId('task-end-time').fill(toLocalInputValue(now))
  await page.getByTestId('task-form').getByText('Focus Project', { exact: true }).click()
  await page.getByTestId('task-form-save').click()
  await expect(page.getByTestId('task-form')).toBeHidden()

  // the project's total time should now reflect the added 1-hour task
  await page.getByTestId('nav-projects').click()
  await tree.getByText('Focus Project', { exact: true }).click()
  await expect(page.getByTestId('project-total-time-value')).toHaveText('1h 0m')

  // starting and stopping a live task tied to the project should also show up
  await page.getByTestId('start-task-for-project-button').click()
  await expect(page).toHaveURL(/\/dashboard/)
  await expect(page.getByTestId('start-form')).toBeVisible()
  await page.getByTestId('start-submit').click()
  await expect(page.getByTestId('current-task-panel')).toBeVisible()

  await page.getByTestId('stop-button').click()
  await expect(page.getByTestId('current-task-panel')).toBeHidden()

  await page.getByTestId('nav-projects').click()
  await tree.getByText('Focus Project', { exact: true }).click()
  await expect(page.getByTestId('project-task-list').locator('tr')).toHaveCount(2)
})
