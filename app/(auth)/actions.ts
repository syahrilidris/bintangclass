'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getOrigin, safeNext } from '@/lib/origin'

export type AuthState = { error?: string; sent?: string } | undefined

function friendly(message: string): string {
  if (/invalid login credentials/i.test(message)) return 'That email and password don’t match. Check both, or use “Email me a sign-in link”.'
  if (/email not confirmed/i.test(message)) return 'Confirm your email first: open the link we sent you, then sign in.'
  if (/already registered/i.test(message)) return 'There’s already an account with this email. Sign in instead.'
  if (/password should be at least/i.test(message)) return 'Use a password of at least 8 characters.'
  if (/rate limit/i.test(message)) return 'Too many emails sent to this address. Wait a few minutes and try again.'
  return message
}

export async function signIn(_: AuthState, form: FormData): Promise<AuthState> {
  const email = String(form.get('email') ?? '').trim()
  const password = String(form.get('password') ?? '')
  const next = safeNext(form.get('next'))
  if (!email || !password) return { error: 'Enter your email and password.' }
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { error: friendly(error.message) }
  redirect(next)
}

export async function sendLink(_: AuthState, form: FormData): Promise<AuthState> {
  const email = String(form.get('email') ?? '').trim()
  const next = safeNext(form.get('next'))
  if (!email) return { error: 'Enter your email first.' }
  const supabase = await createClient()
  const origin = await getOrigin()
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`, shouldCreateUser: false },
  })
  if (error) {
    if (/signups not allowed|user not found/i.test(error.message)) return { error: 'No account uses this email yet. Create one instead.' }
    return { error: friendly(error.message) }
  }
  return { sent: email }
}

export async function signUp(_: AuthState, form: FormData): Promise<AuthState> {
  const fullName = String(form.get('full_name') ?? '').trim()
  const email = String(form.get('email') ?? '').trim()
  const password = String(form.get('password') ?? '')
  const next = safeNext(form.get('next'))
  if (!fullName) return { error: 'Enter your name, as students and parents should see it.' }
  if (!email) return { error: 'Enter your email.' }
  if (password.length < 8) return { error: 'Use a password of at least 8 characters.' }
  const supabase = await createClient()
  const origin = await getOrigin()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  })
  if (error) return { error: friendly(error.message) }
  if (data.session) redirect(next)
  return { sent: email }
}

export async function sendReset(_: AuthState, form: FormData): Promise<AuthState> {
  const email = String(form.get('email') ?? '').trim()
  if (!email) return { error: 'Enter the email you sign in with.' }
  const supabase = await createClient()
  const origin = await getOrigin()
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=${encodeURIComponent('/app/password')}`,
  })
  // Same answer whether or not the email has an account, so nobody can check who uses the app.
  if (error && /rate limit/i.test(error.message)) return { error: friendly(error.message) }
  return { sent: email }
}

export async function setPassword(_: AuthState, form: FormData): Promise<AuthState> {
  const password = String(form.get('password') ?? '')
  if (password.length < 8) return { error: 'Use a password of at least 8 characters.' }
  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password })
  if (error) {
    if (/different from the old/i.test(error.message)) return { error: 'Choose a password you haven’t used here before.' }
    return { error: friendly(error.message) }
  }
  return { sent: 'changed' }
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/')
}
