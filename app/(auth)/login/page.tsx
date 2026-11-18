import { AuthShell } from '../auth-shell'
import { LoginForm } from './login-form'
import { safeNext } from '@/lib/origin'

export const metadata = { title: 'Sign in' }

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams
  return (
    <AuthShell title="Sign in" lead="Welcome back. Your centres are where you left them.">
      {error ? <p className="notice notice-error mb-4">That link has expired or was already used. Sign in again.</p> : null}
      <LoginForm next={safeNext(next)} />
    </AuthShell>
  )
}
