import Link from 'next/link'
import { requirePlatformAdmin, health, HEALTH_LABEL, PRICE_PER_STUDENT, FREE_STUDENTS, rm, type Health } from '@/lib/platform'
import { ActivityChart } from '@/components/activity-chart'
import { CentreList } from './centre-list'

export const metadata = { title: 'Overview' }


function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? '' : 's'}`
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
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8 md:gap-10">
      <header>
        <h1 className="page-title">All centres</h1>
        <p className="mt-1 text-muted">Numbers across every centre. Children’s names and recordings stay private to each centre.</p>
      </header>

      <section aria-label="Headline numbers" className="grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius-card)] border border-line bg-line shadow-[var(--shadow-card)] lg:grid-cols-4">
        {[
          { label: 'Centres', value: all.length.toString(), sub: `${usedWeekly} used in the last 14 days` },
          { label: 'Active students', value: students.toLocaleString('en-MY'), sub: plural(all.reduce((a, c) => a + c.parents, 0), 'parent') + ', ' + plural(all.reduce((a, c) => a + c.teachers, 0), 'staff member') },
          {
            label: 'Monthly revenue',
            value: rm(revenue),
            sub: potential ? `${rm(potential)} more if ${upgradeable.length} free centre${upgradeable.length === 1 ? '' : 's'} over ${FREE_STUDENTS} students upgrade` : `${paying.length} paying centre${paying.length === 1 ? '' : 's'}, ${rm(PRICE_PER_STUDENT)} per student`,
          },
          {
            label: 'Teacher reply rate',
            value: pct(replied, recs) === null ? '–' : `${pct(replied, recs)}%`,
            sub: `${replied} of ${plural(recs, 'recording')} answered, 30 days`,
          },
        ].map((k) => (
          <div key={k.label} className="bg-surface px-4 py-4 sm:px-5 sm:py-5">
            <p className="text-xs text-muted sm:text-sm">{k.label}</p>
            <p className="mt-1 text-[1.45rem] font-bold leading-tight text-strong sm:text-[1.9rem]">{k.value}</p>
            <p className="mt-1 text-xs text-muted">{k.sub}</p>
          </div>
        ))}
      </section>

      <section>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="section-title">Last 30 days</h2>
          <span className="text-sm text-muted">Attendance rate {pct(present, att) ?? '–'}%</span>
        </div>
        <div className="-mx-5 mt-4 flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto px-5 pb-2 md:mx-0 md:grid md:grid-cols-3 md:gap-4 md:overflow-visible md:px-0 md:pb-0 [&>*]:w-[82%] [&>*]:shrink-0 [&>*]:snap-start md:[&>*]:w-auto">
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
        <div className="mt-4" />
        <CentreList centres={withHealth} empty="No centres yet. When an owner signs up, their centre appears here and in the CRM." />
      </section>
    </div>
  )
}
