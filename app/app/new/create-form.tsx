'use client'

import { useActionState, useState } from 'react'
import { createCentre } from './actions'
import { Submit } from '@/components/submit'

function toSlug(s: string) {
  return s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)
}

export function CreateCentreForm() {
  const [state, action] = useActionState(createCentre, undefined)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [touched, setTouched] = useState(false)
  const shownSlug = touched ? slug : toSlug(name)

  return (
    <form action={action} className="grid gap-5">
      <label className="field">
        <span>Centre name</span>
        <input className="input" name="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Kelas Mengaji Nurul Iman" required />
      </label>
      <label className="field">
        <span>Web address</span>
        <div className="flex items-center rounded-[0.6rem] border border-line bg-white focus-within:border-teal-500">
          <span className="pl-3 text-sm text-faint">/c/</span>
          <input
            className="input border-0 pl-0.5 focus:shadow-none"
            name="slug"
            value={shownSlug}
            onChange={(e) => {
              setTouched(true)
              setSlug(toSlug(e.target.value))
            }}
            required
          />
        </div>
        <small>Lowercase letters, numbers and dashes.</small>
      </label>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="field">
          <span>Phone or WhatsApp</span>
          <input className="input" name="phone" type="tel" placeholder="012-345 6789" />
        </label>
        <label className="field">
          <span>Town or city</span>
          <input className="input" name="city" placeholder="Shah Alam" />
        </label>
      </div>
      {state?.error ? <p className="notice notice-error" role="alert">{state.error}</p> : null}
      <Submit pending="Setting up…">Set up centre</Submit>
    </form>
  )
}
