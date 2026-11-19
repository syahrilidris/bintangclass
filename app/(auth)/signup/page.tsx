import { AuthShell } from '../auth-shell'
import { SignupForm } from './signup-form'
import { safeNext } from '@/lib/origin'

export const metadata = { title: 'Create account' }

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ next?: string; email?: string }> }) {
  const { next, email } = await searchParams
  return (
    <AuthShell title="Create your account" lead="Free for up to 10 students. Set up your centre in a couple of minutes.">
      <SignupForm next={safeNext(next)} email={email} />
    </AuthShell>
  )
}
