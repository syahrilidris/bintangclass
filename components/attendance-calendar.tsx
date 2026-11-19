import Link from 'next/link'
import { Ring } from './ui'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function monthLabel(ym: string) {
  return new Intl.DateTimeFormat('en-MY', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(ym + '-01T12:00:00Z'))
}

export function shiftMonth(ym: string, by: number) {
  const d = new Date(ym + '-01T12:00:00Z')
  d.setUTCMonth(d.getUTCMonth() + by)
  return d.toISOString().slice(0, 7)
}

export function isMonth(v: unknown): v is string {
  return typeof v === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(v)
}

/**
 * Month calendar of attendance: teal = present, red = absent, blank = no class marked.
 * Months change through ?month=YYYY-MM links, so it works without JavaScript.
 */
export function AttendanceCalendar({
  month,
  today,
  days,
  hrefFor,
}: {
  month: string
  today: string
  days: { day: string; present: boolean }[]
  hrefFor: (month: string) => string
}) {
  const byDay = new Map(days.map((d) => [d.day, d.present]))
  const first = new Date(month + '-01T12:00:00Z')
  const lead = (first.getUTCDay() + 6) % 7 // Monday-first
  const count = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate()
  const present = days.filter((d) => d.present).length
  const absent = days.length - present
  const thisMonth = today.slice(0, 7)

  const cells: (string | null)[] = [...Array(lead).fill(null)]
  for (let i = 1; i <= count; i++) cells.push(`${month}-${String(i).padStart(2, '0')}`)

  return (
    <div className="panel p-5">
      <div className="flex items-center gap-4">
        <Ring value={present} total={days.length} size={68} label={`${present} of ${days.length} classes attended in ${monthLabel(month)}`} />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{monthLabel(month)}</p>
          <p className="text-sm text-muted">
            {days.length === 0 ? 'No classes marked' : `${present} present, ${absent} absent`}
          </p>
        </div>
        <div className="flex gap-1">
          <Link href={hrefFor(shiftMonth(month, -1))} scroll={false} className="btn btn-quiet h-9 min-h-0 w-9 px-0" aria-label="Previous month">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="m15 5-7 7 7 7" /></svg>
          </Link>
          {month < thisMonth ? (
            <Link href={hrefFor(shiftMonth(month, 1))} scroll={false} className="btn btn-quiet h-9 min-h-0 w-9 px-0" aria-label="Next month">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="m9 5 7 7-7 7" /></svg>
            </Link>
          ) : (
            <span className="btn btn-quiet h-9 min-h-0 w-9 px-0 opacity-40" aria-hidden>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m9 5 7 7-7 7" /></svg>
            </span>
          )}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-7 gap-1.5 text-center" role="grid" aria-label={`Attendance, ${monthLabel(month)}`}>
        {WEEKDAYS.map((w) => (
          <span key={w} className="pb-1 text-[0.7rem] font-semibold text-faint" role="columnheader">{w}</span>
        ))}
        {cells.map((d, i) => {
          if (!d) return <span key={`x${i}`} />
          const state = byDay.get(d)
          const isToday = d === today
          const n = Number(d.slice(8))
          const label = `${n} ${monthLabel(month).split(' ')[0]}: ${state === undefined ? 'no class marked' : state ? 'present' : 'absent'}`
          return (
            <span
              key={d}
              role="gridcell"
              aria-label={label}
              title={label}
              className={`flex aspect-square items-center justify-center rounded-lg text-[0.8rem] font-semibold ${
                state === true
                  ? 'bg-teal-600 text-white'
                  : state === false
                    ? 'bg-danger-soft text-danger'
                    : d > today
                      ? 'text-faint/60'
                      : 'text-muted'
              } ${isToday ? 'ring-2 ring-brass ring-offset-2 ring-offset-surface' : ''}`}
            >
              {n}
            </span>
          )
        })}
      </div>

      <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted">
        <li className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-teal-600" aria-hidden />Present</li>
        <li className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-danger-soft ring-1 ring-danger/40" aria-hidden />Absent</li>
        <li className="flex items-center gap-1.5"><span className="h-3 w-3 rounded ring-2 ring-brass" aria-hidden />Today</li>
      </ul>
    </div>
  )
}
