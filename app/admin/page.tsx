import Link from 'next/link'
import { requirePlatformAdmin, health, HEALTH_LABEL, STAGE_LABEL, PRICE_PER_STUDENT, FREE_STUDENTS, rm, type Health } from '@/lib/platform'
import { ActivityChart } from '@/components/activity-chart'
import { ago } from '@/lib/recordings'

export const metadata = { title: 'Overview' }

const HEALTH_STYLE: Record<Health, string> = {
  active: 'bg-teal-50 text-teal-700',
  new: 'bg-paper text-ink',
  quiet: 'bg-brass-soft text-[#6b5115]',
  at_risk: 'bg-danger-soft text-danger',
  paused: 'bg-paper text-muted',
}

function pct(a: number, b: number) {
  return b === 0 ? null : Math.round((a / b) * 100)
}

export default async function PlatformOverview() {
  const { supabase } = await requirePlatformAdmin()
  const [{ data: centres, error }, { data: daily }] = await Promise.all([
    supabase.rpc('platform_centre_stats'),
    supabase.rpc('platform_daily_activity', { days: 30 }),
  ])
  if (error) throw new Error(error.message)
  const all = centres ?? []

  const students = all.reduce((a, c) => a + c.active_students, 0)
  const paying = all.filter((c) => c.plan === 'centre' && c.status === 'active')
  const revenue = paying.reduce((a, c) => a + c.active_students * PRICE_PER_STUDENT, 0)
  const upgradeable = all.filter((c) => c.plan === 'free' && c.active_students > FREE_STUDENTS)
  const potential = upgradeable.reduce((a, c) => a + c.active_students * PRICE_PER_STUDENT, 0)
  const att = all.reduce((a, c) => a + c.attendance_30d, 0)
  const present = all.reduce((a, c) => a + c.present_30d, 0)
  const recs = all.reduce((a, c) => a + c.recordings_30d, 0)
  const replied = all.reduce((a, c) => a + c.replied_30d, 0)
  const withHealth = all.map((c) => ({ ...c, h: health(c) }))
  const counts = withHealth.reduce<Record<Health, number>>((m, c) => ({ ...m, [c.h]: (m[c.h] ?? 0) + 1 }), { active: 0, new: 0, quiet: 0, at_risk: 0, paused: 0 })
  const usedWeekly = counts.active
  const followUps = all.filter((c) => c.next_follow_up && c.next_follow_up <= new Date().toISOString().slice(0, 10))

  const days = (daily ?? []).map((d) => d.day)

  return (
    <div className="grid gap-10">
      <header>
        <h1 className="page-title">All centres</h1>
        <p className="mt-1 text-muted">Numbers across every centre. Children’s names and recordings stay private to each centre.</p>
      </header>

      <section aria-label="Headline numbers" className="grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Centres', value: all.length.toString(), sub: `${usedWeekly} used in the last 14 days` },
          { label: 'Active students', value: students.toLocaleString('en-MY'), sub: `${all.reduce((a, c) => a + c.parents, 0)} parents, ${all.reduce((a, c) => a + c.teachers, 0)} staff` },
          {
            label: 'Monthly revenue',
            value: rm(revenue),
            sub: potential ? `${rm(potential)} more if ${upgradeable.length} free centre${upgradeable.length === 1 ? '' : 's'} over ${FREE_STUDENTS} students upgrade` : `${paying.length} paying centre${paying.length === 1 ? '' : 's'}, ${rm(PRICE_PER_STUDENT)} per student`,
          },
          {
            label: 'Teacher reply rate',
            value: pct(replied, recs) === null ? '–' : `${pct(replied, recs)}%`,
            sub: `${replied} of ${recs} recordings answered, 30 days`,
          },
        ].map((k) => (
          <div key={k.label} className="bg-white px-5 py-5">
            <p className="text-sm text-muted">{k.label}</p>
            <p className="mt-1 text-[1.9rem] font-bold leading-tight text-navy-800">{k.value}</p>
            <p className="mt-1 text-xs text-muted">{k.sub}</p>
          </div>
        ))}
      </section>

      <section>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="section-title">Last 30 days</h2>
          <span className="text-sm text-muted">Attendance rate {pct(present, att) ?? '–'}%</span>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <ActivityChart title="Attendance marked" unit="marks" days={days} values={(daily ?? []).map((d) => d.attendance)} />
          <ActivityChart title="Recordings sent" unit="recordings" days={days} values={(daily ?? []).map((d) => d.recordings)} />
          <ActivityChart title="New centres" unit="sign-ups" days={days} values={(daily ?? []).map((d) => d.signups)} />
        </div>
      </section>

      {followUps.length ? (
        <section className="notice notice-warn">
          <strong>Follow up today:</strong>{' '}
          {followUps.map((c, i) => (
            <span key={c.centre_id}>
              {i ? ', ' : ''}
              <Link className="underline" href={`/admin/centres/${c.centre_id}`}>{c.name}</Link>
            </span>
          ))}
        </section>
      ) : null}

      <section>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="section-title">Centres</h2>
          <p className="text-sm text-muted">
            {(['active', 'new', 'quiet', 'at_risk', 'paused'] as Health[]).filter((h) => counts[h]).map((h) => `${counts[h]} ${HEALTH_LABEL[h].toLowerCase()}`).join(', ')}
          </p>
        </div>
        {all.length === 0 ? (
          <p className="panel mt-4 p-6 text-muted">No centres yet. When an owner signs up, their centre appears here and in the CRM.</p>
        ) : (
          <div className="panel mt-4 overflow-x-auto">
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
                {withHealth.map((c) => (
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
                    <td className="px-3 py-3">{c.stage ? STAGE_LABEL[c.stage] : '–'}</td>
                    <td className="px-5 py-3 text-muted">{ago(c.last_activity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
