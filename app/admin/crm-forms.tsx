'use client'

import { useActionState, useState } from 'react'
import { addLead, addNote, saveAccount, setCentrePlan } from './actions'
import { Submit } from '@/components/submit'
import { FormMessage } from '@/components/form-message'
import { useHydrated } from '@/components/hydrated'
import { keepFormSubmit } from '@/components/use-keep-form'
import { STAGES, STAGE_LABEL } from '@/lib/stages'

type Account = {
  id: string
  name: string
  stage: string
  contact_name: string | null
  contact_phone: string | null
  contact_email: string | null
  city: string | null
  source: string | null
  next_follow_up: string | null
}

export function AccountForm({ a }: { a: Account }) {
  const hydrated = useHydrated()
  const [state, action, busy] = useActionState(saveAccount, undefined)
  const [stage, setStage] = useState(a.stage)
  return (
    <form onSubmit={keepFormSubmit(action)} className="grid gap-4">
      <input type="hidden" name="id" value={a.id} />
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="field">
          <span>Name</span>
          <input className="input" name="name" defaultValue={a.name} required />
        </label>
        <label className="field">
          <span>Stage</span>
          <select className="input" name="stage" value={stage} onChange={(e) => setStage(e.target.value)}>
            {STAGES.map((s) => <option key={s} value={s}>{STAGE_LABEL[s]}</option>)}
          </select>
        </label>
        <label className="field">
          <span>Contact person</span>
          <input className="input" name="contact_name" defaultValue={a.contact_name ?? ''} />
        </label>
        <label className="field">
          <span>Phone or WhatsApp</span>
          <input className="input" name="contact_phone" type="tel" defaultValue={a.contact_phone ?? ''} />
        </label>
        <label className="field">
          <span>Email</span>
          <input className="input" name="contact_email" type="email" defaultValue={a.contact_email ?? ''} />
        </label>
        <label className="field">
          <span>Town or city</span>
          <input className="input" name="city" defaultValue={a.city ?? ''} />
        </label>
        <label className="field">
          <span>Came from</span>
          <input className="input" name="source" defaultValue={a.source ?? ''} placeholder="e.g. referral, mosque visit, website" />
        </label>
        <label className="field">
          <span>Next follow-up</span>
          <input className="input" name="next_follow_up" type="date" defaultValue={a.next_follow_up ?? ''} />
        </label>
      </div>
      <FormMessage state={state} />
      <div><Submit pending="Saving…" disabled={!hydrated} busy={busy}>Save contact</Submit></div>
    </form>
  )
}

export function NoteForm({ accountId }: { accountId: string }) {
  const hydrated = useHydrated()
  const [state, action] = useActionState(addNote, undefined)
  const [kind, setKind] = useState('call')
  return (
    <form action={action} className="grid gap-3" key={state?.ok}>
      <input type="hidden" name="account_id" value={accountId} />
      <input type="hidden" name="kind" value={kind} />
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Kind of note">
        {[['call', 'Call'], ['whatsapp', 'WhatsApp'], ['meeting', 'Meeting'], ['note', 'Note']].map(([k, l]) => (
          <button key={k} type="button" role="radio" aria-checked={kind === k} onClick={() => setKind(k)}
            className={`rounded-full px-3 py-1 text-sm font-semibold ${kind === k ? 'bg-solid text-white' : 'border border-line text-muted hover:text-ink'}`}>
            {l}
          </button>
        ))}
      </div>
      <textarea className="input min-h-20" name="body" placeholder="What was said, what was promised, what’s next." />
      <FormMessage state={state} />
      <div><Submit pending="Adding…" disabled={!hydrated}>Add note</Submit></div>
    </form>
  )
}

export function PlanForm({ centreId, plan, status }: { centreId: string; plan: string; status: string }) {
  const hydrated = useHydrated()
  const [state, action, busy] = useActionState(setCentrePlan, undefined)
  const [p, setP] = useState(plan)
  const [s, setS] = useState(status)
  return (
    <form onSubmit={keepFormSubmit(action)} className="grid gap-4">
      <input type="hidden" name="centre_id" value={centreId} />
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="field">
          <span>Plan</span>
          <select className="input" name="plan" value={p} onChange={(e) => setP(e.target.value)}>
            <option value="free">Free (up to 10 students)</option>
            <option value="centre">Centre (paid per student)</option>
          </select>
        </label>
        <label className="field">
          <span>Status</span>
          <select className="input" name="status" value={s} onChange={(e) => setS(e.target.value)}>
            <option value="active">Active</option>
            <option value="read_only">Read-only (unpaid, nothing deleted)</option>
            <option value="closed">Closed</option>
          </select>
        </label>
      </div>
      <FormMessage state={state} />
      <div><Submit pending="Saving…" disabled={!hydrated} busy={busy}>Save plan</Submit></div>
    </form>
  )
}

export function LeadForm() {
  const hydrated = useHydrated()
  const [state, action] = useActionState(addLead, undefined)
  return (
    <form action={action} className="grid gap-4">
      <label className="field">
        <span>Centre name</span>
        <input className="input" name="name" required placeholder="e.g. Pusat Tahfiz Al-Amin" />
      </label>
      <label className="field">
        <span>Contact person</span>
        <input className="input" name="contact_name" />
      </label>
      <label className="field">
        <span>Phone or WhatsApp</span>
        <input className="input" name="contact_phone" type="tel" />
      </label>
      <label className="field">
        <span>Town or city</span>
        <input className="input" name="city" />
      </label>
      <label className="field">
        <span>Came from</span>
        <input className="input" name="source" placeholder="e.g. referral, mosque visit" />
      </label>
      <label className="field">
        <span>Next follow-up</span>
        <input className="input" name="next_follow_up" type="date" />
      </label>
      <FormMessage state={state} />
      <Submit pending="Adding…" disabled={!hydrated}>Add lead</Submit>
    </form>
  )
}
