import Link from 'next/link'
import { requirePlatformAdmin, health, HEALTH_LABEL, type Health } from '@/lib/platform'
import { CentreList } from '../centre-list'

export const metadata = { title: 'Centres' }

const ORDER: Health[] = ['at_risk', 'quiet', 'new', 'active', 'paused']

// Every centre on the platform, searchable and filtered by health. Opens the centre's numbers and CRM.
export default async function AdminCentres({ searchParams }: { searchParams: Promise<{ q?: string; health?: string }> }) {
  const { q = '', health: hf } = await searchParams
  const { supabase } = await requirePlatformAdmin()
  const { data, error } = await supabase.rpc('platform_centre_stats')
  if (error) throw new Error(error.message)
  const all = (data ?? []).map((c) => ({ ...c, h: health(c) }))
  const filter = ORDER.includes(hf as Health) ? (hf as Health) : null
  const needle = q.trim().toLowerCase()
  const shown = all
    .filter((c) => !filter || c.h === filter)
    .filter((c) => !needle || [c.name, c.owner_name, c.city].some((v) => v?.toLowerCase().includes(needle)))
  const count = (h: Health) => all.filter((c) => c.h === h).length
  const href = (h: Health | null) => {
    const p = new URLSearchParams()
    if (q) p.set('q', q)
    if (h) p.set('health', h)
    const s = p.toString()
    return `/admin/centres${s ? `?${s}` : ''}`
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <header>
        <h1 className="page-title">Centres</h1>
        <p className="mt-1 text-muted">{all.length} on the platform. Tap one for its numbers, plan and CRM.</p>
      </header>

      <form className="flex gap-2" role="search">
        {filter ? <input type="hidden" name="health" value={filter} /> : null}
        <input className="input" type="search" name="q" defaultValue={q} placeholder="Search by centre, owner or town" aria-label="Search centres" />
        <button className="btn btn-quiet shrink-0">Search</button>
      </form>

      <nav aria-label="Filter by health" className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 md:mx-0 md:flex-wrap md:px-0">
        <Link href={href(null)} scroll={false} aria-current={!filter ? 'true' : undefined} className={`chip shrink-0 ${!filter ? 'chip-on' : ''}`}>{`All ${all.length}`}</Link>
        {ORDER.filter((h) => count(h)).map((h) => (
          <Link key={h} href={href(h)} scroll={false} aria-current={filter === h ? 'true' : undefined} className={`chip shrink-0 ${filter === h ? 'chip-on' : ''}`}>
            {`${HEALTH_LABEL[h]} ${count(h)}`}
          </Link>
        ))}
      </nav>

      <section aria-label="Centre list">
        <CentreList centres={shown} empty={needle || filter ? 'No centres match. Try another search or filter.' : 'No centres yet.'} />
      </section>
    </div>
  )
}
