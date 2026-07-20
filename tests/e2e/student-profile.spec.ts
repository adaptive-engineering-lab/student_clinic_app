import { test, expect } from './fixtures'

/**
 * Requires the seeded nurse account (supabase/seed.sql, nurse@test.local) and a local
 * Supabase stack running (`supabase start`). See quickstart.md scenario 1.
 */
test('create student, add severe allergy, confirm banner renders', async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('textbox', { name: 'Email' }).fill('nurse@test.local')
  await page.getByRole('textbox', { name: 'Password' }).fill('test-password-123')
  await page.getByRole('button', { name: 'Sign in' }).click()

  await page.getByRole('link', { name: /student profiles/i }).click()
  await page.getByRole('button', { name: '+ New student' }).click()

  const uniqueId = `E2E-${Date.now()}`
  await page.getByRole('textbox', { name: 'First name' }).fill('Alex')
  await page.getByRole('textbox', { name: 'Last name' }).fill('Tester')
  await page.getByRole('combobox', { name: 'Day' }).selectOption('1')
  await page.getByRole('combobox', { name: 'Month' }).selectOption('6')
  await page.getByRole('combobox', { name: 'Year' }).selectOption('2015')
  await page.getByRole('textbox', { name: 'Student ID (SIS)' }).fill(uniqueId)
  await page.getByRole('button', { name: 'Create student' }).click()

  await expect(page.getByRole('heading', { name: 'Edit student' })).toBeVisible()

  // No banner yet — no alerts recorded.
  await expect(page.getByText('Critical medical alert')).toHaveCount(0)

  const alertForm = page.locator('form', { hasText: 'Add allergy / condition' })
  await alertForm.getByRole('textbox', { name: 'Allergen' }).fill('Peanuts')
  await alertForm.getByRole('combobox', { name: 'Severity' }).selectOption('life-threatening')
  await alertForm.getByRole('button', { name: 'Add alert' }).click()

  await expect(page.getByText('Critical medical alert')).toBeVisible()
  await expect(page.getByText('Peanuts — life-threatening')).toBeVisible()
})
