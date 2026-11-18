import Link from 'next/link'
import { getCentre, greetingName, todayMY } from '@/lib/centre'
import { loadPeople } from '@/lib/people'
import { StarTrack } from '@/components/star-track'
import { Star } from '@/components/star'

export const metadata = { title: 'Today' }

function formatDay(d: string) {
  return new Intl.DateTimeFormat('en-MY', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Kuala_Lumpur' }).format(new Date(d + 'T12:00:00+08:00'))
}

export default async function CentreHome({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const c = await getCentre(slug)
  if (c.role === 'parent') return <ParentHome slug={slug} />
  return <StaffHome slug={slug} />
}

async function StaffHome({ slug }: { slug: string }) {
  const { supabase, centre, user, isManager, myName } = await getCentre(slug)
  const root = `/c/${slug}`
  const today = todayMY()

  const classesQ = supabase.from('classes').select('id, name, schedule, teacher_id').eq('centre_id', centre.id).order('name')
  const [{ data: allClasses }, { data: students }, { data: marked }, { data: recent }, people] = await Promise.all([
    isManager ? classesQ : classesQ.eq('teacher_id', user.id),
    supabase.from('students').select('id, class_id, status').eq('centre_id', centre.id).eq('status', 'active'),
    supabase.from('attendance').select('student_id, present').eq('centre_id', centre.id).eq('day', today),
    supabase
      .from('progress')
      .select('id, book, page, note, created_at, by_user, students(id, full_name)')
      .eq('centre_id', centre.id)
      .order('created_at', { ascending: false })
      .limit(6),
    loadPeople(supabase, centre.id),
  ])

  const classes = allClasses ?? []
  const byClass = new Map<string, number>()
  for (const s of students ?? []) if (s.class_id) byClass.set(s.class_id, (byClass.get(s.class_id) ?? 0) + 1)
  const markedSet = new Map((marked ?? []).map((m) => [m.student_id, m.present]))
  const studentClass = new Map((students ?? []).map((s) => [s.id, s.class_id]))
  const markedByClass = new Map<string, number>()
  for (const [sid] of markedSet) {
    const cid = studentClass.get(sid)
    if (cid) markedByClass.set(cid, (markedByClass.get(cid) ?? 0) + 1)
  }
  const activeCount = students?.length ?? 0
  const teacherCount = [...people.values()].filter((p) => p.role === 'teacher').length
  const firstName = greetingName(myName)

  const setup = isManager && (classes.length === 0 || activeCount === 0 || teacherCount === 0)

  return (
    <div className="grid gap-10">
      <header>
        <p className="text-sm text-muted">{formatDay(today)}</p>
        <h1 className="page-title mt-1">Assalamualaikum{firstName ? `, ${firstName}` : ''}</h1>
      </header>

      {setup ? (
        <section className="panel p-6">
          <h2 className="section-title">Get your centre ready</h2>
          <p className="mt-1 text-sm text-muted">Three steps and your teachers can start marking attendance.</p>
          <ol className="mt-5 grid gap-3">
            {[
              { done: classes.length > 0, text: 'Add your first class', href: `${root}/classes` },
              { done: activeCount > 0, text: 'Add students and their Iqra level', href: `${root}/students` },
              { done: teacherCount > 0, text: 'Invite your teachers', href: `${root}/people` },
            ].map((step, i) => (
              <li key={step.text} className="flex items-center gap-3">
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${step.done ? 'bg-teal-600 text-white' : 'border border-line text-muted'}`}>
                  {step.done ? '✓' : i + 1}
                </span>
                {step.done ? (
                  <span className="text-muted line-through">{step.text}</span>
                ) : (
                  <Link href={step.href} className="link">{step.text}</Link>
                )}
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <section>
        <div className="flex items-baseline justify-between">
          <h2 className="section-title">{isManager ? 'Attendance today' : 'Your classes today'}</h2>
          {isManager ? <span className="text-sm text-muted">{activeCount} active students</span> : null}
        </div>
        {classes.length === 0 ? (
          <p className="mt-3 text-muted">
            {isManager ? 'No classes yet.' : 'You haven’t been given a class yet. Ask your centre’s admin to assign you.'}
          </p>
        ) : (
          <ul className="panel rows mt-4">
            {classes.map((cl) => {
              const total = byClass.get(cl.id) ?? 0
              const done = markedByClass.get(cl.id) ?? 0
              const complete = total > 0 && done >= total
              return (
                <li key={cl.id}>
                  <Link href={`${root}/classes/${cl.id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-paper">
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{cl.name}</span>
                      <span className="text-sm text-muted">
                        {[cl.schedule, isManager ? (cl.teacher_id ? people.get(cl.teacher_id)?.name : 'No teacher yet') : null].filter(Boolean).join(', ') || `${total} students`}
                      </span>
                    </span>
                    <span className={`shrink-0 rounded-full px-3 py-1 text-sm font-semibold ${complete ? 'bg-teal-50 text-teal-700' : total === 0 ? 'text-faint' : 'bg-brass-soft text-[#6b5115]'}`}>
                      {total === 0 ? 'No students' : complete ? 'Marked' : `${done} of ${total} marked`}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section>
        <h2 className="section-title">Recent reading progress</h2>
        {(recent ?? []).length === 0 ? (
          <p className="mt-3 text-muted">When a teacher moves a student to a new page, it shows here.</p>
        ) : (
          <ul className="panel rows mt-4">
            {(recent ?? []).map((p) => (
              <li key={p.id} className="flex items-start gap-3 px-5 py-3.5">
                <Star size={16} fill="var(--color-brass)" className="mt-1 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p>
                    {p.students ? (
                      <Link href={`${root}/students/${p.students.id}`} className="font-semibold hover:underline">{p.students.full_name}</Link>
                    ) : 'A student'}{' '}
                    reached {p.book}, page {p.page}
                  </p>
                  {p.note ? <p className="text-sm text-muted">“{p.note}”</p> : null}
                </div>
                <span className="shrink-0 text-xs text-faint">{p.by_user ? greetingName(people.get(p.by_user)?.name) : ''}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

async function ParentHome({ slug }: { slug: string }) {
  const { supabase, centre, myName } = await getCentre(slug)
  const root = `/c/${slug}`
  const monthStart = todayMY().slice(0, 8) + '01'
  const [{ data: kids }, { data: att }, { data: notes }] = await Promise.all([
    supabase.from('students').select('id, full_name, book, page, classes(name)').eq('centre_id', centre.id).order('full_name'),
    supabase.from('attendance').select('student_id, present').eq('centre_id', centre.id).gte('day', monthStart),
    supabase.from('progress').select('student_id, note, created_at').eq('centre_id', centre.id).not('note', 'is', null).order('created_at', { ascending: false }).limit(20),
  ])
  const firstName = greetingName(myName)

  return (
    <div className="grid gap-8">
      <header>
        <h1 className="page-title">Assalamualaikum{firstName ? `, ${firstName}` : ''}</h1>
        <p className="mt-1 text-muted">How your {kids?.length === 1 ? 'child is' : 'children are'} doing at {centre.name}.</p>
      </header>
      {(kids ?? []).length === 0 ? (
        <p className="panel p-6 text-muted">
          No child is linked to your account yet. Ask the centre to send you an invitation for your child.
        </p>
      ) : (
        <ul className="grid gap-5">
          {(kids ?? []).map((k) => {
            const mine = (att ?? []).filter((a) => a.student_id === k.id)
            const present = mine.filter((a) => a.present).length
            const note = (notes ?? []).find((n) => n.student_id === k.id)
            return (
              <li key={k.id}>
                <Link href={`${root}/students/${k.id}`} className="panel block p-6 transition-colors hover:border-navy-700">
                  <div className="flex flex-wrap items-start justify-between gap-6">
                    <div>
                      <p className="text-lg font-bold">{k.full_name}</p>
                      <p className="text-sm text-muted">{k.classes?.name ?? 'No class yet'}</p>
                      <p className="mt-4 text-[1.35rem] font-bold text-navy-800">{k.book}, page {k.page}</p>
                    </div>
                    <StarTrack book={k.book} page={k.page} size="md" />
                  </div>
                  <div className="mt-5 flex flex-wrap gap-x-8 gap-y-2 border-t border-line pt-4 text-sm">
                    <span><strong>{present}</strong> of {mine.length} classes attended this month</span>
                    {note ? <span className="text-muted">Teacher’s note: “{note.note}”</span> : null}
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
