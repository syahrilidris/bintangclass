'use client'

import { useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { markAttendance } from '../../actions'
import { StarTrack } from '@/components/star-track'
import { isNetworkError, listMarks, onQueueChange, queueMark } from '@/lib/offline-queue'

type Row = { id: string; full_name: string; book: string; page: number; present: boolean | null }

// One row per student; tap Present or Absent. Tapping the chosen one again clears it.
// With no signal, marks are kept on the phone and sent automatically when it's back.
export function Attendance({
  slug,
  centreId,
  classId,
  day,
  rows,
  canMark,
}: {
  slug: string
  centreId: string
  classId: string
  day: string
  rows: Row[]
  canMark: boolean
}) {
  const [local, setLocal] = useState<Record<string, boolean | null>>({})
  const [waiting, setWaiting] = useState<Set<string>>(new Set())
  const [saving, start] = useTransition()
  const [touched, setTouched] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Marks still waiting on this phone for this class and day.
  useEffect(() => {
    const ids = new Set(rows.map((r) => r.id))
    async function load() {
      try {
        const q = (await listMarks()).filter((m) => m.day === day && ids.has(m.studentId))
        setWaiting(new Set(q.map((m) => m.studentId)))
        if (q.length) setLocal((cur) => ({ ...Object.fromEntries(q.map((m) => [m.studentId, m.present])), ...cur }))
      } catch {}
    }
    load()
    return onQueueChange(load)
  }, [rows, day])

  const view = rows.map((r) => (r.id in local ? { ...r, present: local[r.id] } : r))

  function set(id: string, present: boolean | null) {
    setError(null)
    setTouched(true)
    setLocal((cur) => ({ ...cur, [id]: present }))
    start(async () => {
      const keep = () => queueMark({ centreId, classId, studentId: id, day, present })
      if (!navigator.onLine) return keep()
      try {
        const res = await markAttendance(slug, classId, id, day, present)
        if (res && 'error' in res && res.error) {
          setError(res.error)
          setLocal((cur) => {
            const next = { ...cur }
            delete next[id]
            return next
          })
        }
      } catch (e) {
        if (isNetworkError(e)) return keep()
        setError('Couldn’t save. Try again.')
      }
    })
  }

  function markAllPresent() {
    for (const r of view) if (r.present === null) set(r.id, true)
  }

  const marked = view.filter((r) => r.present !== null).length
  const present = view.filter((r) => r.present === true).length
  const optimistic = view

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {marked === 0 ? 'Nobody marked yet' : `${present} present, ${marked - present} absent`}
          {marked < optimistic.length && marked > 0 ? `, ${optimistic.length - marked} to mark` : ''}
          <span aria-live="polite" className={`ml-2 text-xs font-semibold ${waiting.size ? 'text-brass-ink' : saving ? 'text-faint' : 'text-teal-700'}`}>
            {waiting.size ? 'Saved on this phone, sends when online' : touched ? (saving ? 'Saving…' : 'Saved') : ''}
          </span>
        </p>
        {canMark && marked < optimistic.length ? (
          <button className="btn btn-quiet" onClick={markAllPresent}>Mark everyone else present</button>
        ) : null}
      </div>
      {error ? <p className="notice notice-error mt-3" role="alert">{error}</p> : null}
      <ul className="panel rows mt-4">
        {optimistic.map((r) => (
          <li key={r.id} className="grid gap-3 px-4 py-3.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-5">
            <div className="min-w-0">
              <Link href={`/c/${slug}/students/${r.id}`} className="font-semibold hover:underline">{r.full_name}</Link>
              {waiting.has(r.id) ? <span className="ml-2 rounded-full bg-brass-soft px-2 py-0.5 text-[0.7rem] font-semibold text-brass-ink">Not sent yet</span> : null}
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                <StarTrack book={r.book} page={r.page} size="sm" />
                <span className="text-xs text-muted">{r.book}, p. {r.page}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex" role="group" aria-label={`Attendance for ${r.full_name}`}>
              <button
                disabled={!canMark}
                aria-pressed={r.present === true}
                onClick={() => set(r.id, r.present === true ? null : true)}
                className={`btn sm:min-w-24 ${r.present === true ? 'bg-teal-600 text-white' : 'btn-quiet'}`}
              >
                Present
              </button>
              <button
                disabled={!canMark}
                aria-pressed={r.present === false}
                onClick={() => set(r.id, r.present === false ? null : false)}
                className={`btn sm:min-w-24 ${r.present === false ? 'bg-danger-solid text-white' : 'btn-quiet'}`}
              >
                Absent
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
