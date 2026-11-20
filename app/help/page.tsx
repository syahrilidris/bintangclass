import Link from 'next/link'
import { Logo } from '@/components/star'
import { ThemeSwitch } from '@/components/theme'

export const metadata = { title: 'How to use Bintang Class' }

type Part = { heading: string; steps?: string[]; points?: string[]; note?: string }
type Section = { id: string; label: string; lead: string; parts: Part[] }

// The same guide as the shared document, kept short. Words in **bold** match the buttons on screen.
const GUIDE: Section[] = [
  {
    id: 'start',
    label: 'Getting started',
    lead: 'Owners set up the centre and invite everyone. Teachers and parents join from the link the centre sends them.',
    parts: [
      { heading: 'Put it on your phone', steps: ['Android: tap **Install the app** when it appears, or the ⋮ menu, then **Install app**.', 'iPhone (Safari): tap **Share**, then **Add to Home Screen**, then **Add**.'] },
      { heading: 'Find your way', points: ['The bar at the bottom (or on the left on a computer) has the main pages.', 'Tap your initials at the top for light or dark, the tour, your password and signing out.', 'Pull down at the top of a page to refresh it.'] },
    ],
  },
  {
    id: 'owners',
    label: 'Owners',
    lead: 'About 15 minutes to set up. The Today page shows a checklist until it’s done.',
    parts: [
      { heading: '1. Create your centre', steps: ['Tap **Create an account**, then fill in your name, email and a password.', 'Enter the centre name, town and WhatsApp number, then tap **Set up centre**.'] },
      { heading: '2. Add classes', steps: ['Tap **Classes**. Enter the **Class name** and **When it meets**.', 'Pick the **Teacher** if they’ve joined; otherwise do it after inviting them. Tap **Add class**.'] },
      { heading: '3. Add students', steps: ['Tap **Students**. Enter the child’s name, class, **Book** and **Page**.', 'Tap **Add and add another** to keep going.'] },
      { heading: '4. Invite teachers', steps: ['Tap **People**. Under **Invite someone**, enter their email and choose **Teacher**.', 'Tap **Create invitation**, then **Send on WhatsApp**.', 'When they’ve joined, open the class and choose them as **Teacher**.'] },
      { heading: '5. Invite parents', steps: ['Open the child from **Students**.', 'Under **Parents**, enter the parent’s email, tap **Create invitation**, and send it on WhatsApp.'], note: 'Inviting from the child’s page means each parent only ever sees their own child.' },
    ],
  },
  {
    id: 'teachers',
    label: 'Teachers',
    lead: 'Join from the centre’s link, signing up with the email it was sent to.',
    parts: [
      { heading: 'Take attendance', steps: ['On **Today**, tap your class.', 'Tap **Present** or **Absent** for each child, or **Mark everyone else present**.', 'Wait for **Saved** before leaving.'] },
      { heading: 'Record reading', steps: ['Tap the child’s name.', 'Choose the **Book** and **Page** they reached, add a **Note for the parent** if you like, and tap **Save progress**.'] },
      { heading: 'Set home practice', steps: ['Open the class, go to **Practice at home**.', 'Write what to practise, then tap **Set practice**.'] },
      { heading: 'Reply to recordings', steps: ['Tap **Practice**. The gold number shows how many are waiting.', 'Listen, choose stars and **Good** or **Repeat**, add a note, tap **Send reply**.'] },
    ],
  },
  {
    id: 'parents',
    label: 'Parents',
    lead: 'You only see your own children.',
    parts: [
      { heading: 'Join', steps: ['Open the link the centre sent on WhatsApp.', 'Tap **Create account** with the same email the centre has.'] },
      { heading: 'Your home page', points: ['**Reading now**: the book and page your child reached.', '**Attendance**: classes this month. Tap for the calendar.', 'More than one child? Tap a name at the top to switch.'] },
      { heading: 'Send home practice', steps: ['Tap **Record**, then **Start recording**. Let your child read, then tap **Stop**.', 'Tap **Send to teacher**. The first time, allow the microphone.'], note: 'The teacher’s stars and note appear under the recording on your child’s page.' },
    ],
  },
  {
    id: 'offline',
    label: 'No signal',
    lead: 'Pages you opened once with signal still show without it.',
    parts: [
      { heading: 'Working offline', points: ['Attendance and recordings made offline stay on the phone, marked **Not sent yet**.', 'When signal returns, keep the app open. It sends them by itself.', 'Teachers: open your class page once before going somewhere with poor signal.'] },
      { heading: 'Shared family phone', points: ['Sign out when done. This wipes saved pages and unsent work from the phone.', 'If something hasn’t been sent yet, the app warns you first.'] },
    ],
  },
  {
    id: 'questions',
    label: 'Questions',
    lead: 'Teachers and parents: your centre’s owner can help with anything else.',
    parts: [
      { heading: 'The invitation link can’t be used', points: ['It was used, cancelled, or opened with another email. Ask the centre for a new one.'] },
      { heading: 'Forgot your password', points: ['On the sign-in page, tap **Forgot password?** and open the email on your phone.'] },
      { heading: 'The app looks out of date', points: ['Close it fully and open it again.'] },
      { heading: 'Who can see what', points: ['Owners, admins and teachers see every child in their centre. Parents see only their own children.'] },
    ],
  },
]

