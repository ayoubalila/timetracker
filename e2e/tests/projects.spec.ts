import { test, expect } from '@playwright/test'
import { registerAndLogin, uniqueUsername } from './helpers'

// Issue #20 — E2E test: create project → add subproject → view tree
test('create a project, add a subproject, and view the hierarchy in the sidebar tree', async ({ page }) => {
  const username = uniqueUsername('carol')
  await registerAndLogin(page, username)

  await page.getByTestId('nav-projects').click()
  await expect(page).toHaveURL(/\/projects/)

  await page.getByTestId('new-project-button').click()
  await page.getByTestId('create-name-input').fill('Lecture')
  await page.getByTestId('create-submit').click()
  await expect(page.getByTestId('create-form')).toBeHidden()

  const tree = page.getByTestId('project-tree')
  await expect(tree.getByText('Lecture', { exact: true })).toBeVisible()

  await tree.getByText('Lecture', { exact: true }).click()
  await expect(page.getByTestId('project-detail')).toContainText('Lecture')

  await page.getByTestId('add-subproject-button').click()
  await expect(page.getByTestId('create-form')).toBeVisible()
  await page.getByTestId('create-name-input').fill('Assignment')
  await page.getByTestId('create-submit').click()
  await expect(page.getByTestId('create-form')).toBeHidden()

  // subproject appears nested in the tree alongside its parent
  await expect(tree.getByText('Lecture', { exact: true })).toBeVisible()
  await expect(tree.getByText('Assignment', { exact: true })).toBeVisible()

  // selecting the subproject shows a breadcrumb back to its parent
  await tree.getByText('Assignment', { exact: true }).click()
  const detail = page.getByTestId('project-detail')
  await expect(detail).toContainText('Lecture')
  await expect(detail).toContainText('Assignment')
})
