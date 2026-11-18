import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getCentre, greetingName } from '@/lib/centre'
import { loadPeople } from '@/lib/people'
import { playbackUrls } from '@/lib/recordings'
import { RecordingHead, Reply, type Submission } from '@/components/practice'
import { ReplyForm } from './reply-form'

export const metadata = { title: 'Practice' }

// The teacher's inbox: recordings sent from home, newest waiting first.
export default async function PracticePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ show?: string; sent?: string }>
}) {
  const { slug } = await params
  const { show, sent } = await searchParams
  const { supabase, centre, isStaff, canWrite } = await getCentre(slug)
  if (!isStaff) notFound()
  const root = `/c/${slug}`
  const replied = show === 'replied'

  let q = supabase
    .from('submissions')
    .select('id, audio_path, created_at, duration_s, stars, verdict, feedback, reviewed_at, reviewed_by, homework(title), students(id, full_name, classes(name))')
    .eq('centre_id', centre.id)
  q = replied ? q.not('reviewed_at', 'is', null).order('reviewed_at', { ascending: false }).limit(40) : q.is('reviewed_at', null).order('created_at')

  const [{ data: rows }, { count: waiting }, people] = await Promise.all([
    q,
    supabase.from('submissions').select('id', { count: 'exact', head: true }).eq('centre_id', centre.id).is('reviewed_at', null),
    loadPeople(supabase, centre.id),
  ])
  const urls = await playbackUrls(supabase, (rows ?? []).map((r) => r.audio_path))

  return (
    <div className="grid gap-6">
      <header>
        <h1 className="page-title">Practice</h1>
        <p className="mt-1 text-muted">Recordings parents send from home. Listen, then reply with stars and a note.</p>
      </header>

      {sent ? (
        <p className="notice notice-info" role="status">
          Reply sent. The parent can see it now.{waiting ? ` ${waiting} more to listen to.` : ' That’s everything for now.'}
        </p>
      ) : null}

      <nav className="flex gap-2" aria-label="Show">
        <Link href="?" className={`rounded-full px-3 py-1 text-sm font-semibold ${!replied ? 'bg-navy-900 text-white' : 'border border-line text-muted hover:text-ink'}`}>
          To listen{waiting ? ` (${waiting})` : ''}
        </Link>
        <Link href="?show=replied" className={`rounded-full px-3 py-1 text-sm font-semibold ${replied ? 'bg-navy-900 text-white' : 'border border-line text-muted hover:text-ink'}`}>
          Replied
        </Link>
      </nav>

      {(rows ?? []).length === 0 ? (
        <p className="panel p-6 text-muted">
          {replied
            ? 'Nothing replied to yet.'
            : 'No recordings waiting. Set practice on a class page and parents can record from their child’s page.'}
        </p>
      ) : (
        <ul className="grid gap-4">
          {(rows ?? []).map((r) => (
            <li key={r.id} className="panel grid gap-4 p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                {r.students ? (
                  <Link href={`${root}/students/${r.students.id}`} className="text-lg font-bold hover:underline">{r.students.full_name}</Link>
                ) : null}
                <span className="text-sm text-muted">{r.students?.classes?.name}</span>
              </div>
              <RecordingHead s={r as Submission} url={urls.get(r.audio_path)} />
              {r.reviewed_at ? (
                <Reply s={r as Submission} teacher={r.reviewed_by ? greetingName(people.get(r.reviewed_by)?.name) : undefined} />
              ) : canWrite ? (
                <ReplyForm slug={slug} id={r.id} returnTo={`${root}/practice?sent=1`} />
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
