'use client'

import { useActionState } from 'react'
import { saveCentre } from '../actions'
import { Submit } from '@/components/submit'
import { FormMessage } from '@/components/form-message'

export function CentreForm({ slug, centre }: { slug: string; centre: { name: string; phone: string | null; city: string | null } }) {
  const [state, action] = useActionState(saveCentre, undefined)
  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="slug" value={slug} />
      <label className="field">
        <span>Centre name</span>
        <input className="input" name="name" defaultValue={centre.name} required />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="field">
          <span>Phone or WhatsApp</span>
          <input className="input" name="phone" type="tel" defaultValue={centre.phone ?? ''} />
        </label>
        <label className="field">
          <span>Town or city</span>
          <input className="input" name="city" defaultValue={centre.city ?? ''} />
        </label>
      </div>
      <FormMessage state={state} />
      <Submit pending="Saving…">Save details</Submit>
    </form>
  )
}
