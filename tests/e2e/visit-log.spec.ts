import { test, expect } from './fixtures'

/**
 * Requires the seeded nurse account (supabase/seed.sql) and a local Supabase stack
 * running (`supabase start`). See quickstart.md scenario 2.
 */
test('alert banner renders first, then a full visit can be saved', async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('textbox', { name: 'Email' }).fill('nurse@test.local')
  await page.getByRole('textbox', { name: 'Password' }).fill('test-password-123')
  await page.getByRole('button', { name: 'Sign in' }).click()

  await page.getByRole('link', { name: /student profiles/i }).click()
  await page.getByRole('button', { name: '+ New student' }).click()

  const uniqueId = `E2E-VISIT-${Date.now()}`
  await page.getByRole('textbox', { name: 'First name' }).fill('Visit')
  await page.getByRole('textbox', { name: 'Last name' }).fill('Flowtest')
  await page.getByRole('combobox', { name: 'Day' }).selectOption('1')
  await page.getByRole('combobox', { name: 'Month' }).selectOption('3')
  await page.getByRole('combobox', { name: 'Year' }).selectOption('2016')
  await page.getByRole('textbox', { name: 'Student ID (SIS)' }).fill(uniqueId)
  await page.getByRole('button', { name: 'Create student' }).click()
  await expect(page.getByRole('heading', { name: 'Edit student' })).toBeVisible()

  // Give this student a severe alert so we can confirm it's the first thing
  // rendered on the new-visit page.
  const alertForm = page.locator('form', { hasText: 'Add allergy / condition' })
  await alertForm.getByRole('textbox', { name: 'Allergen' }).fill('Bee stings')
  await alertForm.getByRole('combobox', { name: 'Severity' }).selectOption('severe')
  await alertForm.getByRole('button', { name: 'Add alert' }).click()
  await expect(page.getByText('Critical medical alert')).toBeVisible()

  await page.getByRole('link', { name: 'Start visit' }).click()
  await expect(page).toHaveURL(/\/visits\/new$/)

  // Banner must render before/above the visit form content (DOM order, not just
  // both being present) — Chief complaint is the form's first field. Both are
  // waited on individually (auto-retrying) before comparing DOM position, since a
  // one-shot innerText() read can race the client-side route transition.
  const banner = page.getByText('Critical medical alert')
  const chiefComplaintLabel = page.getByText('Chief complaint', { exact: true })
  await expect(banner).toBeVisible()
  await expect(chiefComplaintLabel).toBeVisible()
  const bannerPrecedesForm = await banner.evaluate(
    (bannerEl, formEl) => {
      return !!(bannerEl.compareDocumentPosition(formEl) & Node.DOCUMENT_POSITION_FOLLOWING)
    },
    await chiefComplaintLabel.elementHandle(),
  )
  expect(bannerPrecedesForm).toBe(true)

  // Attempt to save without a disposition — must be blocked.
  await page.getByRole('button', { name: 'Save visit' }).click()
  await expect(page.getByText(/disposition is required/i)).toBeVisible()

  // Now complete the visit and save.
  await page.getByLabel('Disposition').selectOption('returned_to_class')
  await page.getByRole('button', { name: 'Save visit' }).click()

  await expect(page).toHaveURL(/\/students$/)
})
