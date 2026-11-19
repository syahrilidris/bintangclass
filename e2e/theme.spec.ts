import { test, expect } from '@playwright/test'

// Light / Dark / Auto switch: applies at once, survives a reload, and Auto follows the phone's setting.

test('theme switch remembers the choice and Auto follows the device', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await page.goto('/login')
  await page.locator('html[data-hydrated]').waitFor({ state: 'attached' })
  const html = page.locator('html')
  await expect(html).not.toHaveClass(/dark/)

  await page.getByRole('radio', { name: 'Dark' }).click()
  await expect(html).toHaveClass(/dark/)
  await expect(page.getByRole('radio', { name: 'Dark' })).toHaveAttribute('aria-checked', 'true')

  // Dark is applied before first paint on the next load, not after React starts.
  await page.reload({ waitUntil: 'commit' })
  await page.waitForSelector('html.dark', { state: 'attached' })
  await page.screenshot({ path: `${process.env.E2E_SHOTS_DIR ?? 'e2e-shots'}/33-dark-login.png` })

  await page.locator('html[data-hydrated]').waitFor({ state: 'attached' })
  await page.getByRole('radio', { name: 'Auto' }).click()
  await expect(html).not.toHaveClass(/dark/)
  await page.emulateMedia({ colorScheme: 'dark' })
  await expect(html).toHaveClass(/dark/)

  await page.getByRole('radio', { name: 'Light' }).click()
  await expect(html).not.toHaveClass(/dark/)
})
