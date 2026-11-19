import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getCentre, todayMY } from '@/lib/centre'
import { loadPeople } from '@/lib/people'
import { StarTrack } from '@/components/star-track'
import { InviteForm } from '@/components/invite-form'
import { ProgressForm } from './progress-form'
import { StudentForm } from '../student-form'
import { Recorder } from '@/components/recorder'
import { RecordingHead, Reply, type Submission } from '@/components/practice'
import { ReplyForm } from '../../practice/reply-form'
import { removeSubmission } from '../../practice/actions'
import { playbackUrls } from '@/lib/recordings'
import { greetingName } from '@/lib/centre'
import { AttendanceCalendar, isMonth } from '@/components/attendance-calendar'

export const metadata = { title: 'Student' }

function shortDate(iso: string) {
  return new Intl.DateTimeFormat('en-MY', { day: 'numeric', month: 'short', timeZone: 'Asia/Kuala_Lumpur' }).format(new Date(iso))
}

export default async function StudentPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; id: string }>
  searchParams: Promise<{ month?: string }>
}) {
  const { slug, id } = await params
  const { month: m } = await searchParams
  const { supabase, centre, isManager, isStaff, canWrite, user } = await getCentre(slug)
  const root = `/c/${slug}`

  const { data: s } = await supabase
    .from('students')
    .select('*, classes(id, name, teacher_id)')
    .eq('id', id)
    .eq('centre_id', centre.id)
    .maybeSingle()
  if (!s) notFound()

  const today = todayMY()
  const month = isMonth(m) && m <= today.slice(0, 7) ? m : today.slice(0, 7)
  const monthEnd = new Date(month + '-01T12:00:00Z')
  monthEnd.setUTCMonth(monthEnd.getUTCMonth() + 1)
  const [{ data: progress }, { data: att }, { data: guardians }, { data: classes }, people] = await Promise.all([
    supabase.from('progress').select('id, book, page, note, by_user, created_at').eq('student_id', id).order('created_at', { ascending: false }).limit(30),
    supabase.from('attendance').select('day, present').eq('student_id', id).gte('day', month + '-01').lt('day', monthEnd.toISOString().slice(0, 10)).order('day'),
    isStaff ? supabase.from('guardians').select('user_id').eq('student_id', id) : Promise.resolve({ data: [] as { user_id: string }[] }),
    isManager ? supabase.from('classes').select('id, name').eq('centre_id', centre.id).order('name') : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    loadPeople(supabase, centre.id),
  ])
  const [{ data: homework }, { data: subs }] = await Promise.all([
    s.class_id
      ? supabase.from('homework').select('id, title, due_on').eq('class_id', s.class_id).order('created_at', { ascending: false }).limit(1).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from('submissions')
      .select('id, audio_path, created_at, duration_s, stars, verdict, feedback, reviewed_at, reviewed_by, submitted_by, homework(title)')
      .eq('student_id', id)
      .order('created_at', { ascending: false })
      .limit(10),
  ])
  const urls = await playbackUrls(supabase, (subs ?? []).map((x) => x.audio_path))
  const isGuardian = !isStaff

  const canRecord = canWrite && (isManager || s.classes?.teacher_id === user.id)

  return (
    <div className="grid gap-10">
      <header className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
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
          <p className="mt-0.5 text-[1.5rem] font-bold text-strong">{s.book}, page {s.page}</p>
          <div className="mt-4"><StarTrack book={s.book} page={s.page} size="lg" /></div>
        </div>
      </header>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="grid content-start gap-10">
          <section id="practice" className="scroll-mt-6">
            <h2 className="section-title">Practice at home</h2>
            {homework ? (
              <p className="mt-2">
                <span className="font-semibold">{homework.title}</span>
                {homework.due_on ? <span className="text-muted">, send by {new Intl.DateTimeFormat('en-MY', { weekday: 'long', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(homework.due_on + 'T12:00:00Z'))}</span> : null}
              </p>
            ) : (
              <p className="mt-2 text-muted">{isGuardian ? 'No practice set right now. You can still send a recording of today’s reading.' : 'No practice set for this class.'}</p>
            )}
            {isGuardian && canWrite ? (
              <div className="mt-4">
                <Recorder slug={slug} centreId={centre.id} studentId={s.id} homeworkId={homework?.id ?? null} childName={s.full_name.split(' ')[0]} />
              </div>
            ) : null}
            {(subs ?? []).length > 0 ? (
              <ul className="mt-6 grid gap-4">
                {(subs ?? []).map((x) => (
                  <li key={x.id} className="panel grid gap-3 p-4">
                    <RecordingHead s={x as Submission} url={urls.get(x.audio_path)} />
                    {!x.reviewed_at && isStaff && canWrite && canRecord ? (
                      <ReplyForm slug={slug} id={x.id} />
                    ) : (
                      <Reply s={x as Submission} teacher={x.reviewed_by ? greetingName(people.get(x.reviewed_by)?.name) || undefined : undefined} />
                    )}
                    {!x.reviewed_at && x.submitted_by === user.id ? (
                      <form action={removeSubmission}>
                        <input type="hidden" name="slug" value={slug} />
                        <input type="hidden" name="id" value={x.id} />
                        <button className="text-sm font-semibold text-muted hover:text-danger">Take back this recording</button>
                      </form>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
          </section>

          <section id="progress" className="scroll-mt-6">
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

          <section id="attendance" className="scroll-mt-6">
            <h2 className="section-title">Attendance</h2>
            <div className="mt-4">
              <AttendanceCalendar month={month} today={today} days={att ?? []} hrefFor={(mo) => `${root}/students/${s.id}?month=${mo}#attendance`} />
            </div>
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
