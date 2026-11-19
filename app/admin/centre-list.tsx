import Link from 'next/link'
import { HEALTH_LABEL, STAGE_LABEL, type Health } from '@/lib/platform'
import { ago } from '@/lib/recordings'

export const HEALTH_STYLE: Record<Health, string> = {
  active: 'bg-teal-50 text-teal-700',
  new: 'bg-paper text-ink',
  quiet: 'bg-brass-soft text-brass-ink',
  at_risk: 'bg-danger-soft text-danger',
  paused: 'bg-paper text-muted',
}

function pct(a: number, b: number) {
  return b === 0 ? null : Math.round((a / b) * 100)
}

type Row = {
  centre_id: string
  name: string
  owner_name: string | null
  city: string | null
  h: Health
  active_students: number
  teachers: number
  attendance_30d: number
  present_30d: number
  recordings_30d: number
  replied_30d: number
  plan: string
  status: string
  stage: string | null
  last_activity: string
}

/** Every centre: a table on wide screens, cards on phones. */
export function CentreList({ centres, empty }: { centres: Row[]; empty: string }) {
  return (
    <>
        {centres.length === 0 ? (
          <p className="panel p-6 text-muted">{empty}</p>
        ) : (
          <div className="panel hidden overflow-x-auto md:block">
            <table className="w-full min-w-[52rem] text-left text-sm">
              <thead className="border-b border-line text-xs text-muted">
                <tr>
                  <th className="px-5 py-3 font-semibold">Centre</th>
                  <th className="px-3 py-3 font-semibold">Health</th>
                  <th className="px-3 py-3 text-right font-semibold">Students</th>
                  <th className="px-3 py-3 text-right font-semibold">Staff</th>
                  <th className="px-3 py-3 text-right font-semibold">Attendance, 30d</th>
                  <th className="px-3 py-3 text-right font-semibold">Recordings, 30d</th>
                  <th className="px-3 py-3 font-semibold">Plan</th>
                  <th className="px-3 py-3 font-semibold">CRM</th>
                  <th className="px-5 py-3 font-semibold">Last activity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {centres.map((c) => (
                  <tr key={c.centre_id} className="hover:bg-paper">
                    <td className="px-5 py-3">
                      <Link href={`/admin/centres/${c.centre_id}`} className="font-semibold hover:underline">{c.name}</Link>
                      <span className="block text-xs text-muted">{[c.owner_name, c.city].filter(Boolean).join(', ')}</span>
                    </td>
                    <td className="px-3 py-3"><span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${HEALTH_STYLE[c.h]}`}>{HEALTH_LABEL[c.h]}</span></td>
                    <td className="px-3 py-3 text-right tabular-nums">{c.active_students}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{c.teachers}</td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {c.attendance_30d}
                      {c.attendance_30d ? <span className="text-xs text-muted"> ({pct(c.present_30d, c.attendance_30d)}%)</span> : null}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {c.recordings_30d}
                      {c.recordings_30d ? <span className="text-xs text-muted"> ({c.replied_30d} replied)</span> : null}
                    </td>
                    <td className="px-3 py-3">
                      {c.plan === 'centre' ? 'Paid' : 'Free'}
                      {c.status !== 'active' ? <span className="block text-xs text-danger">{c.status === 'read_only' ? 'Read-only' : 'Closed'}</span> : null}
                    </td>
                    <td className="px-3 py-3">{c.stage ? STAGE_LABEL[c.stage as keyof typeof STAGE_LABEL] : '–'}</td>
                    <td className="px-5 py-3 text-muted">{ago(c.last_activity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {centres.length ? (
          <ul className="grid gap-3 md:hidden">
            {centres.map((c) => (
              <li key={c.centre_id}>
                <Link href={`/admin/centres/${c.centre_id}`} className="panel block p-4 active:scale-[0.99]">
                  <span className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block font-semibold leading-snug">{c.name}</span>
                      <span className="block truncate text-xs text-muted">{[c.owner_name, c.city].filter(Boolean).join(', ') || 'No owner name yet'}</span>
                    </span>
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${HEALTH_STYLE[c.h]}`}>{HEALTH_LABEL[c.h]}</span>
                  </span>
                  <span className="mt-3 grid grid-cols-3 gap-2 text-center">
                    <span className="rounded-lg bg-paper px-2 py-2">
                      <span className="block font-bold tabular-nums text-strong">{c.active_students}</span>
                      <span className="text-[0.7rem] text-muted">students</span>
                    </span>
                    <span className="rounded-lg bg-paper px-2 py-2">
                      <span className="block font-bold tabular-nums text-strong">{c.attendance_30d ? `${pct(c.present_30d, c.attendance_30d)}%` : '–'}</span>
                      <span className="text-[0.7rem] text-muted">attendance</span>
                    </span>
                    <span className="rounded-lg bg-paper px-2 py-2">
                      <span className="block font-bold tabular-nums text-strong">{c.recordings_30d}</span>
                      <span className="text-[0.7rem] text-muted">recordings</span>
                    </span>
                  </span>
                  <span className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-muted">
                    <span>
                      {c.plan === 'centre' ? 'Paid' : 'Free'}
                      {c.status !== 'active' ? <span className="text-danger">, {c.status === 'read_only' ? 'Read-only' : 'Closed'}</span> : null}
                      {c.stage ? `, ${STAGE_LABEL[c.stage as keyof typeof STAGE_LABEL]}` : ''}
                    </span>
                    <span>Active {ago(c.last_activity)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
    </>
  )
}
