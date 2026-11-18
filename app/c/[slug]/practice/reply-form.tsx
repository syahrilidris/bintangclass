'use client'

import { useActionState, useState } from 'react'
import { replyToSubmission } from './actions'
import { Submit } from '@/components/submit'
import { Star } from '@/components/star'
import { useHydrated } from '@/components/hydrated'

// Stars, Good or Repeat, and an optional note. Big targets: teachers reply on their phones between classes.
export function ReplyForm({ slug, id, initial, returnTo }: { slug: string; id: string; initial?: { stars: number | null; verdict: string | null; feedback: string | null }; returnTo?: string }) {
  const hydrated = useHydrated()
  const [state, action] = useActionState(replyToSubmission, undefined)
  const [stars, setStars] = useState(initial?.stars ?? 0)
  const [verdict, setVerdict] = useState(initial?.verdict ?? '')

  if (state?.ok) return <p className="text-sm font-semibold text-teal-700" role="status">{state.ok}</p>

  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="id" value={id} />
      {returnTo ? <input type="hidden" name="return_to" value={returnTo} /> : null}
      <input type="hidden" name="stars" value={stars || ''} />
      <input type="hidden" name="verdict" value={verdict} />
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="flex gap-1" role="radiogroup" aria-label="Stars">
          {[1, 2, 3].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={stars === n}
              aria-label={`${n} star${n > 1 ? 's' : ''}`}
              onClick={() => setStars(n)}
              className="rounded-md p-1 hover:bg-paper"
            >
              <Star size={30} fill={n <= stars ? 'var(--color-brass)' : 'none'} stroke={n <= stars ? undefined : 'var(--color-faint)'} strokeWidth={6} />
            </button>
          ))}
        </div>
        <div className="flex gap-2" role="radiogroup" aria-label="Verdict">
          <button type="button" role="radio" aria-checked={verdict === 'good'} onClick={() => setVerdict('good')} className={`btn ${verdict === 'good' ? 'bg-teal-600 text-white' : 'btn-quiet'}`}>
            Good
          </button>
          <button type="button" role="radio" aria-checked={verdict === 'repeat'} onClick={() => setVerdict('repeat')} className={`btn ${verdict === 'repeat' ? 'bg-brass text-white' : 'btn-quiet'}`}>
            Repeat
          </button>
        </div>
      </div>
      <label className="field">
        <span className="sr-only">Note for the parent</span>
        <textarea name="feedback" className="input min-h-16" defaultValue={initial?.feedback ?? ''} placeholder="Note for the parent (optional), e.g. Watch the panjang on mim." />
      </label>
      {state?.error ? <p className="notice notice-error" role="alert">{state.error}</p> : null}
      <div>
        <Submit pending="Sending…" disabled={!hydrated || !stars || !verdict}>Send reply</Submit>
      </div>
    </form>
  )
}
