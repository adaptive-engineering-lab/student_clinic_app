import { test, expect } from './fixtures'

/**
 * Requires the seeded nurse account (supabase/seed.sql, nurse@test.local) and a local
 * Supabase stack running (`supabase start`). See quickstart.md scenarios 1-5.
 */
async function signIn(page: import('@playwright/test').Page, email: string) {
  await page.goto('/login')
  await page.getByRole('textbox', { name: 'Email' }).fill(email)
  await page.getByRole('textbox', { name: 'Password' }).fill('test-password-123')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByText(`Signed in as`)).toBeVisible()
}

test.describe('Breadcrumb trail (US1)', () => {
  test('tapping an ancestor crumb navigates directly there, skipping the intermediate screen', async ({
    page,
  }) => {
    await signIn(page, 'nurse@test.local')
    await page.getByRole('link', { name: /student profiles/i }).click()
    await expect(page.getByRole('button', { name: '+ New student' })).toBeVisible()

    const breadcrumb = page.getByRole('navigation', { name: 'Breadcrumb' })
    await expect(breadcrumb.getByRole('link', { name: 'Dashboard' })).toBeVisible()
    await expect(breadcrumb.getByText('Students')).toBeVisible()

    await breadcrumb.getByRole('link', { name: 'Dashboard' }).click()
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
  })

  test('renders no breadcrumb on the dashboard', async ({ page }) => {
    await signIn(page, 'nurse@test.local')
    await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toHaveCount(0)
  })
})

test.describe('Bottom tab bar (US2)', () => {
  test.use({ viewport: { width: 375, height: 812 } })

  test('shows role-appropriate sections and switches on tap', async ({ page }) => {
    await signIn(page, 'nurse@test.local')

    const tabBar = page.getByRole('navigation', { name: 'Main sections' })
    await expect(tabBar).toBeVisible()

    const box = await tabBar.boundingBox()
    expect(box).not.toBeNull()
    // Lower two-thirds of a 812px-tall viewport starts at ~271px.
    expect(box!.y).toBeGreaterThan(812 * (1 / 3))

    await tabBar.getByRole('link', { name: /Reports/ }).click()
    await expect(page.getByRole('heading', { name: 'Reports' })).toBeVisible()
  })

  test('withholds the Students tab for admin', async ({ page }) => {
    await signIn(page, 'admin@test.local')
    const tabBar = page.getByRole('navigation', { name: 'Main sections' })
    await expect(tabBar.getByRole('link', { name: /Students/ })).toHaveCount(0)
  })
})

test.describe('Persistent navigation history (US3)', () => {
  test('restores the last page after a fresh app load', async ({ page }) => {
    await signIn(page, 'nurse@test.local')
    await page.getByRole('link', { name: /reports/i }).click()
    await expect(page.getByRole('heading', { name: 'Reports' })).toBeVisible()

    // Simulate relaunching the installed PWA from its icon: a fresh navigation to
    // start_url ('/'), not a same-page reload.
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Reports' })).toBeVisible()
  })

  test('does not leak one user\'s history into a different user\'s session', async ({ page }) => {
    await signIn(page, 'nurse@test.local')
    await page.getByRole('link', { name: /reports/i }).click()
    await expect(page.getByRole('heading', { name: 'Reports' })).toBeVisible()
    await page.getByRole('button', { name: 'Sign out' }).click()

    await signIn(page, 'admin@test.local')
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
  })
})

test.describe('Touch-friendly mobile layout (US4)', () => {
  for (const width of [320, 430]) {
    test(`no horizontal scroll at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 })
      await signIn(page, 'nurse@test.local')

      for (const linkName of [/student profiles/i, /reports/i]) {
        await page.goto('/')
        await page.getByRole('main').getByRole('link', { name: linkName }).click()
        const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
        const clientWidth = await page.evaluate(() => document.documentElement.clientWidth)
        expect(scrollWidth).toBeLessThanOrEqual(clientWidth)
      }
    })
  }

  test('navigation controls meet the 44x44px minimum touch target', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await signIn(page, 'nurse@test.local')

    const tabBar = page.getByRole('navigation', { name: 'Main sections' })
    for (const link of await tabBar.getByRole('link').all()) {
      const box = await link.boundingBox()
      expect(box).not.toBeNull()
      expect(box!.height).toBeGreaterThanOrEqual(44)
    }

    await page.getByRole('link', { name: /student profiles/i }).click()
    const breadcrumb = page.getByRole('navigation', { name: 'Breadcrumb' })
    for (const link of await breadcrumb.getByRole('link').all()) {
      const box = await link.boundingBox()
      expect(box).not.toBeNull()
      expect(box!.height).toBeGreaterThanOrEqual(44)
    }
  })
})
