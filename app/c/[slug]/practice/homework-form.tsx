'use client'

import { useActionState } from 'react'
import { setHomework } from './actions'
import { Submit } from '@/components/submit'
import { FormMessage } from '@/components/form-message'
import { useHydrated } from '@/components/hydrated'

export function HomeworkForm({ slug, classId, suggestion }: { slug: string; classId: string; suggestion?: string }) {
  const hydrated = useHydrated()
  const [state, action] = useActionState(setHomework, undefined)
  return (
    <form action={action} className="grid gap-4" key={state?.ok}>
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="class_id" value={classId} />
      <label className="field">
        <span>What to practise at home</span>
        <input className="input" name="title" placeholder={suggestion ?? 'e.g. Iqra 4, pages 22–23'} required />
      </label>
      <label className="field">
        <span>Send by</span>
        <input className="input" type="date" name="due_on" />
        <small>Optional.</small>
      </label>
      <FormMessage state={state} />
      <div>
        <Submit pending="Setting…" disabled={!hydrated}>Set practice</Submit>
      </div>
    </form>
  )
}
