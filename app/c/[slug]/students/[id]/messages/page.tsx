import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getCentre } from '@/lib/centre'
import { Thread, type Msg } from '@/components/thread'

export const metadata = { title: 'Messages' }

// One child's conversation between their parents and the centre.
export default async function ChildMessages({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params
  const { supabase, user, centre, isManager, role, canWrite } = await getCentre(slug)
  const root = `/c/${slug}`
  const { data: s } = await supabase.from('students').select('id, full_name, classes(name, teacher_id)').eq('id', id).maybeSingle()
  if (!s) notFound()

  const isParent = role === 'parent'
  const inConversation = isManager || isParent || s.classes?.teacher_id === user.id
  const url = `${root}/students/${id}/messages`
  const [{ data: rows }] = await Promise.all([
    supabase.from('messages').select('id, body, created_at, sender_id, sender_name, sender_role').eq('student_id', id).order('created_at', { ascending: false }).limit(200),
    supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('user_id', user.id).eq('url', url).is('read_at', null),
  ])

  return (
    <div className="grid gap-5">
      <header>
        <Link href={isParent ? root : `${root}/students/${id}`} className="text-sm text-muted hover:text-ink">← {s.full_name}</Link>
        <h1 className="page-title mt-1">Messages about {s.full_name.split(' ')[0]}</h1>
        <p className="mt-1 text-sm text-muted">
          {isParent
            ? `Between you and ${centre.name}: the class teacher, the owner and admins.`
            : `Between ${s.full_name.split(' ')[0]}’s parents and the centre.`}
        </p>
      </header>
      {inConversation ? (
        <Thread centreId={centre.id} studentId={id} me={user.id} initial={((rows ?? []) as Msg[]).reverse()} canSend={canWrite} />
      ) : (
        <p className="panel p-6 text-muted">Only {s.full_name.split(' ')[0]}’s class teacher, the owner and admins can read these messages.</p>
      )}
      {inConversation && !canWrite ? <p className="notice notice-warn">This centre is read-only for now, so new messages can’t be sent.</p> : null}
    </div>
  )
}
