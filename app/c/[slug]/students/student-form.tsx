'use client'

import { useActionState, useRef, useEffect, useState } from 'react'
import { saveStudent } from '../actions'
import { Submit } from '@/components/submit'
import { useHydrated } from '@/components/hydrated'
import { FormMessage } from '@/components/form-message'
import { BOOKS } from '@/lib/books'

type Initial = { id: string; full_name: string; class_id: string | null; monthly_fee: number | null; status: string }

export function StudentForm({
  slug,
  classes,
  initial,
  defaultClass,
}: {
  slug: string
  classes: { id: string; name: string }[]
  initial?: Initial
  defaultClass?: string
}) {
  const hydrated = useHydrated()
  const [state, action] = useActionState(saveStudent, undefined)
  const formRef = useRef<HTMLFormElement>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  // Selects are controlled so the choice on screen is always the one submitted.
  const [classId, setClassId] = useState(initial?.class_id ?? defaultClass ?? '')
  const [book, setBook] = useState('Iqra 1')
  const [status, setStatus] = useState(initial?.status ?? 'active')

  // After "Add and add another", clear the name and keep the class, so a whole register goes in quickly.
  useEffect(() => {
    if (!initial && state?.ok) {
      if (nameRef.current) nameRef.current.value = ''
      nameRef.current?.focus()
    }
  }, [state, initial])

  return (
    <form ref={formRef} action={action} className="grid gap-4">
      <input type="hidden" name="slug" value={slug} />
      {initial ? <input type="hidden" name="id" value={initial.id} /> : null}
      <label className="field">
        <span>Full name</span>
        <input ref={nameRef} className="input" name="full_name" defaultValue={initial?.full_name} placeholder="e.g. Aisyah binti Rahman" required />
      </label>
      <label className="field">
        <span>Class</span>
        <select className="input" name="class_id" value={classId} onChange={(e) => setClassId(e.target.value)}>
          <option value="">No class yet</option>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </label>
      {!initial ? (
        <div className="grid grid-cols-[minmax(0,1fr)_6rem] gap-3">
          <label className="field">
            <span>Reading now</span>
            <select className="input" name="book" value={book} onChange={(e) => setBook(e.target.value)}>
              {BOOKS.map((b) => <option key={b.name}>{b.name}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Page</span>
            <input className="input" name="page" type="number" min={1} defaultValue={1} inputMode="numeric" />
          </label>
        </div>
      ) : null}
      <label className="field">
        <span>Monthly fee (RM)</span>
        <input className="input" name="monthly_fee" type="number" min={0} step="0.5" inputMode="decimal" defaultValue={initial?.monthly_fee ?? ''} placeholder="Optional" />
      </label>
      {initial ? (
        <label className="field">
          <span>Status</span>
          <select className="input" name="status" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="active">Active</option>
            <option value="left">Left the centre</option>
          </select>
        </label>
      ) : null}
      <FormMessage state={state} />
      {initial ? (
        <Submit pending="Saving…" disabled={!hydrated}>Save details</Submit>
      ) : (
        <div className="grid gap-2">
          <Submit pending="Adding…" disabled={!hydrated}>Add student</Submit>
          <button name="another" value="1" className="btn btn-quiet" disabled={!hydrated}>Add and add another</button>
        </div>
      )}
    </form>
  )
}
