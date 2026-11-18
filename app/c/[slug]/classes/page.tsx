import Link from 'next/link'
import { getCentre } from '@/lib/centre'
import { loadPeople } from '@/lib/people'
import { ClassForm } from './class-form'

export const metadata = { title: 'Classes' }

export default async function ClassesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { supabase, centre, user, isManager, canWrite } = await getCentre(slug)
  const root = `/c/${slug}`

  const q = supabase.from('classes').select('id, name, schedule, teacher_id').eq('centre_id', centre.id).order('name')
  const [{ data: classes }, { data: students }, people] = await Promise.all([
    isManager ? q : q.eq('teacher_id', user.id),
    supabase.from('students').select('class_id').eq('centre_id', centre.id).eq('status', 'active'),
    loadPeople(supabase, centre.id),
  ])
  const counts = new Map<string, number>()
  for (const s of students ?? []) if (s.class_id) counts.set(s.class_id, (counts.get(s.class_id) ?? 0) + 1)
  const teachers = [...people.values()].filter((p) => p.role !== 'parent')

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <section>
        <h1 className="page-title">{isManager ? 'Classes' : 'My classes'}</h1>
        {(classes ?? []).length === 0 ? (
          <p className="mt-4 text-muted">
            {isManager ? 'No classes yet. Add one to start grouping students.' : 'You don’t teach a class yet. Ask your centre’s admin to assign you.'}
          </p>
        ) : (
          <ul className="panel rows mt-6">
            {(classes ?? []).map((cl) => (
              <li key={cl.id}>
                <Link href={`${root}/classes/${cl.id}`} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 px-5 py-4 hover:bg-paper">
                  <span className="font-semibold">{cl.name}</span>
                  <span className="text-sm text-muted">{counts.get(cl.id) ?? 0} students</span>
                  <span className="text-sm text-muted">
                    {[cl.schedule, cl.teacher_id ? people.get(cl.teacher_id)?.name : 'No teacher yet'].filter(Boolean).join(', ')}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      {isManager && canWrite ? (
        <aside>
          <h2 className="section-title">Add a class</h2>
          <div className="mt-4">
            <ClassForm slug={slug} teachers={teachers} />
          </div>
        </aside>
      ) : null}
    </div>
  )
}
