import { test, expect } from './fixtures'

/**
 * Requires the seeded nurse and admin accounts (supabase/seed.sql) and a local
 * Supabase stack running (`supabase start`). See quickstart.md scenario 5.
 */
test('nurse sees student names in the report; admin sees only aggregates', async ({ page }) => {
  const lastName = `Boundary${Date.now()}`

  await page.goto('/login')
  await page.getByRole('textbox', { name: 'Email' }).fill('nurse@test.local')
  await page.getByRole('textbox', { name: 'Password' }).fill('test-password-123')
  await page.getByRole('button', { name: 'Sign in' }).click()

  await page.getByRole('link', { name: /student profiles/i }).click()
  await page.getByRole('button', { name: '+ New student' }).click()

  const uniqueId = `E2E-BOUNDARY-${Date.now()}`
  await page.getByRole('textbox', { name: 'First name' }).fill('Report')
  await page.getByRole('textbox', { name: 'Last name' }).fill(lastName)
  await page.getByRole('combobox', { name: 'Day' }).selectOption('1')
  await page.getByRole('combobox', { name: 'Month' }).selectOption('3')
  await page.getByRole('combobox', { name: 'Year' }).selectOption('2016')
  await page.getByRole('textbox', { name: 'Student ID (SIS)' }).fill(uniqueId)
  await page.getByRole('button', { name: 'Create student' }).click()
  await expect(page.getByRole('heading', { name: 'Edit student' })).toBeVisible()

  await page.getByRole('link', { name: 'Start visit' }).click()
  await expect(page).toHaveURL(/\/visits\/new$/)
  await page.getByLabel('Disposition').selectOption('returned_to_class')
  // saveVisit() enqueues the write and returns before the offline-queue flush
  // actually reaches Supabase (fire-and-forget, by design — Constitution Principle
  // III) — wait for that network write to land before reading it back from a
  // different page, or this race loses ~half the time.
  const [visitResponse] = await Promise.all([
    page.waitForResponse(
      (res) => res.url().includes('/rest/v1/visits') && res.request().method() === 'POST',
    ),
    page.getByRole('button', { name: 'Save visit' }).click(),
  ])
  expect(visitResponse.ok()).toBe(true)
  await expect(page).toHaveURL(/\/students$/)

  await page.goto('/reports')

  const nurseReport = page.getByTestId('visit-frequency-report')
  await expect(nurseReport).toBeVisible()
  await expect(nurseReport.getByText(`Report ${lastName}`)).toBeVisible()

  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(page).toHaveURL(/\/login$/)

  await page.getByRole('textbox', { name: 'Email' }).fill('admin@test.local')
  await page.getByRole('textbox', { name: 'Password' }).fill('test-password-123')
  // Wait for sign-in to actually land before navigating away — an immediate goto()
  // cancels the in-flight signInWithPassword fetch.
  await Promise.all([page.waitForURL('/'), page.getByRole('button', { name: 'Sign in' }).click()])

  await page.goto('/reports')

  const adminReport = page.getByTestId('admin-aggregate-report')
  await expect(adminReport).toBeVisible()

  // The FERPA boundary itself: this student's name must not appear anywhere on the
  // admin's reports page, in any form (visit summary, immunization gaps, etc.).
  await expect(page.getByText(`Report ${lastName}`)).toHaveCount(0)
})
