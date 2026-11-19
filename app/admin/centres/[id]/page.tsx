import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requirePlatformAdmin, health, HEALTH_LABEL, PRICE_PER_STUDENT, rm } from '@/lib/platform'
import { ago } from '@/lib/recordings'
import { PlanForm } from '../../crm-forms'
import { CrmPanel } from '../../crm-panel'

export const metadata = { title: 'Centre' }

export default async function AdminCentrePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase } = await requirePlatformAdmin()
  const { data: all } = await supabase.rpc('platform_centre_stats')
  const c = (all ?? []).find((x) => x.centre_id === id)
  if (!c) notFound()
  const { data: acct } = await supabase.from('crm_accounts').select('id').eq('centre_id', id).maybeSingle()
  const h = health(c)
  const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : '–')

  return (
    <div className="grid gap-10">
      <header>
        <Link href="/admin" className="text-sm text-muted hover:text-ink">All centres</Link>
        <h1 className="page-title mt-1 break-words">{c.name}</h1>
        <p className="mt-1 break-words text-sm text-muted sm:text-base">
          {[c.owner_name ? `Owner: ${c.owner_name}` : null, c.city, `joined ${ago(c.created_at)}`, `/c/${c.slug}`].filter(Boolean).join(', ')}
        </p>
      </header>

      <section aria-label="Usage" className="grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius-card)] border border-line bg-line shadow-[var(--shadow-card)] sm:grid-cols-3 lg:grid-cols-6">
        {[
          ['Health', HEALTH_LABEL[h]],
          ['Active students', String(c.active_students)],
          ['Classes', String(c.classes)],
          ['Staff, parents', `${c.teachers}, ${c.parents}`],
          ['Attendance, 30d', `${c.attendance_30d} (${pct(c.present_30d, c.attendance_30d)} present)`],
          ['Recordings, 30d', `${c.recordings_30d} (${c.replied_30d} replied)`],
        ].map(([k, v]) => (
          <div key={k} className="bg-surface px-4 py-4">
            <p className="text-xs text-muted">{k}</p>
            <p className="mt-1 font-bold leading-snug text-strong">{v}</p>
          </div>
        ))}
      </section>
      <p className="-mt-6 text-sm text-muted">
        Progress updates in 30 days: {c.progress_30d}. Last activity {ago(c.last_activity)}. Children’s names and recordings are
        visible only inside the centre.
      </p>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div>
          <h2 className="section-title">Plan and access</h2>
          <p className="mt-1 text-sm text-muted">
            On the paid plan this centre would be {rm(c.active_students * PRICE_PER_STUDENT)} a month. Read-only keeps everything but stops
            changes, for unpaid accounts after the grace period.
          </p>
          <div className="mt-4"><PlanForm centreId={c.centre_id} plan={c.plan} status={c.status} /></div>
        </div>
      </section>

      {acct ? (
        <div className="border-t border-line pt-8">
          <CrmPanel supabase={supabase} accountId={acct.id} />
        </div>
      ) : null}
    </div>
  )
}
