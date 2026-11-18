'use client'

import { useActionState, useEffect, useState } from 'react'
import { createInvite } from '@/app/c/[slug]/actions'
import { Submit } from './submit'
import { inviteMessage } from '@/lib/invite'

export function ShareInvite({ link, message }: { link: string; message: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="grid gap-2">
      <input className="input text-sm" readOnly value={link} onFocus={(e) => e.currentTarget.select()} aria-label="Invitation link" />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn btn-quiet"
          onClick={async () => {
            await navigator.clipboard.writeText(link)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
          }}
        >
          {copied ? 'Copied' : 'Copy link'}
        </button>
        <a className="btn btn-primary" href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer">
          Send on WhatsApp
        </a>
      </div>
    </div>
  )
}

export function InviteForm({
  slug,
  centreName,
  roles,
  studentId,
  childName,
}: {
  slug: string
  centreName: string
  roles: ('admin' | 'teacher' | 'parent')[]
  studentId?: string
  childName?: string
}) {
  const [state, action] = useActionState(createInvite, undefined)
  const [origin, setOrigin] = useState('')
  const [role, setRole] = useState(roles[0])
  useEffect(() => setOrigin(window.location.origin), [])
  const link = state?.token ? `${origin}/invite/${state.token}` : ''

  return (
    <div className="grid gap-4">
      <form action={action} className="grid gap-4">
        <input type="hidden" name="slug" value={slug} />
        {studentId ? <input type="hidden" name="student_id" value={studentId} /> : null}
        <label className="field">
          <span>Their email</span>
          <input className="input" type="email" name="email" placeholder="name@example.com" required />
          <small>They sign in with this email to accept.</small>
        </label>
        {roles.length > 1 ? (
          <label className="field">
            <span>Joins as</span>
            <select className="input" name="role" value={role} onChange={(e) => setRole(e.target.value as typeof role)}>
              {roles.map((r) => (
                <option key={r} value={r}>{r === 'admin' ? 'Admin (runs the centre with you)' : r === 'teacher' ? 'Teacher' : 'Parent'}</option>
              ))}
            </select>
          </label>
        ) : (
          <input type="hidden" name="role" value={roles[0]} />
        )}
        {state?.error ? <p className="notice notice-error" role="alert">{state.error}</p> : null}
        <Submit pending="Creating…">Create invitation</Submit>
      </form>
      {state?.token && link ? (
        <div className="grid gap-3 rounded-xl bg-teal-50 p-4">
          <p className="text-sm font-semibold text-teal-700">{state.ok} Send them this link; it works once and expires in 14 days.</p>
          <ShareInvite link={link} message={inviteMessage(centreName, role, link, childName)} />
        </div>
      ) : null}
    </div>
  )
}
