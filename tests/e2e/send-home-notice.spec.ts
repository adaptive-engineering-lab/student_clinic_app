import { test, expect } from './fixtures'

/**
 * Requires the seeded nurse account (supabase/seed.sql), a local Supabase stack
 * running (`supabase start`), and the generate-send-home-notice Edge Function served
 * locally (`supabase functions serve generate-send-home-notice`). See quickstart.md
 * scenario 4.
 */
test('sent-home visit generates a retrievable notice', async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('textbox', { name: 'Email' }).fill('nurse@test.local')
  await page.getByRole('textbox', { name: 'Password' }).fill('test-password-123')
  await page.getByRole('button', { name: 'Sign in' }).click()

  await page.getByRole('link', { name: /student profiles/i }).click()
  await page.getByRole('button', { name: '+ New student' }).click()

  const uniqueId = `E2E-NOTICE-${Date.now()}`
  const lastName = `Notice${Date.now()}`
  await page.getByRole('textbox', { name: 'First name' }).fill('Send')
  await page.getByRole('textbox', { name: 'Last name' }).fill(lastName)
  await page.getByRole('textbox', { name: 'Date of birth' }).fill('2016-03-01')
  await page.getByRole('textbox', { name: 'Student ID (SIS)' }).fill(uniqueId)
  await page.getByRole('button', { name: 'Create student' }).click()
  await expect(page.getByRole('heading', { name: 'Edit student' })).toBeVisible()

  await page.getByRole('link', { name: 'Start visit' }).click()
  await expect(page).toHaveURL(/\/visits\/new$/)

  await page.getByLabel('Disposition').selectOption('sent_home')
  await page.getByRole('button', { name: 'Save visit' }).click()
  await expect(page).toHaveURL(/\/students$/)

  // Re-select the student to view visit history on their profile.
  await page.getByText(lastName, { exact: false }).click()

  const historyEntry = page.locator('div', { hasText: 'sent_home' }).last()
  await expect(historyEntry).toBeVisible()

  await historyEntry.getByRole('radio', { name: 'Print' }).check()
  await historyEntry.getByRole('button', { name: 'Generate notice' }).click()

  // Once generated, VisitHistoryNotice swaps the trigger form for the retrieval
  // control — "View send-home notice" fetches a signed URL, then swaps itself for
  // an "Open send-home notice" link.
  await page.getByRole('button', { name: 'View send-home notice' }).click()
  const noticeLink = page.getByRole('link', { name: /open send-home notice/i })
  await expect(noticeLink).toBeVisible()

  // The PDF triggers a browser download rather than a navigable page load, so assert
  // on the retrieval link itself (a signed URL into the send-home-notices bucket)
  // rather than racing the download.
  await expect(noticeLink).toHaveAttribute('href', /send-home-notices/)
})
