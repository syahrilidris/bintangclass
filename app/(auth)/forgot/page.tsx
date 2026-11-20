import { AuthShell } from '../auth-shell'
import { ForgotForm } from './forgot-form'

export const metadata = { title: 'Forgot password' }

export default function ForgotPage() {
  return (
    <AuthShell title="Forgot your password?" lead="Enter your email and we’ll send a link to choose a new one.">
      <ForgotForm />
    </AuthShell>
  )
}
