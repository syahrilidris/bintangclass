import Link from 'next/link'
import { getCentre } from '@/lib/centre'
import { ago } from '@/lib/recordings'
import { PushToggle } from '@/components/push'

export const metadata = { title: 'Notifications' }

const KIND: Record<string, { label: string; tone: string; icon: React.ReactNode }> = {
  recording: { label: 'Recording', tone: 'bg-brass-soft text-brass-ink', icon: <><rect x="9" y="3.5" width="6" height="11" rx="3" /><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v2.5" /></> },
  reply: { label: 'Reply', tone: 'bg-teal-50 text-teal-700', icon: <path d="M4 5.5h16v10H9l-5 4z" /> },
  practice: { label: 'Practice', tone: 'bg-solid/10 text-strong dark:bg-white/10', icon: <><path d="M8 4.5h8M6.5 6.5h11v13h-11z" /><path d="m9.5 13 2 2 3.5-4" /></> },
  progress: { label: 'Progress', tone: 'bg-teal-50 text-teal-700', icon: <path d="M12 3l2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 15.4 7.2 18l.9-5.4L4.2 8.7l5.4-.8z" /> },
}

// Everything new for the signed-in person at this centre. Opening the page marks it all as seen.
export default async function NotificationsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { supabase, user, centre } = await getCentre(slug)
  const { data } = await supabase
    .from('notifications')
    .select('id, kind, title, body, url, created_at, read_at')
    .eq('centre_id', centre.id)
    .order('created_at', { ascending: false })
    .limit(60)
  const items = data ?? []
  if (items.some((n) => !n.read_at)) {
    await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('centre_id', centre.id).eq('user_id', user.id).is('read_at', null)
  }

  return (
    <div className="grid gap-6">
      <header>
        <h1 className="page-title">Notifications</h1>
        <p className="mt-1 text-muted">New recordings, replies, practice and progress at {centre.name}.</p>
      </header>

      <PushToggle />

      {items.length === 0 ? (
        <p className="panel p-6 text-muted">Nothing yet. When there’s a new recording, reply, practice or progress, it shows here.</p>
      ) : (
        <ul className="panel rows overflow-hidden" aria-label="Notifications">
          {items.map((n) => {
            const k = KIND[n.kind] ?? KIND.reply
            return (
              <li key={n.id}>
                <Link href={n.url} className={`flex items-start gap-4 px-5 py-4 hover:bg-paper ${n.read_at ? '' : 'bg-teal-50/40'}`}>
                  <span className={`tile-icon h-10 w-10 shrink-0 ${k.tone}`}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{k.icon}</svg>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-3">
                      <span className="font-semibold leading-snug">{n.title}</span>
                      {!n.read_at ? <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-brass" aria-label="New" /> : null}
                    </span>
                    {n.body ? <span className="mt-0.5 block text-sm text-muted">{n.body}</span> : null}
                    <span className="mt-1 block text-xs text-faint">{ago(n.created_at)}</span>
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
