import { test, expect } from '@playwright/test'

// Installable app: manifest, icons, service worker, offline page, and the install banner on an iPhone.

test('app can be installed: manifest, icons and service worker', async ({ page, request }) => {
  const res = await request.get('/manifest.webmanifest')
  expect(res.ok()).toBeTruthy()
  const m = await res.json()
  expect(m.name).toBe('Bintang Class')
  expect(m.display).toBe('standalone')
  expect(m.start_url).toBe('/app')
  for (const icon of m.icons as { src: string; sizes: string; purpose: string }[]) {
    const img = await request.get(icon.src)
    expect(img.ok(), icon.src).toBeTruthy()
    expect(img.headers()['content-type']).toContain('image/png')
  }
  expect(m.icons.some((i: { purpose: string }) => i.purpose === 'maskable')).toBeTruthy()
  expect((await request.get('/icons/apple-touch-icon.png')).ok()).toBeTruthy()

  const sw = await request.get('/sw.js')
  expect(sw.ok()).toBeTruthy()
  expect(sw.headers()['cache-control']).toContain('no-cache')

  await page.goto('/')
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', /manifest\.webmanifest/)
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveCount(1)
  const scope = await page.evaluate(async () => (await navigator.serviceWorker.ready).scope)
  expect(scope).toMatch(/\/$/)
})

test('offline page shows when there is no connection', async ({ page, context }) => {
  await page.goto('/')
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
  })
  await page.reload() // let the worker take control of the page
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true)
  await expect.poll(() => page.evaluate(async () => Boolean(await caches.match('/offline.html')))).toBe(true)
  await context.setOffline(true)
  await page.goto('/login').catch(() => {})
  await expect(page.getByRole('heading', { name: 'No connection' })).toBeVisible()
  await page.screenshot({ path: `${process.env.E2E_SHOTS_DIR ?? 'e2e-shots'}/20-offline.png` })
  await context.setOffline(false)
})

test.describe('on an iPhone', () => {
  test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  })

  test('shows Add to Home Screen steps, and Not now hides them', async ({ page }) => {
    const run = Date.now().toString(36)
    await page.goto('/signup')
    await page.locator('html[data-hydrated]').waitFor({ state: 'attached' })
    await page.getByLabel('Your name').fill('Puan Pwa Tester')
    await page.getByLabel('Email').fill(`pwa-${run}@e2e.test`)
    await page.getByLabel('Password').fill(`Pwa-${run}-pass`)
    await page.getByRole('button', { name: 'Create account' }).click()
    await expect(page.getByRole('heading', { name: 'Set up your centre' })).toBeVisible()

    const banner = page.getByRole('region', { name: 'Install the app' })
    await expect(banner).toBeVisible()
    await expect(banner.getByText('Add to Home Screen')).toBeVisible()
    await page.screenshot({ path: `${process.env.E2E_SHOTS_DIR ?? 'e2e-shots'}/21-install-iphone.png` })

    await banner.getByRole('button', { name: 'Not now' }).click()
    await expect(banner).toHaveCount(0)
    await page.reload()
    await page.locator('html[data-hydrated]').waitFor({ state: 'attached' })
    await expect(page.getByRole('heading', { name: 'Set up your centre' })).toBeVisible()
    await expect(page.getByRole('region', { name: 'Install the app' })).toHaveCount(0)
  })
})
