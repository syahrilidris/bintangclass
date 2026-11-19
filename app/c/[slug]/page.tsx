import Link from 'next/link'
import { getCentre, greetingName, todayMY } from '@/lib/centre'
import { initials, loadPeople } from '@/lib/people'
import { StarTrack } from '@/components/star-track'
import { Star } from '@/components/star'
import { Hero, HeroStat, Ring, Tile } from '@/components/ui'

export const metadata = { title: 'Today' }

function formatDay(d: string) {
  return new Intl.DateTimeFormat('en-MY', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Kuala_Lumpur' }).format(new Date(d + 'T12:00:00+08:00'))
}

export default async function CentreHome({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ child?: string }> }) {
  const { slug } = await params
  const c = await getCentre(slug)
  if (c.role === 'parent') return <ParentHome slug={slug} child={(await searchParams).child} />
  return <StaffHome slug={slug} />
}

async function StaffHome({ slug }: { slug: string }) {
  const { supabase, centre, user, isManager, myName } = await getCentre(slug)
  const root = `/c/${slug}`
  const today = todayMY()

  const classesQ = supabase.from('classes').select('id, name, schedule, teacher_id').eq('centre_id', centre.id).order('name')
  const [{ data: allClasses }, { data: students }, { data: marked }, { data: recent }, people, { count: waiting }] = await Promise.all([
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
    supabase.from('submissions').select('id', { count: 'exact', head: true }).eq('centre_id', centre.id).is('reviewed_at', null),
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

  const doneClasses = classes.filter((cl) => {
    const total = byClass.get(cl.id) ?? 0
    return total > 0 && (markedByClass.get(cl.id) ?? 0) >= total
  }).length
  const firstClass = classes[0]
  const myStudents = isManager ? activeCount : classes.reduce((n, cl) => n + (byClass.get(cl.id) ?? 0), 0)

  return (
    <div className="grid gap-8">
      <Hero eyebrow={formatDay(today)} title={`Assalamualaikum${firstName ? `, ${firstName}` : ''}`}>
        <div className="grid max-w-md grid-cols-3 gap-2">
          <HeroStat value={myStudents} label={isManager ? 'active students' : 'students'} />
          <HeroStat value={`${doneClasses}/${classes.length}`} label="classes done" />
          <HeroStat value={waiting ?? 0} label="to review" />
        </div>
      </Hero>

      <nav aria-label="Quick actions" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {isManager ? (
          <>
            <Tile href={`${root}/students`} icon="addStudent" label="Add a student" hint="Name, class, Iqra level" />
            <Tile href={`${root}/classes`} icon="classes" label="Classes" hint={`${classes.length} running`} tone="navy" />
            <Tile href={`${root}/people`} icon="invite" label="Invite people" hint="Teachers and parents" tone="brass" />
            <Tile href={`${root}/practice`} icon="mic" label="Home practice" hint="Recordings from parents" badge={waiting ?? 0} />
          </>
        ) : (
          <>
            <Tile href={firstClass ? `${root}/classes/${firstClass.id}` : `${root}/classes`} icon="attendance" label="Take attendance" hint={classes.length ? `${classes.length} class${classes.length === 1 ? '' : 'es'} today` : 'No class yet'} />
            <Tile href={`${root}/practice`} icon="mic" label="Home practice" hint="Recordings from parents" badge={waiting ?? 0} tone="brass" />
            <Tile href={firstClass ? `${root}/classes/${firstClass.id}#practice` : `${root}/classes`} icon="task" label="Set practice" hint="For this week" tone="navy" />
            <Tile href={`${root}/students`} icon="student" label="My students" hint={`${myStudents} in your classes`} />
          </>
        )}
      </nav>

      {waiting ? (
        <Link href={`${root}/practice`} className="panel flex items-center justify-between gap-4 border-brass bg-brass-soft/40 px-5 py-4 hover:bg-brass-soft">
          <span>
            <span className="block font-semibold">{waiting} recording{waiting === 1 ? '' : 's'} to listen to</span>
            <span className="text-sm text-muted">Sent from home by parents</span>
          </span>
          <span className="btn btn-primary">Listen</span>
        </Link>
      ) : null}

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
                    <span className={`shrink-0 rounded-full px-3 py-1 text-sm font-semibold ${complete ? 'bg-teal-50 text-teal-700' : total === 0 ? 'text-faint' : 'bg-brass-soft text-brass-ink'}`}>
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

async function ParentHome({ slug, child }: { slug: string; child?: string }) {
  const { supabase, centre, myName } = await getCentre(slug)
  const root = `/c/${slug}`
  const today = todayMY()
  const monthStart = today.slice(0, 8) + '01'
  const [{ data: kids }, { data: att }, { data: notes }, { data: homework }, { data: subs }] = await Promise.all([
    supabase.from('students').select('id, full_name, book, page, class_id, classes(name)').eq('centre_id', centre.id).order('full_name'),
    supabase.from('attendance').select('student_id, present').eq('centre_id', centre.id).gte('day', monthStart),
    supabase.from('progress').select('student_id, note, created_at').eq('centre_id', centre.id).not('note', 'is', null).order('created_at', { ascending: false }).limit(20),
    supabase.from('homework').select('class_id, title, created_at').eq('centre_id', centre.id).order('created_at', { ascending: false }).limit(20),
    supabase.from('submissions').select('student_id, created_at, reviewed_at, stars, verdict').eq('centre_id', centre.id).order('created_at', { ascending: false }).limit(20),
  ])
  const firstName = greetingName(myName)
  const list = kids ?? []
  const k = list.find((x) => x.id === child) ?? list[0]

  const hero = (
    <Hero eyebrow={formatDay(today)} title={`Assalamualaikum${firstName ? `, ${firstName}` : ''}`}>
      <p className="text-sm text-white/75">How your {list.length === 1 ? 'child is' : 'children are'} doing at {centre.name}.</p>
    </Hero>
  )

  if (!k) {
    return (
      <div className="grid gap-8">
        {hero}
        <p className="panel p-6 text-muted">
          No child is linked to your account yet. Ask the centre to send you an invitation for your child.
        </p>
      </div>
    )
  }

  const mine = (att ?? []).filter((a) => a.student_id === k.id)
  const present = mine.filter((a) => a.present).length
  const note = (notes ?? []).find((n) => n.student_id === k.id)
  const hw = (homework ?? []).find((h) => h.class_id === k.class_id)
  const last = (subs ?? []).find((x) => x.student_id === k.id)
  const waitingReply = last && !last.reviewed_at
  const kidHref = `${root}/students/${k.id}`

  return (
    <div className="grid gap-6">
      {hero}

      {list.length > 1 ? (
        <nav aria-label="Choose a child" className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 lg:mx-0 lg:px-0">
          {list.map((x) => {
            const on = x.id === k.id
            return (
              <Link key={x.id} href={`${root}?child=${x.id}`} scroll={false} aria-current={on ? 'true' : undefined} className={`chip shrink-0 ${on ? 'chip-on' : ''}`}>
                <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[0.65rem] font-bold ${on ? 'bg-white/20' : 'bg-paper'}`}>{initials(x.full_name)}</span>
                {x.full_name.split(' ')[0]}
              </Link>
            )
          })}
        </nav>
      ) : null}

      <section className="panel overflow-hidden" aria-label="Reading level">
        <div className="flex flex-wrap items-start justify-between gap-5 p-6">
          <div className="min-w-0">
            <Link href={`${kidHref}#practice`} className="text-lg font-bold hover:underline">{k.full_name}</Link>
            <p className="text-sm text-muted">{k.classes?.name ?? 'No class yet'}</p>
            <p className="mt-4 text-sm text-muted">Reading now</p>
            <p className="text-[1.45rem] font-bold leading-tight text-strong">{k.book}, page {k.page}</p>
          </div>
          <StarTrack book={k.book} page={k.page} size="md" />
        </div>
        {note ? (
          <p className="border-t border-line bg-paper/60 px-6 py-3.5 text-sm">
            <span className="font-semibold">Teacher’s note:</span> <span className="text-muted">“{note.note}”</span>
          </p>
        ) : null}
      </section>

      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <Link href={`${kidHref}#attendance`} className="tile flex-row items-center gap-4">
          <Ring value={present} total={mine.length} size={64} label={`${present} of ${mine.length} classes attended this month`} />
          <span className="min-w-0">
            <span className="block font-semibold">Attendance</span>
            <span className="text-sm text-muted">{present} of {mine.length} classes attended this month</span>
          </span>
        </Link>

        <Link href={`${kidHref}#practice`} className="tile">
          <span className="flex items-center justify-between gap-3">
            <span className="tile-icon bg-brass-soft text-brass-ink">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <rect x="9" y="3.5" width="6" height="11" rx="3" /><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v2.5" />
              </svg>
            </span>
            <span className="btn btn-primary min-h-9 px-4 text-sm">Record</span>
          </span>
          <span className="text-sm">
            {hw ? <><span className="font-semibold">Practice:</span> {hw.title}</> : <span className="font-semibold">Practice at home</span>}
            {last ? (
              <span className="mt-0.5 block text-muted">
                {waitingReply
                  ? 'Last recording sent, waiting for the teacher'
                  : `Last recording: ${last.verdict === 'repeat' ? 'teacher asks to repeat' : 'teacher said good'}${last.stars ? `, ${last.stars} of 3 stars` : ''}`}
              </span>
            ) : (
              <span className="mt-0.5 block text-muted">Record your child reading and the teacher will reply.</span>
            )}
          </span>
        </Link>
      </div>

      <nav aria-label="More for this child" className="grid grid-cols-2 gap-3">
        <Tile href={`${kidHref}#progress`} icon="book" label="Reading history" hint="Every page and note" tone="navy" />
        <Tile href={`${kidHref}#attendance`} icon="attendance" label="Attendance calendar" hint="Month by month" />
      </nav>
    </div>
  )
}
