import { notFound } from 'next/navigation'
import { getCentre, ROLE_LABEL, type Role } from '@/lib/centre'
import { loadPeople, initials } from '@/lib/people'
import { InviteForm, ShareInvite } from '@/components/invite-form'
import { inviteMessage } from '@/lib/invite'
import { getOrigin } from '@/lib/origin'
import { changeRole, removeMember, revokeInvite } from '../actions'

export const metadata = { title: 'People' }

const ORDER: Role[] = ['owner', 'admin', 'teacher', 'parent']
const GROUP: Record<Role, string> = { owner: 'Owner', admin: 'Admins', teacher: 'Teachers', parent: 'Parents' }

export default async function PeoplePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { supabase, centre, role: myRole, user, isManager, canWrite } = await getCentre(slug)
  if (!isManager) notFound()

  const [people, { data: invites }, { data: links }, origin] = await Promise.all([
    loadPeople(supabase, centre.id),
    supabase.from('invites').select('id, email, role, token, expires_at, students(full_name)').eq('centre_id', centre.id).is('accepted_at', null).order('created_at', { ascending: false }),
    supabase.from('guardians').select('user_id, students(full_name)').eq('centre_id', centre.id),
    getOrigin(),
  ])
  const childrenOf = new Map<string, string[]>()
  for (const l of links ?? []) if (l.students) childrenOf.set(l.user_id, [...(childrenOf.get(l.user_id) ?? []), l.students.full_name])
  const now = new Date().toISOString()
  const pending = (invites ?? []).filter((i) => i.expires_at > now)
  const canManage = (r: Role) => r === 'teacher' || r === 'parent' ? true : r === 'admin' && myRole === 'owner'

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="grid content-start gap-10">
        <h1 className="page-title">People</h1>

        {ORDER.map((r) => {
          const group = [...people.values()].filter((p) => p.role === r)
          if (group.length === 0) return null
          return (
            <section key={r}>
              <h2 className="section-title">{GROUP[r]} <span className="font-normal text-faint">{group.length}</span></h2>
              <ul className="panel rows mt-3">
                {group.map((p) => (
                  <li key={p.user_id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-solid text-xs font-bold text-white" aria-hidden>
                      {initials(p.name) || '?'}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{p.name}{p.user_id === user.id ? <span className="font-normal text-faint"> (you)</span> : null}</span>
                      <span className="text-sm text-muted">
                        {r === 'parent'
                          ? (childrenOf.get(p.user_id)?.join(', ') ?? 'No child linked')
                          : [p.main_contact ? 'Main contact' : null, p.billing_contact ? 'Billing contact' : null].filter(Boolean).join(', ') || ROLE_LABEL[r]}
                      </span>
                    </span>
                    {canWrite && p.user_id !== user.id && canManage(r) ? (
                      <span className="flex items-center gap-2">
                        {r === 'teacher' && myRole === 'owner' ? (
                          <form action={changeRole}>
                            <input type="hidden" name="slug" value={slug} />
                            <input type="hidden" name="user_id" value={p.user_id} />
                            <input type="hidden" name="role" value="admin" />
                            <button className="text-sm font-semibold text-teal-700 hover:underline">Make admin</button>
                          </form>
                        ) : null}
                        {r === 'admin' ? (
                          <form action={changeRole}>
                            <input type="hidden" name="slug" value={slug} />
                            <input type="hidden" name="user_id" value={p.user_id} />
                            <input type="hidden" name="role" value="teacher" />
                            <button className="text-sm font-semibold text-teal-700 hover:underline">Make teacher</button>
                          </form>
                        ) : null}
                        <details className="relative">
                          <summary className="cursor-pointer list-none text-sm font-semibold text-danger hover:underline">Remove</summary>
                          <div className="absolute right-0 top-7 z-10 w-64 rounded-xl border border-line bg-raised p-4 shadow-lg">
                            <p className="text-sm">
                              {p.name} will lose access to {centre.name}
                              {r === 'parent' ? ' and their child’s records' : ''}. You can invite them again later.
                            </p>
                            <form action={removeMember} className="mt-3">
                              <input type="hidden" name="slug" value={slug} />
                              <input type="hidden" name="user_id" value={p.user_id} />
                              <button className="btn btn-danger w-full">Remove {p.name.split(' ')[0]}</button>
                            </form>
                          </div>
                        </details>
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          )
        })}

        {pending.length > 0 ? (
          <section>
            <h2 className="section-title">Waiting to join <span className="font-normal text-faint">{pending.length}</span></h2>
            <ul className="panel rows mt-3">
              {pending.map((i) => {
                const link = `${origin}/invite/${i.token}`
                return (
                  <li key={i.id} className="px-5 py-4">
                    <details>
                      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-4 gap-y-1">
                        <span className="min-w-0 flex-1">
                          <span className="block font-semibold">{i.email}</span>
                          <span className="text-sm text-muted">
                            {ROLE_LABEL[i.role as Role]}{i.students ? ` of ${i.students.full_name}` : ''}, expires{' '}
                            {new Intl.DateTimeFormat('en-MY', { day: 'numeric', month: 'short' }).format(new Date(i.expires_at))}
                          </span>
                        </span>
                        <span className="text-sm font-semibold text-teal-700">Share link</span>
                      </summary>
                      <div className="mt-4 grid gap-3">
                        <ShareInvite link={link} message={inviteMessage(centre.name, i.role, link, i.students?.full_name.split(' ')[0])} />
                        <form action={revokeInvite}>
                          <input type="hidden" name="slug" value={slug} />
                          <input type="hidden" name="id" value={i.id} />
                          <button className="text-sm font-semibold text-danger hover:underline">Cancel invitation</button>
                        </form>
                      </div>
                    </details>
                  </li>
                )
              })}
            </ul>
          </section>
        ) : null}
      </div>

      {canWrite ? (
        <aside>
          <h2 className="section-title">Invite someone</h2>
          <p className="mt-1 text-sm text-muted">To link a parent to their child, open the child’s page and invite from there.</p>
          <div className="mt-4">
            <InviteForm slug={slug} centreName={centre.name} roles={myRole === 'owner' ? ['teacher', 'admin'] : ['teacher']} />
          </div>
        </aside>
      ) : null}
    </div>
  )
}
