'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { signUp } from '../actions'
import { Submit } from '@/components/submit'

export function SignupForm({ next, email }: { next: string; email?: string }) {
  const [state, action] = useActionState(signUp, undefined)

  if (state?.sent) {
    return (
      <div className="notice notice-info">
        Almost there. We sent a confirmation link to <strong>{state.sent}</strong>. Open it to finish creating your account.
      </div>
    )
  }

  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="next" value={next} />
      <label className="field">
        <span>Your name</span>
        <input className="input" name="full_name" autoComplete="name" placeholder="e.g. Ustazah Nurul Huda" required />
        <small>Shown to teachers and parents at your centre.</small>
      </label>
      <label className="field">
        <span>Email</span>
        <input className="input" type="email" name="email" autoComplete="email" defaultValue={email} required />
      </label>
      <label className="field">
        <span>Password</span>
        <input className="input" type="password" name="password" autoComplete="new-password" minLength={8} required />
        <small>At least 8 characters.</small>
      </label>
      {state?.error ? <p className="notice notice-error" role="alert">{state.error}</p> : null}
      {state?.exists ? (
        <div className="notice notice-warn grid gap-3" role="alert">
          <p>
            <strong>This email already has an account.</strong> Sign in with it instead. No new email was sent.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link href={`/login?next=${encodeURIComponent(next)}`} className="btn btn-primary min-h-10">Sign in</Link>
            <Link href="/forgot" className="btn btn-quiet min-h-10">Forgot password?</Link>
          </div>
        </div>
      ) : null}
      <Submit pending="Creating account…">Create account</Submit>
      <p className="text-sm text-muted">
        Already have an account?{' '}
        <Link className="link" href={`/login?next=${encodeURIComponent(next)}`}>
          Sign in
        </Link>
      </p>
    </form>
  )
}
