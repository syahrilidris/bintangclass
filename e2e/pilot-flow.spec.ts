import { test, expect, type Page, type Browser } from '@playwright/test'

// The whole pilot journey, as three real people in three separate browsers:
// an owner sets up a centre, a teacher joins and marks attendance, a parent joins and sees their child.
// Runs only against a local Supabase (see .github/workflows/e2e.yml).

const shots = process.env.E2E_SHOTS_DIR ?? 'e2e-shots'
const run = Date.now().toString(36)
const owner = { name: 'Ustazah Nurul Huda', email: `owner-${run}@e2e.test` }
const teacher = { name: 'Ustaz Hakim Zainal', email: `teacher-${run}@e2e.test` }
const parent = { name: 'Puan Siti Aminah', email: `parent-${run}@e2e.test` }
const password = `E2e-${run}-pass`
const centreName = 'Kelas Mengaji Nurul Iman'
const slug = `nurul-iman-${run}`

/** Wait until React has taken over the page, so input isn't lost to hydration. */
async function ready(page: Page) {
  await page.locator('html[data-hydrated]').waitFor({ state: 'attached' })
}

async function signIn(page: Page, email: string) {
  await page.goto('/login')
  await ready(page)
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(new RegExp(`/c/${slug}$`))
  await ready(page)
}

async function shot(page: Page, name: string) {
  await page.screenshot({ path: `${shots}/${name}.png`, fullPage: true })
}

async function signUp(page: Page, who: { name: string; email: string }) {
  await ready(page)
  await page.getByLabel('Your name').fill(who.name)
  const email = page.getByLabel('Email')
  if (!(await email.inputValue())) await email.fill(who.email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Create account' }).click()
}

async function newPerson(browser: Browser, mobile = false) {
  const ctx = await browser.newContext({
    permissions: ['microphone'],
    ...(mobile ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } : {}),
  })
  const page = await ctx.newPage()
  // Surface browser-side crashes in the test log
  page.on('pageerror', (e) => console.log(`[pageerror] ${page.url()}: ${e.message}\n${e.stack ?? ''}`))
  page.on('console', (m) => m.type() === 'error' && console.log(`[console] ${m.text()}`))
  return page
}

test.describe.configure({ mode: 'serial' })

let ownerPage: Page
let teacherInvite = ''
let parentInvite = ''
let aisyahUrl = ''
let umarUrl = ''

test('owner signs up and sets up a centre', async ({ browser }) => {
  ownerPage = await newPerson(browser)
  const page = ownerPage
  await page.goto('/')
  await ready(page)
  await shot(page, '01-landing')
  await page.getByRole('link', { name: 'Start free' }).click()
  await shot(page, '02-signup')
  await signUp(page, owner)

  await expect(page.getByRole('heading', { name: 'Set up your centre' })).toBeVisible()
  await page.getByRole('link', { name: 'Set up a centre' }).click()
  await ready(page)
  await page.getByLabel('Centre name').fill(centreName)
  await page.getByLabel('Web address').fill(slug)
  await page.getByLabel('Phone or WhatsApp').fill('012-345 6789')
  await page.getByLabel('Town or city').fill('Shah Alam')
  await shot(page, '03-create-centre')
  await page.getByRole('button', { name: 'Set up centre' }).click()

  await expect(page).toHaveURL(new RegExp(`/c/${slug}$`))
  await expect(page.getByRole('heading', { name: 'Assalamualaikum, Ustazah Nurul' })).toBeVisible()
  await expect(page.getByText('Get your centre ready')).toBeVisible()
  await shot(page, '04-owner-today-empty')
})

