import Link from 'next/link'
import { getCentre } from '@/lib/centre'
import { ago } from '@/lib/recordings'
import { initials } from '@/lib/people'

export const metadata = { title: 'Messages' }

// Every conversation this person is in, newest first. Parents also see their children with no messages yet.
export default async function MessagesInbox({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { supabase, user, centre, role } = await getCentre(slug)
  const root = `/c/${slug}`
  const isParent = role === 'parent'

  const [{ data: msgs }, { data: unread }, { data: kids }] = await Promise.all([
    supabase.from('messages').select('student_id, body, created_at, sender_id, sender_name').eq('centre_id', centre.id).order('created_at', { ascending: false }).limit(400),
    supabase.from('notifications').select('url').eq('centre_id', centre.id).eq('kind', 'message').is('read_at', null),
    isParent ? supabase.from('students').select('id, full_name').eq('centre_id', centre.id).order('full_name') : Promise.resolve({ data: [] as { id: string; full_name: string }[] }),
  ])

  const latest = new Map<string, NonNullable<typeof msgs>[number]>()
  for (const m of msgs ?? []) if (!latest.has(m.student_id)) latest.set(m.student_id, m)
  const ids = [...new Set([...latest.keys(), ...(kids ?? []).map((k) => k.id)])]
  const { data: names } = ids.length ? await supabase.from('students').select('id, full_name, classes(name)').in('id', ids) : { data: [] }
  const byId = new Map((names ?? []).map((n) => [n.id, n]))
  const unreadBy = new Map<string, number>()
  for (const n of unread ?? []) {
    const sid = n.url.split('/students/')[1]?.split('/')[0]
    if (sid) unreadBy.set(sid, (unreadBy.get(sid) ?? 0) + 1)
  }
  const threads = ids
    .map((id) => ({ id, s: byId.get(id), last: latest.get(id), unread: unreadBy.get(id) ?? 0 }))
    .filter((t) => t.s)
    .sort((a, b) => (b.last?.created_at ?? '').localeCompare(a.last?.created_at ?? ''))

  return (
    <div className="grid gap-6">
      <header>
        <h1 className="page-title">Messages</h1>
        <p className="mt-1 text-muted">
          {isParent ? 'Talk to the teacher about your child.' : 'Conversations with parents, one per child. To start one, open the child from Students and tap Messages.'}
        </p>
      </header>
      {threads.length === 0 ? (
        <p className="panel p-6 text-muted">No messages yet. When a parent writes about their child, it shows here.</p>
      ) : (
        <ul className="panel rows overflow-hidden" aria-label="Conversations">
          {threads.map((t) => (
            <li key={t.id}>
              <Link href={`${root}/students/${t.id}/messages`} className="flex items-center gap-4 px-5 py-4 hover:bg-paper">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-teal-50 text-sm font-bold text-teal-700">{initials(t.s!.full_name)}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="truncate font-semibold">{t.s!.full_name}</span>
                    {t.last ? <span className="shrink-0 text-xs text-faint">{ago(t.last.created_at)}</span> : null}
                  </span>
                  <span className="flex items-center justify-between gap-3">
                    <span className={`truncate text-sm ${t.unread ? 'font-semibold text-ink' : 'text-muted'}`}>
                      {t.last ? `${t.last.sender_id === user.id ? 'You' : (t.last.sender_name ?? 'Someone')}: ${t.last.body}` : `${t.s!.classes?.name ?? ''} · Start a conversation`}
                    </span>
                    {t.unread ? <span className="shrink-0 rounded-full bg-brass px-2 text-xs font-bold text-navy-950">{t.unread}</span> : null}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
