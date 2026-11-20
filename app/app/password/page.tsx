import { requireUser } from '@/lib/centre'
import { AuthShell } from '@/app/(auth)/auth-shell'
import { PasswordForm } from './password-form'

export const metadata = { title: 'New password' }

// Reached from the reset email (signed in by its one-time link) or from the account menu.
export default async function NewPasswordPage() {
  await requireUser()
  return (
    <AuthShell title="Choose a new password" lead="At least 8 characters. You’ll use it the next time you sign in.">
      <PasswordForm />
    </AuthShell>
  )
}
