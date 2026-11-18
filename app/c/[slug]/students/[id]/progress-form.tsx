'use client'

import { useActionState, useState } from 'react'
import { recordProgress } from '../../actions'
import { Submit } from '@/components/submit'
import { FormMessage } from '@/components/form-message'
import { BOOKS, bookPages } from '@/lib/books'

export function ProgressForm({ slug, studentId, book, page }: { slug: string; studentId: string; book: string; page: number }) {
  const [state, action] = useActionState(recordProgress, undefined)
  const [b, setB] = useState(book)
  const max = bookPages(b)
  const nextPage = b === book ? Math.min(page + 1, max) : 1

  return (
    <form action={action} className="grid gap-4" key={state?.ok}>
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="student_id" value={studentId} />
      <div className="grid grid-cols-[minmax(0,1fr)_6rem] gap-3">
        <label className="field">
          <span>Book</span>
          <select className="input" name="book" value={b} onChange={(e) => setB(e.target.value)}>
            {BOOKS.map((x) => <option key={x.name}>{x.name}</option>)}
          </select>
        </label>
        <label className="field">
          <span>Page</span>
          <input className="input" name="page" type="number" min={1} max={max} defaultValue={nextPage} inputMode="numeric" required />
        </label>
      </div>
      <label className="field">
        <span>Note for the parent</span>
        <textarea className="input min-h-20" name="note" placeholder="e.g. Good makhraj today. Practise the mad letters at home." />
        <small>Optional. Parents see this.</small>
      </label>
      <FormMessage state={state} />
      <Submit pending="Saving…">Save progress</Submit>
    </form>
  )
}
