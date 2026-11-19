import { notFound } from 'next/navigation'
import { getCentre } from '@/lib/centre'
import { CentreForm } from './centre-form'

export const metadata = { title: 'Settings' }

export default async function SettingsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { supabase, centre, role, canWrite } = await getCentre(slug)
  if (role !== 'owner') notFound()
  const { count } = await supabase.from('students').select('id', { count: 'exact', head: true }).eq('centre_id', centre.id).eq('status', 'active')

  return (
    <div className="grid max-w-xl gap-10">
      <h1 className="page-title">Settings</h1>
      <section>
        <h2 className="section-title">Centre details</h2>
        <div className="mt-4">
          {canWrite ? <CentreForm slug={slug} centre={centre} /> : <p className="text-muted">Details can’t be changed while the centre is {centre.status.replace('_', '-')}.</p>}
        </div>
      </section>
      <section>
        <h2 className="section-title">Plan</h2>
        <div className="panel mt-4 p-5">
          <p className="font-semibold">{centre.plan === 'free' ? 'Free plan' : 'Centre plan'}</p>
          <p className="mt-1 text-sm text-muted">
            {centre.plan === 'free'
              ? `${count ?? 0} of 10 active students. Larger centres will move to RM4 per active student a month once paid plans open after the pilot.`
              : `${count ?? 0} active students, billed monthly.`}
          </p>
        </div>
      </section>
    </div>
  )
}
