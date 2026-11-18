import { Star } from './star'
import { ago, duration } from '@/lib/recordings'

export type Submission = {
  id: string
  audio_path: string
  created_at: string
  duration_s: number | null
  stars: number | null
  verdict: string | null
  feedback: string | null
  reviewed_at: string | null
  homework: { title: string } | null
}

export function Stars({ n, size = 18 }: { n: number; size?: number }) {
  return (
    <span className="inline-flex gap-0.5" role="img" aria-label={`${n} of 3 stars`}>
      {[1, 2, 3].map((i) => (
        <Star key={i} size={size} fill={i <= n ? 'var(--color-brass)' : 'none'} stroke={i <= n ? undefined : 'var(--color-line)'} strokeWidth={7} />
      ))}
    </span>
  )
}

/** The teacher's reply as parents (and staff) see it. */
export function Reply({ s, teacher }: { s: Submission; teacher?: string }) {
  if (!s.reviewed_at) return <p className="text-sm text-muted">Waiting for the teacher to listen.</p>
  return (
    <div className={`rounded-lg px-4 py-3 ${s.verdict === 'repeat' ? 'bg-brass-soft' : 'bg-teal-50'}`}>
      <div className="flex flex-wrap items-center gap-3">
        {s.stars ? <Stars n={s.stars} /> : null}
        <span className={`text-sm font-bold ${s.verdict === 'repeat' ? 'text-[#6b5115]' : 'text-teal-700'}`}>
          {s.verdict === 'repeat' ? 'Please repeat' : 'Good'}
        </span>
        {teacher ? <span className="text-xs text-muted">{teacher}</span> : null}
      </div>
      {s.feedback ? <p className="mt-1.5">“{s.feedback}”</p> : null}
    </div>
  )
}

/** A recording with its player, for a list. */
export function RecordingHead({ s, url }: { s: Submission; url?: string }) {
  return (
    <div className="grid gap-2">
      <p className="text-sm text-muted">
        {s.homework?.title ?? 'Free practice'}, sent {ago(s.created_at)}
        {s.duration_s ? `, ${duration(s.duration_s)}` : ''}
      </p>
      {url ? <audio controls preload="none" src={url} className="w-full" /> : <p className="text-sm text-faint">Audio unavailable.</p>}
    </div>
  )
}
