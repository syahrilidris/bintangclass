import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getCentre, todayMY } from '@/lib/centre'
import { loadPeople } from '@/lib/people'
import { StarTrack } from '@/components/star-track'
import { InviteForm } from '@/components/invite-form'
import { ProgressForm } from './progress-form'
import { StudentForm } from '../student-form'

export const metadata = { title: 'Student' }

function shortDate(iso: string) {
  return new Intl.DateTimeFormat('en-MY', { day: 'numeric', month: 'short', timeZone: 'Asia/Kuala_Lumpur' }).format(new Date(iso))
}

export default async function StudentPage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params
  const { supabase, centre, isManager, isStaff, canWrite, user } = await getCentre(slug)
  const root = `/c/${slug}`

  const { data: s } = await supabase
    .from('students')
    .select('*, classes(id, name, teacher_id)')
    .eq('id', id)
    .eq('centre_id', centre.id)
    .maybeSingle()
  if (!s) notFound()

  const since = new Date(todayMY() + 'T00:00:00Z')
  since.setUTCDate(since.getUTCDate() - 55)
  const [{ data: progress }, { data: att }, { data: guardians }, { data: classes }, people] = await Promise.all([
    supabase.from('progress').select('id, book, page, note, by_user, created_at').eq('student_id', id).order('created_at', { ascending: false }).limit(30),
    supabase.from('attendance').select('day, present').eq('student_id', id).gte('day', since.toISOString().slice(0, 10)).order('day'),
    isStaff ? supabase.from('guardians').select('user_id').eq('student_id', id) : Promise.resolve({ data: [] as { user_id: string }[] }),
    isManager ? supabase.from('classes').select('id, name').eq('centre_id', centre.id).order('name') : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    loadPeople(supabase, centre.id),
  ])

  const canRecord = canWrite && (isManager || s.classes?.teacher_id === user.id)
  const presentCount = (att ?? []).filter((a) => a.present).length

  return (
    <div className="grid gap-10">
      <header className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div>
          {isStaff ? <Link href={`${root}/students`} className="text-sm text-muted hover:text-ink">Students</Link> : <Link href={root} className="text-sm text-muted hover:text-ink">My children</Link>}
          <h1 className="page-title mt-1">{s.full_name}</h1>
          <p className="mt-1 text-muted">
            {s.classes ? (isStaff ? <Link className="link" href={`${root}/classes/${s.classes.id}`}>{s.classes.name}</Link> : s.classes.name) : 'No class yet'}
            {s.status === 'left' ? ', has left the centre' : ''}
          </p>
        </div>
        <div className="panel px-6 py-5">
          <p className="text-sm text-muted">Reading now</p>
          <p className="mt-0.5 text-[1.5rem] font-bold text-navy-800">{s.book}, page {s.page}</p>
          <div className="mt-4"><StarTrack book={s.book} page={s.page} size="lg" /></div>
        </div>
      </header>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="grid content-start gap-10">
          <section>
            <h2 className="section-title">Progress</h2>
            {(progress ?? []).length === 0 ? (
              <p className="mt-3 text-muted">No progress recorded yet.</p>
            ) : (
              <ol className="mt-4 border-l-2 border-line pl-5">
                {(progress ?? []).map((p) => (
                  <li key={p.id} className="relative pb-5 last:pb-0">
                    <span className="absolute -left-[1.6rem] top-1.5 h-2.5 w-2.5 rounded-full bg-brass ring-4 ring-paper" aria-hidden />
                    <p className="font-semibold">{p.book}, page {p.page}</p>
                    {p.note ? <p className="mt-0.5 text-ink/80">“{p.note}”</p> : null}
                    <p className="mt-0.5 text-xs text-faint">
                      {shortDate(p.created_at)}{p.by_user && people.get(p.by_user) ? `, ${people.get(p.by_user)!.name}` : ''}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section>
            <div className="flex items-baseline justify-between">
              <h2 className="section-title">Attendance, last 8 weeks</h2>
              <span className="text-sm text-muted">{presentCount} of {(att ?? []).length} classes</span>
            </div>
            {(att ?? []).length === 0 ? (
              <p className="mt-3 text-muted">No attendance marked yet.</p>
            ) : (
              <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Attendance by day">
                {(att ?? []).map((a) => (
                  <li
                    key={a.day}
                    title={`${a.day}: ${a.present ? 'present' : 'absent'}`}
                    className={`h-7 w-7 rounded-md text-center text-[0.65rem] font-semibold leading-7 ${a.present ? 'bg-teal-600 text-white' : 'bg-danger-soft text-danger'}`}
                  >
                    {Number(a.day.slice(8))}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {isStaff ? (
            <section>
              <h2 className="section-title">Parents</h2>
              {(guardians ?? []).length === 0 ? (
                <p className="mt-3 text-muted">No parent linked yet.</p>
              ) : (
                <ul className="mt-3 grid gap-1">
                  {(guardians ?? []).map((g) => <li key={g.user_id}>{people.get(g.user_id)?.name ?? 'Parent'}</li>)}
                </ul>
              )}
              {isManager && canWrite ? (
                <div className="mt-5 max-w-md">
                  <h3 className="font-semibold">Invite a parent</h3>
                  <p className="mb-4 text-sm text-muted">They’ll see {s.full_name.split(' ')[0]}’s level, attendance and your notes.</p>
                  <InviteForm slug={slug} centreName={centre.name} roles={['parent']} studentId={s.id} childName={s.full_name.split(' ')[0]} />
                </div>
              ) : null}
            </section>
          ) : null}
        </div>

        <aside className="grid content-start gap-10">
          {canRecord ? (
            <section>
              <h2 className="section-title">Record progress</h2>
              <div className="mt-4"><ProgressForm slug={slug} studentId={s.id} book={s.book} page={s.page} /></div>
            </section>
          ) : null}
          {isManager && canWrite ? (
            <section>
              <h2 className="section-title">Details</h2>
              <div className="mt-4">
                <StudentForm slug={slug} classes={classes ?? []} initial={s} />
              </div>
            </section>
          ) : null}
        </aside>
      </div>
    </div>
  )
}