test('owner adds a class and students with their Iqra level', async () => {
  const page = ownerPage
  await page.goto(`/c/${slug}/classes`)
  await ready(page)
  await page.getByLabel('Class name').fill('Iqra Pagi')
  await page.getByLabel('When it meets').fill('Isnin & Rabu, 5.00 pm')
  await page.getByRole('button', { name: 'Add class' }).click()
  await expect(page.getByRole('heading', { name: 'Iqra Pagi' })).toBeVisible()

  await page.goto(`/c/${slug}/students`)

  await ready(page)
  const add = async (name: string, book: string, pageNo: string, another: boolean) => {
    await page.getByLabel('Full name').fill(name)
    await page.getByLabel('Class').selectOption({ label: 'Iqra Pagi' })
    await page.getByLabel('Reading now').selectOption(book)
    await page.getByLabel('Page', { exact: true }).fill(pageNo)
    await page.getByRole('button', { name: another ? 'Add and add another' : 'Add student' }).click()
  }
  await add('Muhammad Umar', 'Iqra 2', '9', true)
  await expect(page.getByText('Muhammad Umar added.')).toBeVisible()
  await add('Nur Iman', 'Al-Quran', '48', true)
  await expect(page.getByText('Nur Iman added.')).toBeVisible()
  await add('Aisyah binti Rahman', 'Iqra 4', '22', false)
  await expect(page.getByRole('heading', { name: 'Aisyah binti Rahman' })).toBeVisible()
  aisyahUrl = new URL(page.url()).pathname
  await expect(page.getByText('Iqra 4, page 22').first()).toBeVisible()
  await shot(page, '05-student-new')

  await page.goto(`/c/${slug}/students`)

  await ready(page)
  await expect(page.getByRole('link', { name: /Muhammad Umar/ })).toBeVisible()
  umarUrl = (await page.getByRole('link', { name: /Muhammad Umar/ }).getAttribute('href'))!
  await shot(page, '06-students-list')
})

test('owner invites a teacher and a parent', async () => {
  const page = ownerPage
  await page.goto(`/c/${slug}/people`)
  await ready(page)
  await page.getByLabel('Their email').fill(teacher.email)
  await page.getByLabel('Joins as').selectOption('teacher')
  await page.getByRole('button', { name: 'Create invitation' }).click()
  // The new link shows in the form and again under "Waiting to join"; both are the same invitation.
  teacherInvite = await page.getByLabel('Invitation link').first().inputValue()
  expect(teacherInvite).toContain('/invite/')
  await expect(page.getByRole('link', { name: 'Send on WhatsApp' }).first()).toHaveAttribute('href', /wa\.me/)
  await shot(page, '07-people-invite-teacher')

  await page.goto(aisyahUrl)

  await ready(page)
  await page.getByLabel('Their email').fill(parent.email)
  await page.getByRole('button', { name: 'Create invitation' }).click()
  parentInvite = await page.getByLabel('Invitation link').inputValue()
  expect(parentInvite).toContain('/invite/')
})

test('teacher joins from the invite link', async ({ browser }) => {
  const page = await newPerson(browser)
  await page.goto(new URL(teacherInvite).pathname)
  await ready(page)
  await expect(page.getByRole('heading', { name: `Join ${centreName}` })).toBeVisible()
  await shot(page, '08-invite-landing')
  await page.getByRole('link', { name: 'Create account and join' }).click()
  await expect(page.getByLabel('Email')).toHaveValue(teacher.email)
  await signUp(page, teacher)
  await ready(page)
  await page.getByRole('button', { name: `Join ${centreName}` }).click()
  await expect(page).toHaveURL(new RegExp(`/c/${slug}$`))
  await expect(page.getByText('You haven’t been given a class yet')).toBeVisible()
  // Teachers have no People page
  const res = await page.goto(`/c/${slug}/people`)
  await ready(page)
  expect(res?.status()).toBe(404)
  await page.context().close()
})

test('owner assigns the teacher to the class', async () => {
  const page = ownerPage
  await page.goto(`/c/${slug}/classes`)
  await ready(page)
  await page.getByRole('link', { name: /Iqra Pagi/ }).click()
  await expect(page.getByRole('heading', { name: 'Iqra Pagi' })).toBeVisible()
  const select = page.getByLabel('Teacher')
  await select.selectOption({ label: teacher.name })
  await expect(select).toHaveValue(/^[0-9a-f-]{36}$/)
  await page.getByRole('button', { name: 'Save class' }).click()
  await expect(page.getByText('Class saved.')).toBeVisible()
  await expect(page.getByText(`Taught by ${teacher.name}`)).toBeVisible()
  await page.reload()
  await ready(page)
  await expect(page.getByLabel('Teacher')).toHaveValue(/^[0-9a-f-]{36}$/)
})

