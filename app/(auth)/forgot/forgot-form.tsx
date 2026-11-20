'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { sendReset } from '../actions'
import { Submit } from '@/components/submit'

export function ForgotForm() {
  const [state, action] = useActionState(sendReset, undefined)
  if (state?.sent) {
    return (
      <div className="grid gap-4">
        <p className="notice notice-info" role="status">
          If <strong>{state.sent}</strong> has an account, a link is on its way. Open it on this phone to choose a new password.
        </p>
        <Link href="/login" className="link">Back to sign in</Link>
      </div>
    )
  }
  return (
    <form action={action} className="grid gap-4">
      <label className="field">
        <span>Email</span>
        <input className="input" type="email" name="email" autoComplete="email" required />
      </label>
      {state?.error ? <p className="notice notice-error" role="alert">{state.error}</p> : null}
      <Submit pending="Sending…">Send reset link</Submit>
      <Link href="/login" className="link text-sm">Back to sign in</Link>
    </form>
  )
}
