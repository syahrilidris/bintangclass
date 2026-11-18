import Link from 'next/link'
import { requirePlatformAdmin, STAGE_LABEL } from '@/lib/platform'
import { LeadForm } from '../crm-forms'

export const metadata = { title: 'Leads' }

// Centres you're talking to that haven't signed up yet (referrals, mosque visits, the website).
export default async function LeadsPage() {
  const { supabase } = await requirePlatformAdmin()
  const { data: leads } = await supabase
    .from('crm_accounts')
    .select('id, name, stage, contact_name, contact_phone, city, source, next_follow_up, updated_at')
    .is('centre_id', null)
    .order('next_follow_up', { ascending: true, nullsFirst: false })
  const today = new Date().toISOString().slice(0, 10)

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <section>
        <h1 className="page-title">Leads</h1>
        <p className="mt-1 text-muted">Centres you’re talking to that haven’t signed up yet. When one signs up, it joins All centres.</p>
        {(leads ?? []).length === 0 ? (
          <p className="panel mt-6 p-6 text-muted">No leads yet. Add the first centre you’re talking to.</p>
        ) : (
          <ul className="panel rows mt-6">
            {(leads ?? []).map((l) => (
              <li key={l.id}>
                <Link href={`/admin/crm/${l.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-4 hover:bg-paper">
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{l.name}</span>
                    <span className="text-sm text-muted">{[l.contact_name, l.contact_phone, l.city, l.source].filter(Boolean).join(', ')}</span>
                  </span>
                  <span className="text-sm">{STAGE_LABEL[l.stage]}</span>
                  {l.next_follow_up ? (
                    <span className={`text-sm ${l.next_follow_up <= today ? 'font-semibold text-danger' : 'text-muted'}`}>
                      Follow up {l.next_follow_up <= today ? 'today' : new Intl.DateTimeFormat('en-MY', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(l.next_follow_up + 'T12:00:00Z'))}
                    </span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      <aside>
        <h2 className="section-title">Add a lead</h2>
        <div className="mt-4"><LeadForm /></div>
      </aside>
    </div>
  )
}
