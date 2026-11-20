'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { setPassword } from '@/app/(auth)/actions'
import { Submit } from '@/components/submit'

export function PasswordForm() {
  const [state, action] = useActionState(setPassword, undefined)
  if (state?.sent) {
    return (
      <div className="grid gap-4">
        <p className="notice notice-info" role="status">Password saved. Use it the next time you sign in.</p>
        <Link href="/app" className="btn btn-primary">Continue</Link>
      </div>
    )
  }
  return (
    <form action={action} className="grid gap-4">
      <label className="field">
        <span>New password</span>
        <input className="input" type="password" name="password" autoComplete="new-password" minLength={8} required />
      </label>
      {state?.error ? <p className="notice notice-error" role="alert">{state.error}</p> : null}
      <Submit pending="Saving…">Save password</Submit>
    </form>
  )
}