test('teacher marks attendance and records progress on a phone', async ({ browser }) => {
  const page = await newPerson(browser, true)
  await page.goto('/login')
  await ready(page)
  await page.getByLabel('Email').fill(teacher.email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(new RegExp(`/c/${slug}$`))
  await expect(page.getByText('0 of 3 marked')).toBeVisible()
  await shot(page, '09-teacher-today-mobile')

  await page.getByRole('link', { name: /Iqra Pagi/ }).click()
  const row = (name: string) => page.getByRole('group', { name: `Attendance for ${name}` })
  await row('Aisyah binti Rahman').getByRole('button', { name: 'Present' }).click()
  await row('Nur Iman').getByRole('button', { name: 'Absent' }).click()
  await page.getByRole('button', { name: 'Mark everyone else present' }).click()
  await expect(page.getByText('2 present, 1 absent')).toBeVisible()
  await expect(page.getByText('Saved', { exact: true })).toBeVisible()
  await shot(page, '10-teacher-attendance-mobile')
  // Saved, not just shown: reload and check again
  await page.reload()
  await ready(page)
  await expect(page.getByText('2 present, 1 absent')).toBeVisible()
  await expect(row('Nur Iman').getByRole('button', { name: 'Absent' })).toHaveAttribute('aria-pressed', 'true')

  await page.goto(aisyahUrl)

  await ready(page)
  await expect(page.getByLabel('Page', { exact: true })).toHaveValue('23')
  await page.getByLabel('Note for the parent').fill('Good makhraj today. Practise the mad letters at home.')
  await page.getByRole('button', { name: 'Save progress' }).click()
  await expect(page.getByText('Moved to Iqra 4, page 23.')).toBeVisible()
  await expect(page.getByText('Iqra 4, page 23').first()).toBeVisible()
  await shot(page, '11-teacher-student-mobile')

  await page.goto(`/c/${slug}/classes`)
  await ready(page)
  await page.getByRole('link', { name: /Iqra Pagi/ }).click()
  await page.getByLabel('What to practise at home').fill('Iqra 4, pages 23–24')
  await page.getByRole('button', { name: 'Set practice' }).click()
  await expect(page.getByText('Practice set.')).toBeVisible()
  await page.context().close()
})

test('parent joins and sees only their own child', async ({ browser }) => {
  const page = await newPerson(browser)
  await page.goto(new URL(parentInvite).pathname)
  await ready(page)
  await expect(page.getByText('follow your child’s reading')).toBeVisible()
  await page.getByRole('link', { name: 'Create account and join' }).click()
  await signUp(page, parent)
  await ready(page)
  await page.getByRole('button', { name: `Join ${centreName}` }).click()
  await expect(page).toHaveURL(new RegExp(`/c/${slug}$`))
  await expect(page.getByText('Aisyah binti Rahman')).toBeVisible()
  await expect(page.getByText('Iqra 4, page 23')).toBeVisible()
  await expect(page.getByText('1 of 1 classes attended this month')).toBeVisible()
  await expect(page.getByText(/Good makhraj today/)).toBeVisible()
  await expect(page.getByText('Muhammad Umar')).toHaveCount(0)
  await shot(page, '12-parent-home')

  await expect(page.getByText('Iqra 4, pages 23–24').first()).toBeVisible()
  await page.getByText('Aisyah binti Rahman').click()
  await expect(page.getByRole('heading', { name: 'Record progress' })).toHaveCount(0)
  await ready(page)
  await shot(page, '13-parent-child')

  // Record practice at home with the (fake) microphone, listen back, send.
  await page.getByRole('button', { name: 'Start recording' }).click()
  await expect(page.getByText(/Recording 0:0/)).toBeVisible()
  await page.waitForTimeout(2500)
  await page.getByRole('button', { name: 'Stop' }).click()
  await expect(page.getByRole('button', { name: 'Send to teacher' })).toBeVisible()
  await page.getByRole('button', { name: 'Send to teacher' }).click()
  await expect(page.getByText('Sent. The teacher will listen and reply here.')).toBeVisible()
  await expect(page.getByText('Waiting for the teacher to listen.')).toBeVisible()
  await shot(page, '13b-parent-sent-recording')

  const res = await page.goto(umarUrl)

  await ready(page)
  expect(res?.status()).toBe(404)
  const people = await page.goto(`/c/${slug}/people`)
  await ready(page)
  expect(people?.status()).toBe(404)
  await page.context().close()
})

test('teacher listens and replies', async ({ browser }) => {
  const page = await newPerson(browser)
  await signIn(page, teacher.email)
  await expect(page.getByText('1 recording to listen to')).toBeVisible()
  await page.getByRole('link', { name: 'Listen' }).click()
  await expect(page.getByRole('heading', { name: 'Practice' })).toBeVisible()
  await ready(page)
  await expect(page.locator('audio')).toHaveCount(1)
  await page.getByRole('radio', { name: '3 stars' }).click()
  await page.getByRole('radio', { name: 'Good' }).click()
  await page.getByPlaceholder(/Note for the parent/).fill('MasyaAllah, smooth reading. Keep the mad two counts long.')
  await shot(page, '14a-teacher-practice-inbox')
  await page.getByRole('button', { name: 'Send reply' }).click()
  await expect(page.getByText('Reply sent.')).toBeVisible()
  await page.context().close()
})

test('parent sees the teacher’s reply', async ({ browser }) => {
  const page = await newPerson(browser, true)
  await signIn(page, parent.email)
  await expect(page.getByText(/teacher said good, 3 of 3 stars/)).toBeVisible()
  await page.getByText('Aisyah binti Rahman').click()
  await expect(page.getByText('Good', { exact: true })).toBeVisible()
  await expect(page.getByText(/smooth reading/)).toBeVisible()
  await shot(page, '14b-parent-reply-mobile')
  await page.context().close()
})

test('owner sees the day at a glance', async () => {
  const page = ownerPage
  await page.goto(`/c/${slug}`)
  await ready(page)
  await expect(page.getByText('Marked')).toBeVisible()
  await expect(page.getByText(/reached Iqra 4, page 23/)).toBeVisible()
  await shot(page, '14-owner-today')

  // Desktop account menu at the bottom of the sidebar
  await page.locator('aside summary').click()
  await expect(page.locator('aside').getByRole('button', { name: 'How to use the app' })).toBeVisible()
  await page.screenshot({ path: `${shots}/14d-desktop-menu.png` })
  await page.locator('aside summary').click()

  // On a slow connection, tapping a link shows the next page's outline straight away
  // (tabs are loaded in advance, so use a class link, which isn't)
  await page.route(/\/classes\/[0-9a-f-]{36}/, async (route) => {
    if (route.request().headers()['rsc']) await new Promise((r) => setTimeout(r, 1500))
    await route.continue()
  })
  await page.getByRole('link', { name: /Iqra Pagi/ }).first().click()
  await expect(page.getByLabel('Loading')).toBeVisible()
  await shot(page, '14c-loading-outline')
  await expect(page.getByRole('heading', { name: 'Iqra Pagi' })).toBeVisible()
  await expect(page.getByLabel('Loading')).toHaveCount(0)
  await page.unrouteAll()
  await page.goto(`/c/${slug}/people`)
  await ready(page)
  await expect(page.getByText(teacher.name, { exact: true })).toBeVisible()
  await expect(page.getByText(parent.name, { exact: true })).toBeVisible()
  await shot(page, '15-people')
})

test('the same screens in dark mode, on a phone', async ({ browser }) => {
  for (const who of [parent, teacher, owner]) {
    const page = await newPerson(browser, true)
    await page.addInitScript(() => localStorage.setItem('bc-theme', 'dark'))
    await signIn(page, who.email)
    await expect(page.locator('html')).toHaveClass(/dark/)
    const tag = who === parent ? 'parent' : who === teacher ? 'teacher' : 'owner'
    await shot(page, `30-dark-${tag}-home`)
    if (who === parent) {
      await page.getByText('Aisyah binti Rahman').click()
      await expect(page.getByRole('grid', { name: /Attendance,/ })).toBeVisible()
      await shot(page, '31-dark-parent-child')
    }
    await page.context().close()
  }
  const light = await newPerson(browser, true)
  await signIn(light, parent.email)
  await shot(light, '32-light-parent-home-mobile')
  await light.context().close()
})

/** Let the service worker take control, as it does from the second visit onwards. */
async function controlled(page: Page) {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
  })
  await page.reload()
  await ready(page)
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true)
}

