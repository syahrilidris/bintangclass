import { test, expect, type Page } from '@playwright/test'
import { execFileSync } from 'node:child_process'

// The platform admin's dashboard. Runs after pilot-flow.spec.ts, so at least one centre exists.
// Making someone a platform admin is a database-only action (no button for it), so the test does it with psql.

const db = process.env.E2E_DB_URL
const run = Date.now().toString(36)
const admin = { email: `platform-${run}@e2e.test`, password: `Plat-${run}-pass` }
const shots = process.env.E2E_SHOTS_DIR ?? 'e2e-shots'

async function ready(page: Page) {
  await page.locator('html[data-hydrated]').waitFor({ state: 'attached' })
}

test.describe.configure({ mode: 'serial' })
test.skip(!db, 'needs E2E_DB_URL (local Supabase) to make a platform admin')

test('a signed-in user without the role cannot open the dashboard', async ({ page }) => {
  await page.goto('/signup')
  await ready(page)
  await page.getByLabel('Your name').fill('Syahril Platform')
  await page.getByLabel('Email').fill(admin.email)
  await page.getByLabel('Password').fill(admin.password)
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page.getByRole('heading', { name: 'Set up your centre' })).toBeVisible()
  const res = await page.goto('/admin')
  expect(res?.status()).toBe(404)
})

test('platform admin sees every centre’s numbers, and manages plan and CRM', async ({ page }) => {
  execFileSync('psql', [db!, '-v', 'ON_ERROR_STOP=1', '-c',
    `insert into public.platform_admins (user_id) select id from auth.users where email = '${admin.email}'`])

  await page.goto('/login')
  await ready(page)
  await page.getByLabel('Email').fill(admin.email)
  await page.getByLabel('Password').fill(admin.password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/admin$/)
  await ready(page)
  await expect(page.getByRole('heading', { name: 'All centres' })).toBeVisible()
  const headline = page.getByRole('region', { name: 'Headline numbers' })
  for (const k of ['Centres', 'Active students', 'Monthly revenue', 'Teacher reply rate']) {
    await expect(headline.getByText(k, { exact: true })).toBeVisible()
  }
  await expect(page.getByRole('img', { name: /Attendance marked, last 30 days/ })).toBeVisible()
  const centre = page.getByRole('link', { name: 'Kelas Mengaji Nurul Iman' }).first()
  await expect(centre).toBeVisible()
  await page.screenshot({ path: `${shots}/30-platform-overview.png`, fullPage: true })

  await centre.click()
  await ready(page)
  await expect(page.getByText('Active students')).toBeVisible()
  // No children's names anywhere on the platform pages
  await expect(page.getByText('Aisyah binti Rahman')).toHaveCount(0)

  await page.getByLabel('Stage').selectOption('active')
  await page.getByLabel('Next follow-up').fill('2030-01-15')
  await page.getByRole('button', { name: 'Save contact' }).click()
  await expect(page.getByText('Saved. Stage: Active.')).toBeVisible()

  await page.getByRole('radio', { name: 'Call' }).click()
  await page.getByPlaceholder(/What was said/).fill('Called the owner. Happy with attendance; wants fee reminders next.')
  await page.getByRole('button', { name: 'Add note' }).click()
  await expect(page.getByText('Called the owner. Happy with attendance')).toBeVisible()

  await page.getByLabel('Status').selectOption('read_only')
  await page.getByRole('button', { name: 'Save plan' }).click()
  await expect(page.getByText('Saved.', { exact: true })).toBeVisible()
  await page.reload()
  await ready(page)
  await expect(page.getByText(/status active → read_only/)).toBeVisible()
  await page.getByLabel('Status').selectOption('active')
  await page.getByRole('button', { name: 'Save plan' }).click()
  await expect(page.getByText(/status read_only → active/)).toBeVisible()
  await expect(page.getByLabel('Status')).toHaveValue('active')
  await page.screenshot({ path: `${shots}/31-platform-centre.png`, fullPage: true })

  // On a phone: tab bar instead of header links, cards instead of the wide table
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({ path: `${shots}/35-platform-centre-mobile.png`, fullPage: true })
  await page.goto('/admin')
  await ready(page)
  const tabs = page.getByRole('navigation', { name: 'Platform' })
  await expect(tabs.getByRole('link', { name: 'Leads' })).toBeVisible()
  await expect(page.getByRole('table')).toBeHidden()
  await expect(page.getByRole('link', { name: /Kelas Mengaji Nurul Iman/ }).first()).toBeVisible()
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(overflow).toBeLessThanOrEqual(0)
  await page.screenshot({ path: `${shots}/34-platform-overview-mobile.png`, fullPage: true })
  // Centres tab opens the full, searchable list (it used to bounce back to Overview)
  await tabs.getByRole('link', { name: 'Centres' }).click()
  await expect(page).toHaveURL(/\/admin\/centres$/)
  await expect(page.getByRole('heading', { name: 'Centres', exact: true })).toBeVisible()
  await expect(tabs.getByRole('link', { name: 'Centres' })).toHaveAttribute('aria-current', 'page')
  await expect(page.getByRole('link', { name: /Kelas Mengaji Nurul Iman/ }).first()).toBeVisible()
  await page.getByRole('searchbox', { name: 'Search centres' }).fill('no-such-centre')
  await page.getByRole('button', { name: 'Search' }).click()
  await expect(page.getByText('No centres match')).toBeVisible()
  await page.screenshot({ path: `${shots}/36-platform-centres-mobile.png`, fullPage: true })
  await tabs.getByRole('link', { name: 'Leads' }).click()
  await expect(page).toHaveURL(/\/admin\/leads$/)
  await page.setViewportSize({ width: 1366, height: 860 })

  await page.goto('/admin/leads')
  await ready(page)
  await page.getByLabel('Centre name').fill('Pusat Tahfiz Al-Amin')
  await page.getByLabel('Contact person').fill('Ustaz Amin')
  await page.getByLabel('Phone or WhatsApp').fill('013-222 3333')
  await page.getByRole('button', { name: 'Add lead' }).click()
  await expect(page.getByRole('heading', { name: 'Pusat Tahfiz Al-Amin' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Message on WhatsApp' })).toHaveAttribute('href', /wa\.me\/60132223333/)
})
