import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { requirePlatformAdmin } from '@/lib/platform'
import { CrmPanel } from '../../crm-panel'

export const metadata = { title: 'Lead' }

export default async function CrmAccountPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase } = await requirePlatformAdmin()
  const { data: a } = await supabase.from('crm_accounts').select('id, name, centre_id').eq('id', id).maybeSingle()
  if (!a) notFound()
  if (a.centre_id) redirect(`/admin/centres/${a.centre_id}`)
  return (
    <div className="grid gap-8">
      <header>
        <Link href="/admin/leads" className="text-sm text-muted hover:text-ink">Leads</Link>
        <h1 className="page-title mt-1">{a.name}</h1>
      </header>
      <CrmPanel supabase={supabase} accountId={a.id} />
    </div>
  )
}
