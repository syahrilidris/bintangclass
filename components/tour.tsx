'use client'

import { useCallback, useEffect, useLayoutEffect, useState } from 'react'

type Step = { target?: string; title: string; body: string }
type Role = 'owner' | 'admin' | 'teacher' | 'parent'

const ACCOUNT: Step = {
  target: 'account',
  title: 'Your menu',
  body: 'Light or dark, switching centre, your password and signing out are here. Tap “How to use the app” to see this tour again.',
}

const STEPS: Record<Role, Step[]> = {
  owner: [
    { title: 'Welcome to Bintang Class', body: 'A quick look around: five steps, about a minute. You can skip it and see it again from your menu.' },
    { target: 'setup', title: 'Get your centre ready', body: 'Three things to do first: add a class, add students with their Iqra level, and invite your teachers. Each ticks off when done.' },
    { target: 'actions', title: 'Quick actions', body: 'The things you do most, one tap away. Parents are invited from each child’s own page.' },
    { target: 'nav', title: 'Main pages', body: 'Classes, Students, Practice recordings, People and Settings. Today brings you back here.' },
    ACCOUNT,
  ],
  admin: [
    { title: 'Welcome to Bintang Class', body: 'You help run this centre. A quick look around: four steps.' },
    { target: 'actions', title: 'Quick actions', body: 'Add students, open classes, invite people and check home practice.' },
    { target: 'nav', title: 'Main pages', body: 'Classes, Students, Practice and People. Today brings you back here.' },
    ACCOUNT,
  ],
  teacher: [
    { title: 'Welcome, ustaz / ustazah', body: 'A quick look around: four steps. You can see it again from your menu.' },
    { target: 'classes', title: 'Your classes today', body: 'Tap a class to take attendance: Present or Absent for each child. It works with no signal too.' },
    { target: 'actions', title: 'Quick actions', body: 'Take attendance, reply to home practice recordings, set practice for the week, and see your students.' },
    ACCOUNT,
  ],
  parent: [
    { title: 'Welcome', body: 'This is where you follow your child’s Quran reading. Four quick steps.' },
    { target: 'level', title: 'Reading now', body: 'The book and page your child has reached. A star fills for each Iqra book finished. The teacher’s note is underneath.' },
    { target: 'record', title: 'Practice at home', body: 'Tap Record, let your child read, then Send to teacher. The teacher replies with stars and a note.' },
    { target: 'attendance', title: 'Attendance', body: 'Classes attended this month. Tap for the full calendar.' },
    ACCOUNT,
  ],
}

const KEY = (role: Role) => `bc-tour-${role}-v1`
export const TOUR_EVENT = 'bc-tour-start'

/** The first visible element with this data-tour name (phone and computer layouts each have one). */
function find(name?: string): HTMLElement | null {
  if (!name) return null
  for (const el of Array.from(document.querySelectorAll<HTMLElement>(`[data-tour="${name}"]`))) {
    const r = el.getBoundingClientRect()
    if (r.width > 0 && r.height > 0) return el
  }
  return null
}

/** Short guided tour for each role: shown once on first visit, and again from the menu. */
export function Tour({ role }: { role: Role }) {
  const [open, setOpen] = useState(false)
  const [i, setI] = useState(0)
  const [rect, setRect] = useState<DOMRect | null>(null)
  // Skip steps whose part isn't on this page (e.g. the setup list once it's done).
  const steps = open ? STEPS[role].filter((s) => !s.target || s.target === 'account' || find(s.target)) : STEPS[role]
  const step = steps[Math.min(i, steps.length - 1)]

  useEffect(() => {
    const forced = (window as { __bcTour?: boolean }).__bcTour
    let seen = false
    try {
      seen = localStorage.getItem(KEY(role)) === 'done'
    } catch {}
    // Automated browsers (tests) don't get the tour unless they ask for it.
    if (!seen && (!navigator.webdriver || forced)) {
      const t = setTimeout(() => setOpen(true), 600)
      return () => clearTimeout(t)
    }
  }, [role])

  useEffect(() => {
    const start = () => {
      setI(0)
      setOpen(true)
    }
    window.addEventListener(TOUR_EVENT, start)
    return () => window.removeEventListener(TOUR_EVENT, start)
  }, [])

  const close = useCallback(() => {
    setOpen(false)
    try {
      localStorage.setItem(KEY(role), 'done')
    } catch {}
  }, [role])

  // Point at the step's element, scrolling it into view first.
  useLayoutEffect(() => {
    if (!open) return
    const el = find(step?.target)
    if (!el) {
      setRect(null)
      return
    }
    el.scrollIntoView({ block: 'center', behavior: 'smooth' })
    const update = () => setRect(el.getBoundingClientRect())
    const t = setTimeout(update, 350)
    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      clearTimeout(t)
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [open, i, step?.target])

  useEffect(() => {
    if (!open) return
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
      if (e.key === 'ArrowRight') setI((n) => Math.min(n + 1, steps.length - 1))
      if (e.key === 'ArrowLeft') setI((n) => Math.max(n - 1, 0))
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [open, close, steps.length])

  if (!open || !step) return null
  const last = i >= steps.length - 1
  const pad = 8
  const vh = typeof window === 'undefined' ? 800 : window.innerHeight
  // Card below the element if there's room, otherwise above; centred when there's no element.
  const below = rect ? rect.bottom + 220 < vh : true
  const cardStyle: React.CSSProperties = rect
    ? below
      ? { top: Math.min(rect.bottom + pad + 12, vh - 230) }
      : { bottom: Math.max(vh - rect.top + pad + 12, 16) }
    : { top: '50%', transform: 'translateY(-50%)' }

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-labelledby="tour-title">
      {rect ? (
        <div
          className="pointer-events-none fixed rounded-2xl ring-2 ring-brass transition-all duration-300"
          style={{
            top: rect.top - pad,
            left: rect.left - pad,
            width: rect.width + pad * 2,
            height: rect.height + pad * 2,
            boxShadow: '0 0 0 9999px rgb(6 14 28 / 0.62)',
          }}
        />
      ) : (
        <div className="fixed inset-0 bg-[rgb(6_14_28/0.62)]" />
      )}
      <div className="fixed inset-0" onClick={close} aria-hidden />
      <div className="fixed inset-x-4 mx-auto max-w-sm rounded-[var(--radius-card)] bg-raised p-5 text-ink shadow-[var(--shadow-float)] animate-rise" style={cardStyle}>
        <p className="text-xs font-semibold text-muted">{i + 1} of {steps.length}</p>
        <h2 id="tour-title" className="mt-1 text-lg font-bold">{step.title}</h2>
        <p className="mt-1.5 text-sm text-muted">{step.body}</p>
        <div className="mt-4 flex items-center justify-between gap-3">
          <button type="button" className="text-sm font-semibold text-muted hover:text-ink" onClick={close}>
            {last ? '' : 'Skip'}
          </button>
          <div className="flex gap-2">
            {i > 0 ? <button type="button" className="btn btn-quiet min-h-10" onClick={() => setI(i - 1)}>Back</button> : null}
            <button type="button" className="btn btn-primary min-h-10" onClick={() => (last ? close() : setI(i + 1))} autoFocus>
              {last ? 'Done' : i === 0 ? 'Show me' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/** "How to use the app" in a menu: starts the tour again. */
export function TourButton({ className }: { className?: string }) {
  return (
    <button type="button" className={className} onClick={() => window.dispatchEvent(new Event(TOUR_EVENT))}>
      How to use the app
    </button>
  )
}
