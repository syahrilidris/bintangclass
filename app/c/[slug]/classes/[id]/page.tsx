import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getCentre, todayMY } from '@/lib/centre'
import { loadPeople } from '@/lib/people'
import { Attendance } from './attendance'
import { ClassForm } from '../class-form'
import { deleteClass } from '../../actions'
import { HomeworkForm } from '../../practice/homework-form'
import { removeHomework } from '../../practice/actions'

export const metadata = { title: 'Class' }

function shiftDay(day: string, by: number) {
  const d = new Date(day + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + by)
  return d.toISOString().slice(0, 10)
}

function dayLabel(day: string, today: string) {
  if (day === today) return 'Today'
  if (day === shiftDay(today, -1)) return 'Yesterday'
  return new Intl.DateTimeFormat('en-MY', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(day + 'T12:00:00Z'))
}

export default async function ClassPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; id: string }>
  searchParams: Promise<{ day?: string }>
}) {
  const { slug, id } = await params
  const { day: dayParam } = await searchParams
  const { supabase, centre, isManager, canWrite, user } = await getCentre(slug)
  const root = `/c/${slug}`
  const today = todayMY()
  const day = dayParam && /^\d{4}-\d{2}-\d{2}$/.test(dayParam) && dayParam <= today ? dayParam : today

  const { data: cl } = await supabase.from('classes').select('*').eq('id', id).eq('centre_id', centre.id).maybeSingle()
  if (!cl) notFound()

  const [{ data: students }, { data: att }, people, { data: homework }] = await Promise.all([
    supabase.from('students').select('id, full_name, book, page').eq('class_id', id).eq('status', 'active').order('full_name'),
    supabase.from('attendance').select('student_id, present').eq('class_id', id).eq('day', day),
    loadPeople(supabase, centre.id),
    supabase.from('homework').select('id, title, due_on, created_at, submissions(count)').eq('class_id', id).order('created_at', { ascending: false }).limit(5),
  ])
  const presentMap = new Map((att ?? []).map((a) => [a.student_id, a.present]))
  const rows = (students ?? []).map((s) => ({ ...s, present: presentMap.has(s.id) ? presentMap.get(s.id)! : null }))
  const canMark = canWrite && (isManager || cl.teacher_id === user.id)
  const teachers = [...people.values()].filter((p) => p.role !== 'parent')

  return (
    <div className="grid gap-10">
      <header>
        <Link href={`${root}/classes`} className="text-sm text-muted hover:text-ink">Classes</Link>
        <h1 className="page-title mt-1">{cl.name}</h1>
        <p className="mt-1 text-muted">
          {[cl.schedule, cl.teacher_id ? `Taught by ${people.get(cl.teacher_id)?.name ?? 'a teacher'}` : 'No teacher assigned'].filter(Boolean).join('. ')}
        </p>
      </header>

      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="section-title">Attendance</h2>
          <nav className="flex items-center gap-1" aria-label="Choose day">
            <Link href={`?day=${shiftDay(day, -1)}`} className="btn btn-quiet px-3" aria-label="Previous day">‹</Link>
            <span className="min-w-24 text-center text-sm font-semibold">{dayLabel(day, today)}</span>
            {day < today ? (
              <Link href={`?day=${shiftDay(day, 1)}`} className="btn btn-quiet px-3" aria-label="Next day">›</Link>
            ) : (
              <span className="btn btn-quiet px-3 opacity-40" aria-hidden>›</span>
            )}
          </nav>
        </div>
        <div className="mt-4">
          {rows.length === 0 ? (
            <p className="text-muted">
              No students in this class yet.{' '}
              {isManager ? <Link href={`${root}/students`} className="link">Add students</Link> : null}
            </p>
          ) : (
            <Attendance key={day} slug={slug} classId={id} day={day} rows={rows} canMark={canMark} />
          )}
        </div>
      </section>

      <section id="practice" className="grid scroll-mt-6 gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div>
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="section-title">Practice at home</h2>
            <Link href={`${root}/practice`} className="link text-sm">Listen to recordings</Link>
          </div>
          {(homework ?? []).length === 0 ? (
            <p className="mt-3 text-muted">No practice set. Set some and parents can record their child reading it.</p>
          ) : (
            <ul className="panel rows mt-4">
              {(homework ?? []).map((h, i) => {
                const sent = (h.submissions as unknown as { count: number }[])?.[0]?.count ?? 0
                return (
                  <li key={h.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3.5">
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{h.title}{i === 0 ? <span className="ml-2 rounded-full bg-teal-50 px-2 py-0.5 text-xs font-semibold text-teal-700">Current</span> : null}</span>
                      <span className="text-sm text-muted">
                        {h.due_on ? `Send by ${new Intl.DateTimeFormat('en-MY', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(h.due_on + 'T12:00:00Z'))}, ` : ''}
                        {sent} recording{sent === 1 ? '' : 's'}
                      </span>
                    </span>
                    {canMark ? (
                      <form action={removeHomework}>
                        <input type="hidden" name="slug" value={slug} />
                        <input type="hidden" name="id" value={h.id} />
                        <button className="text-sm font-semibold text-muted hover:text-danger">Remove</button>
                      </form>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
        {canMark ? (
          <aside>
            <h3 className="font-semibold">Set practice</h3>
            <div className="mt-3"><HomeworkForm slug={slug} classId={id} /></div>
          </aside>
        ) : null}
      </section>

      {isManager && canWrite ? (
        <section className="grid gap-8 border-t border-line pt-8 lg:grid-cols-2">
          <div>
            <h2 className="section-title">Class details</h2>
            <div className="mt-4">
              <ClassForm slug={slug} teachers={teachers} initial={cl} />
            </div>
          </div>
          <div>
            <h2 className="section-title">Remove class</h2>
            <p className="mt-2 text-sm text-muted">
              Students stay at the centre without a class. Past attendance is kept.
            </p>
            <form action={deleteClass} className="mt-4">
              <input type="hidden" name="slug" value={slug} />
              <input type="hidden" name="id" value={id} />
              <button className="btn btn-danger">Remove {cl.name}</button>
            </form>
          </div>
        </section>
      ) : null}
    </div>
  )
}
