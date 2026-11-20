'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { sendLink, signIn } from '../actions'
import { Submit } from '@/components/submit'

export function LoginForm({ next }: { next: string }) {
  const [state, action] = useActionState(signIn, undefined)
  const [linkState, linkAction] = useActionState(sendLink, undefined)

  if (linkState?.sent) {
    return (
      <div className="notice notice-info">
        We sent a sign-in link to <strong>{linkState.sent}</strong>. Open it on this device to continue.
      </div>
    )
  }

  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="next" value={next} />
      <label className="field">
        <span>Email</span>
        <input className="input" type="email" name="email" autoComplete="email" required />
      </label>
      <label className="field">
        <span className="flex items-baseline justify-between">
          Password
          <Link href="/forgot" className="link text-xs">Forgot password?</Link>
        </span>
        <input className="input" type="password" name="password" autoComplete="current-password" />
      </label>
      {state?.error ? <p className="notice notice-error" role="alert">{state.error}</p> : null}
      {linkState?.error ? <p className="notice notice-error" role="alert">{linkState.error}</p> : null}
      <Submit pending="Signing in…">Sign in</Submit>
      <button formAction={linkAction} formNoValidate className="btn btn-quiet">
        Email me a sign-in link
      </button>
      <p className="text-sm text-muted">
        New to Bintang Class?{' '}
        <Link className="link" href={`/signup?next=${encodeURIComponent(next)}`}>
          Create an account
        </Link>
      </p>
    </form>
  )
}