test('teacher marks attendance with no signal; it sends when back online', async ({ browser }) => {
  const page = await newPerson(browser, true)
  await signIn(page, teacher.email)
  await controlled(page)
  await page.getByRole('link', { name: /Iqra Pagi/ }).first().click()
  await expect(page.getByRole('heading', { name: 'Iqra Pagi' })).toBeVisible()
  await ready(page)
  const classUrl = page.url()
  // Pages reached by in-app links are saved for offline in the background
  await expect
    .poll(() => page.evaluate(async (u) => Boolean(await (await caches.open('bc-pages')).match(new URL(u).pathname)), classUrl), { timeout: 15_000 })
    .toBe(true)

  await page.context().setOffline(true)
  // Pages already opened still show, with when they were saved
  await page.goto(`/c/${slug}`).catch(() => {})
  await expect(page.getByText(/You’re offline\. Showing this page as it was at/)).toBeVisible()
  await expect(page.getByRole('heading', { name: /Assalamualaikum/ })).toBeVisible()
  await page.goto(classUrl).catch(() => {})
  await ready(page)
  const row = page.getByRole('group', { name: 'Attendance for Nur Iman' })
  await row.getByRole('button', { name: 'Present' }).click()
  await expect(row.getByRole('button', { name: 'Present' })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByText('Not sent yet')).toBeVisible()
  await expect(page.getByText('Saved on this phone, sends when online')).toBeVisible()
  await shot(page, '40-offline-attendance')

  await page.context().setOffline(false)
  await expect(page.getByText('Sent 1 saved item.')).toBeVisible({ timeout: 20_000 })
  await page.reload()
  await ready(page)
  await expect(page.getByRole('group', { name: 'Attendance for Nur Iman' }).getByRole('button', { name: 'Present' })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByText('3 present, 0 absent')).toBeVisible()
  await page.context().close()
})

