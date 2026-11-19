import Link from 'next/link'
import { getCentre } from '@/lib/centre'
import { StarTrack } from '@/components/star-track'
import { StudentForm } from './student-form'

export const metadata = { title: 'Students' }

const FREE_LIMIT = 10

export default async function StudentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ class?: string; show?: string }>
}) {
  const { slug } = await params
  const { class: classFilter, show } = await searchParams
  const { supabase, centre, isManager, canWrite } = await getCentre(slug)
  const root = `/c/${slug}`

  let q = supabase
    .from('students')
    .select('id, full_name, book, page, status, class_id')
    .eq('centre_id', centre.id)
    .order('full_name')
  if (show !== 'left') q = q.eq('status', 'active')
  if (classFilter) q = q.eq('class_id', classFilter)

  const [{ data: students }, { data: classes }, { count: activeCount }] = await Promise.all([
    q,
    supabase.from('classes').select('id, name').eq('centre_id', centre.id).order('name'),
    supabase.from('students').select('id', { count: 'exact', head: true }).eq('centre_id', centre.id).eq('status', 'active'),
  ])
  const className = new Map((classes ?? []).map((c) => [c.id, c.name]))
  const overFree = centre.plan === 'free' && (activeCount ?? 0) >= FREE_LIMIT

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <section className="min-w-0">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="page-title">{isManager ? 'Students' : 'My students'}</h1>
          {isManager && centre.plan === 'free' ? (
            <span className="text-sm text-muted">{activeCount ?? 0} of {FREE_LIMIT} on the free plan</span>
          ) : null}
        </div>

        {(classes ?? []).length > 1 ? (
          <nav className="mt-5 flex flex-wrap gap-2" aria-label="Filter by class">
            <Link href="?" className={`rounded-full px-3 py-1 text-sm font-semibold ${!classFilter ? 'bg-solid text-white' : 'border border-line text-muted hover:text-ink'}`}>All classes</Link>
            {(classes ?? []).map((c) => (
              <Link key={c.id} href={`?class=${c.id}`} className={`rounded-full px-3 py-1 text-sm font-semibold ${classFilter === c.id ? 'bg-solid text-white' : 'border border-line text-muted hover:text-ink'}`}>
                {c.name}
              </Link>
            ))}
          </nav>
        ) : null}

        {(students ?? []).length === 0 ? (
          <p className="mt-6 text-muted">
            {isManager ? 'No students yet. Add them on the right, with the book and page they’re on now.' : 'No students in your classes yet.'}
          </p>
        ) : (
          <ul className="panel rows mt-5">
            {(students ?? []).map((s) => (
              <li key={s.id}>
                <Link href={`${root}/students/${s.id}`} className="flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-3.5 hover:bg-paper">
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{s.full_name}{s.status === 'left' ? <span className="ml-2 text-xs font-normal text-faint">left</span> : null}</span>
                    <span className="text-sm text-muted">{s.class_id ? className.get(s.class_id) : 'No class'}, {s.book} p. {s.page}</span>
                  </span>
                  <StarTrack book={s.book} page={s.page} size="sm" />
                </Link>
              </li>
            ))}
          </ul>
        )}
        {isManager ? (
          <Link href={show === 'left' ? '?' : '?show=left'} className="link mt-4 inline-block text-sm">
            {show === 'left' ? 'Hide students who left' : 'Include students who left'}
          </Link>
        ) : null}
      </section>

      {isManager && canWrite ? (
        <aside>
          <h2 className="section-title">Add a student</h2>
          {overFree ? (
            <p className="notice notice-warn mt-4">
              You’ve reached the free plan’s {FREE_LIMIT} students. You can still add more during the pilot; billing for
              larger centres comes later.
            </p>
          ) : null}
          <div className="mt-4">
            <StudentForm slug={slug} classes={classes ?? []} defaultClass={classFilter} />
          </div>
        </aside>
      ) : null}
    </div>
  )
}
