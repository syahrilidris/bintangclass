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
  return ctx.newPage()
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