test('parent records practice with no signal; it sends when back online; sign-out wipes the phone', async ({ browser }) => {
  const page = await newPerson(browser, true)
  await signIn(page, parent.email)
  await controlled(page)
  await page.getByText('Aisyah binti Rahman').click()
  await expect(page).toHaveURL(/\/students\//)
  await expect(page.getByRole('button', { name: 'Start recording' })).toBeVisible()
  const before = await page.locator('audio').count()

  await page.context().setOffline(true)
  await page.getByRole('button', { name: 'Start recording' }).click()
  await page.waitForTimeout(1500)
  await page.getByRole('button', { name: 'Stop' }).click()
  await page.getByRole('button', { name: 'Send to teacher' }).click()
  await expect(page.getByText('Saved on this phone.', { exact: true })).toBeVisible()
  await shot(page, '41-offline-recording')

  await page.context().setOffline(false)
  await expect(page.getByText('Sent 1 saved item.')).toBeVisible({ timeout: 20_000 })
  await expect(page.locator('audio')).toHaveCount(before + 1)

  expect(await page.evaluate(() => caches.has('bc-pages'))).toBe(true)
  await page.getByLabel('Account').click()
  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(page).toHaveURL(/\/(login)?$/)
  expect(await page.evaluate(() => caches.has('bc-pages'))).toBe(false)
  await page.context().close()
})

test('the tour shows each parent the parts of their page, and can be replayed', async ({ browser }) => {
  const page = await newPerson(browser, true)
  await page.addInitScript(() => ((window as { __bcTour?: boolean }).__bcTour = true))
  await signIn(page, parent.email)
  const tour = page.getByRole('dialog')
  await expect(tour.getByRole('heading', { name: 'Welcome' })).toBeVisible()
  await tour.getByRole('button', { name: 'Show me' }).click()
  await expect(tour.getByRole('heading', { name: 'Reading now' })).toBeVisible()
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${shots}/guide-12-tour.png` })
  await tour.getByRole('button', { name: 'Next' }).click()
  await tour.getByRole('button', { name: 'Next' }).click()
  await tour.getByRole('button', { name: 'Next' }).click()
  await tour.getByRole('button', { name: 'Done' }).click()
  await expect(tour).toHaveCount(0)
  await page.reload()
  await ready(page)
  await page.waitForTimeout(900)
  await expect(page.getByRole('dialog')).toHaveCount(0) // seen once, not shown again
  await page.getByLabel('Account').click()
  await page.getByRole('button', { name: 'How to use the app' }).click()
  await expect(page.getByRole('dialog').getByRole('heading', { name: 'Welcome' })).toBeVisible()
  await page.context().close()
})

/** Phone screenshots for the printed user guide: each scrolled to the part the guide talks about. */
test('screens for the user guide', async ({ browser }) => {
  test.setTimeout(120_000)
  const g = async (page: Page, name: string, at?: ReturnType<Page['locator']>) => {
    if (at) await at.first().evaluate((el) => el.scrollIntoView({ block: 'start' }), undefined, { timeout: 8000 }).catch(() => console.log(`[guide] ${name}: section not found`))
    else await page.evaluate(() => window.scrollTo(0, 0))
    await page.waitForTimeout(400)
    await page.screenshot({ path: `${shots}/guide-${name}.png` })
  }

  const anon = await newPerson(browser, true)
  await anon.goto('/signup')
  await ready(anon)
  await g(anon, '01-signup')
  await anon.goto('/help')
  await g(anon, '13-help')
  await anon.context().close()

  const o = await newPerson(browser, true)
  await signIn(o, owner.email)
  await g(o, '02-owner-today')
  await o.goto('/app/new')
  await ready(o)
  await g(o, '03-setup-centre')
  await o.goto(`/c/${slug}/classes`)
  await ready(o)
  await g(o, '04-classes')
  await o.goto(`/c/${slug}/students`)
  await ready(o)
  await g(o, '05-students', o.getByRole('heading', { name: /Add students|Students/ }))
  await o.goto(`/c/${slug}/people`)
  await ready(o)
  await g(o, '06-invite', o.getByRole('heading', { name: 'Invite someone' }))
  await o.goto(aisyahUrl)
  await ready(o)
  await g(o, '07-invite-parent', o.getByRole('heading', { name: 'Parents' }))
  await o.context().close()

  const t = await newPerson(browser, true)
  await signIn(t, teacher.email)
  await t.getByRole('link', { name: /Iqra Pagi/ }).first().click()
  await expect(t.getByRole('heading', { name: 'Iqra Pagi' })).toBeVisible()
  await ready(t)
  await g(t, '08-attendance', t.getByRole('heading', { name: 'Attendance' }))
  await g(t, '09b-set-practice', t.getByRole('heading', { name: 'Practice at home' }))
  await t.goto(aisyahUrl)
  await ready(t)
  await g(t, '09-progress', t.getByRole('heading', { name: 'Progress' }))
  await t.goto(`/c/${slug}/practice`)
  await ready(t)
  await g(t, '10-practice-inbox')
  await t.context().close()

  const p = await newPerson(browser, true)
  await signIn(p, parent.email)
  await g(p, '11-parent-home')
  await p.getByText('Aisyah binti Rahman').click()
  await expect(p.getByRole('button', { name: 'Start recording' })).toBeVisible()
  await g(p, '11b-record', p.getByRole('heading', { name: 'Practice at home' }))
  await p.context().close()
})

test('signing up again with an email that has an account says so', async ({ browser }) => {
  const page = await newPerson(browser, true)
  await page.goto('/signup')
  await signUp(page, { name: 'Someone', email: owner.email })
  const alert = page.getByRole('alert').filter({ hasText: 'This email already has an account.' })
  await expect(alert).toBeVisible()
  await expect(alert.getByRole('link', { name: 'Sign in' })).toBeVisible()
  await shot(page, '16-signup-exists')
  await page.context().close()
})

test('the bell shows new recordings to the teacher and replies to the parent', async ({ browser }) => {
  const t = await newPerson(browser, true)
  await signIn(t, teacher.email)
  await t.getByRole('link', { name: /^Notifications, \d+ new$/ }).click()
  await expect(t.getByRole('heading', { name: 'Notifications' })).toBeVisible()
  await expect(t.getByText(/New recording from Aisyah/).first()).toBeVisible()
  await expect(t.getByText('Phone notifications')).toBeVisible()
  await shot(t, '17-teacher-notifications')
  await t.reload()
  await ready(t)
  await expect(t.getByRole('link', { name: 'Notifications', exact: true })).toBeVisible() // all seen now
  // set new practice now that the parent has joined
  await t.goto(`/c/${slug}/classes`)
  await t.getByRole('link', { name: /Iqra Pagi/ }).first().click()
  await ready(t)
  await t.getByLabel('What to practise at home').fill('Iqra 4, pages 25–26')
  await t.getByRole('button', { name: 'Set practice' }).click()
  await expect(t.getByText('Iqra 4, pages 25–26').first()).toBeVisible()
  await t.context().close()

  const p = await newPerson(browser, true)
  await signIn(p, parent.email)
  await p.getByRole('link', { name: /^Notifications, \d+ new$/ }).click()
  await expect(p.getByText(/replied to Aisyah’s recording/).first()).toBeVisible()
  await expect(p.getByText(/New practice for Aisyah/).first()).toBeVisible()
  await expect(p.getByText(/Iqra 4, pages 25–26/).first()).toBeVisible()
  await expect(p.getByText(/New recording from/)).toHaveCount(0) // parents don't get teachers' notifications
  await shot(p, '18-parent-notifications')
  await p.getByText(/replied to Aisyah’s recording/).first().click()
  await expect(p).toHaveURL(/\/students\//)
  await p.context().close()
})

test('parent and teacher message each other about the child', async ({ browser }) => {
  const p = await newPerson(browser, true)
  await signIn(p, parent.email)
  await p.getByRole('link', { name: /Message the teacher/ }).click()
  await expect(p.getByRole('heading', { name: 'Messages about Aisyah' })).toBeVisible()
  await ready(p)
  await p.getByLabel('Message').fill('Assalamualaikum ustaz, Aisyah demam hari ini. Dia tak datang kelas.')
  await p.getByRole('button', { name: 'Send' }).click()
  await expect(p.getByText('Aisyah demam hari ini', { exact: false })).toBeVisible()
  await expect(p.getByText('Sending…')).toHaveCount(0)
  await shot(p, '19-parent-message')

  const t = await newPerson(browser, true)
  await signIn(t, teacher.email)
  await t.getByRole('link', { name: /^Messages/ }).first().click()
  const thread = t.getByRole('list', { name: 'Conversations' }).getByRole('link', { name: /Aisyah binti Rahman/ })
  await expect(thread).toContainText('Aisyah demam hari ini')
  await thread.click()
  await ready(t)
  await expect(t.getByText(/Puan Siti Aminah/).first()).toBeVisible()
  await t.getByLabel('Message').fill('Waalaikumsalam. Semoga cepat sembuh. Practice Iqra 4 page 25 bila sihat.')
  await t.getByRole('button', { name: 'Send' }).click()
  await expect(t.getByText('Semoga cepat sembuh', { exact: false })).toBeVisible()
  await shot(t, '20-teacher-message')
  await t.context().close()

  await p.reload()
  await ready(p)
  await expect(p.getByText('Semoga cepat sembuh', { exact: false })).toBeVisible()
  await expect(p.getByText(/Ustaz Hakim Zainal/).first()).toBeVisible()
  await p.context().close()
})