function Md({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\*\*[^*]+\*\*)/).map((t, i) =>
        t.startsWith('**') ? <strong key={i} className="font-semibold text-ink">{t.slice(2, -2)}</strong> : <span key={i}>{t}</span>,
      )}
    </>
  )
}

export default function HelpPage() {
  return (
    <div className="min-h-dvh">
      <header className="bg-navy-900 px-5 pb-10 pt-[max(1rem,env(safe-area-inset-top))] text-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <Link href="/app"><Logo light /></Link>
          <ThemeSwitch tone="onNavy" compact />
        </div>
        <div className="mx-auto mt-6 max-w-3xl">
          <h1 className="text-[1.7rem] font-bold leading-tight">How to use Bintang Class</h1>
          <p className="mt-1 text-white/70">Short steps for owners, teachers and parents.</p>
        </div>
      </header>

      <div className="sheet">
        <nav aria-label="Guide sections" className="sticky top-0 z-10 rounded-t-[var(--radius-sheet)] bg-paper/95 backdrop-blur">
          <ul className="mx-auto flex max-w-3xl gap-2 overflow-x-auto px-5 py-3">
            {GUIDE.map((s) => (
              <li key={s.id}><a href={`#${s.id}`} className="chip shrink-0">{s.label}</a></li>
            ))}
          </ul>
        </nav>

        <main className="mx-auto grid max-w-3xl gap-10 px-5 pb-20 pt-4">
          {GUIDE.map((s) => (
            <section key={s.id} id={s.id} className="scroll-mt-20">
              <h2 className="text-xl font-bold">{s.label}</h2>
              <p className="mt-1 text-muted">{s.lead}</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {s.parts.map((p) => (
                  <div key={p.heading} className="panel p-5">
                    <h3 className="font-semibold">{p.heading}</h3>
                    {p.steps ? (
                      <ol className="mt-3 grid gap-2.5">
                        {p.steps.map((t, i) => (
                          <li key={i} className="flex gap-3 text-sm text-muted">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-50 text-xs font-bold text-teal-700">{i + 1}</span>
                            <span className="pt-0.5"><Md text={t} /></span>
                          </li>
                        ))}
                      </ol>
                    ) : null}
                    {p.points ? (
                      <ul className="mt-3 grid gap-2 text-sm text-muted">
                        {p.points.map((t, i) => (
                          <li key={i} className="flex gap-2.5">
                            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brass" aria-hidden />
                            <span><Md text={t} /></span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    {p.note ? <p className="mt-3 border-t border-line pt-3 text-xs text-muted"><Md text={p.note} /></p> : null}
                  </div>
                ))}
              </div>
            </section>
          ))}
          <p className="text-sm text-muted">
            Inside the app, tap your initials, then <strong className="text-ink">How to use the app</strong> for a quick guided tour.
          </p>
        </main>
      </div>
    </div>
  )
}
