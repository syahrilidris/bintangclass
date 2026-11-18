'use client'

import { useOptimistic, useState, useTransition } from 'react'
import Link from 'next/link'
import { markAttendance } from '../../actions'
import { StarTrack } from '@/components/star-track'

type Row = { id: string; full_name: string; book: string; page: number; present: boolean | null }

// One row per student; tap Present or Absent. Tapping the chosen one again clears it.
export function Attendance({
  slug,
  classId,
  day,
  rows,
  canMark,
}: {
  slug: string
  classId: string
  day: string
  rows: Row[]
  canMark: boolean
}) {
  const [optimistic, setOptimistic] = useOptimistic(rows, (state, u: { id: string; present: boolean | null }) =>
    state.map((r) => (r.id === u.id ? { ...r, present: u.present } : r)),
  )
  const [, start] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function set(id: string, present: boolean | null) {
    setError(null)
    start(async () => {
      setOptimistic({ id, present })
      const res = await markAttendance(slug, classId, id, day, present)
      if (res && 'error' in res && res.error) setError(res.error)
    })
  }

  function markAllPresent() {
    for (const r of optimistic) if (r.present === null) set(r.id, true)
  }

  const marked = optimistic.filter((r) => r.present !== null).length
  const present = optimistic.filter((r) => r.present === true).length

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {marked === 0 ? 'Nobody marked yet' : `${present} present, ${marked - present} absent`}
          {marked < optimistic.length && marked > 0 ? `, ${optimistic.length - marked} to mark` : ''}
        </p>
        {canMark && marked < optimistic.length ? (
          <button className="btn btn-quiet" onClick={markAllPresent}>Mark everyone else present</button>
        ) : null}
      </div>
      {error ? <p className="notice notice-error mt-3" role="alert">{error}</p> : null}
      <ul className="panel rows mt-4">
        {optimistic.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3.5 sm:px-5">
            <div className="min-w-0 flex-1">
              <Link href={`/c/${slug}/students/${r.id}`} className="font-semibold hover:underline">{r.full_name}</Link>
              <div className="mt-1 flex items-center gap-3">
                <StarTrack book={r.book} page={r.page} size="sm" />
                <span className="text-xs text-muted">{r.book}, p. {r.page}</span>
              </div>
            </div>
            <div className="flex gap-2" role="group" aria-label={`Attendance for ${r.full_name}`}>
              <button
                disabled={!canMark}
                aria-pressed={r.present === true}
                onClick={() => set(r.id, r.present === true ? null : true)}
                className={`btn min-w-24 ${r.present === true ? 'bg-teal-600 text-white' : 'btn-quiet'}`}
              >
                Present
              </button>
              <button
                disabled={!canMark}
                aria-pressed={r.present === false}
                onClick={() => set(r.id, r.present === false ? null : false)}
                className={`btn min-w-24 ${r.present === false ? 'bg-danger text-white' : 'btn-quiet'}`}
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
