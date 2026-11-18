'use client'

import { useActionState, useState } from 'react'
import { saveClass } from '../actions'
import { Submit } from '@/components/submit'
import { FormMessage } from '@/components/form-message'

export function ClassForm({
  slug,
  teachers,
  initial,
}: {
  slug: string
  teachers: { user_id: string; name: string }[]
  initial?: { id: string; name: string; schedule: string | null; teacher_id: string | null }
}) {
  const [state, action] = useActionState(saveClass, undefined)
  // Controlled so the choice on screen is always the one submitted.
  const [teacherId, setTeacherId] = useState(initial?.teacher_id ?? '')
  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="slug" value={slug} />
      {initial ? <input type="hidden" name="id" value={initial.id} /> : null}
      <label className="field">
        <span>Class name</span>
        <input className="input" name="name" defaultValue={initial?.name} placeholder="e.g. Iqra Pagi" required />
      </label>
      <label className="field">
        <span>When it meets</span>
        <input className="input" name="schedule" defaultValue={initial?.schedule ?? ''} placeholder="e.g. Isnin & Rabu, 5.00 pm" />
      </label>
      <label className="field">
        <span>Teacher</span>
        <select className="input" name="teacher_id" value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
          <option value="">No teacher yet</option>
          {teachers.map((t) => (
            <option key={t.user_id} value={t.user_id}>{t.name}</option>
          ))}
        </select>
        {teachers.length === 0 ? <small>Invite teachers from People, then assign them here.</small> : null}
      </label>
      <FormMessage state={state} />
      <Submit pending="Saving…">{initial ? 'Save class' : 'Add class'}</Submit>
    </form>
  )
}
