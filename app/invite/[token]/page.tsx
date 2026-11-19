import Link from 'next/link'
import { SignOutButton } from '@/components/offline'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { displayName, ROLE_LABEL, type Role } from '@/lib/centre'
import { Logo, Star } from '@/components/star'
import { Submit } from '@/components/submit'

export const metadata = { title: 'Invitation' }

const ROLE_LINE: Record<string, string> = {
  admin: 'help run the centre: students, classes, teachers and parents',
  teacher: 'teach classes: attendance, reading levels and practice',
  parent: 'follow your child’s reading, attendance and teacher’s notes',
}

async function accept(form: FormData) {
  'use server'
  const token = String(form.get('token'))
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) redirect(`/login?next=/invite/${token}`)
  const { data: centreId, error } = await supabase.rpc('accept_invite', {
    p_token: token,
    p_display_name: displayName(auth.user),
  })
  if (error || !centreId) redirect(`/invite/${token}?error=${encodeURIComponent(error?.message ?? 'failed')}`)
  const { data: centre } = await supabase.from('centres').select('slug').eq('id', centreId).single()
  redirect(centre ? `/c/${centre.slug}` : '/app')
}

export default async function InvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>
  searchParams: Promise<{ error?: string }>
}) {
  const { token } = await params
  const { error } = await searchParams
  const supabase = await createClient()
  const [{ data: info }, { data: auth }] = await Promise.all([
    supabase.rpc('invite_info', { p_token: token }),
    supabase.auth.getUser(),
  ])
  const invite = info?.[0]
  const user = auth.user
  const here = `/invite/${token}`

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col px-6 py-8">
      <Link href="/"><Logo /></Link>
      <div className="flex flex-1 flex-col justify-center py-12">
        {!invite ? (
          <>
            <h1 className="page-title">This invitation can’t be used</h1>
            <p className="mt-3 text-muted">
              It has expired, was already accepted, or the link is incomplete. Ask your centre to send a new one.
            </p>
          </>
        ) : (
          <>
            <Star size={40} fill="var(--color-brass)" />
            <h1 className="page-title mt-6">Join {invite.centre_name}</h1>
            <p className="mt-3 text-muted">
              You’re invited as <strong className="text-ink">{ROLE_LABEL[invite.role as Role].toLowerCase()}</strong>, to{' '}
              {ROLE_LINE[invite.role]}.
            </p>
            <p className="mt-1 text-sm text-faint">Sent to {invite.email}</p>

            <div className="mt-8">
              {error ? <p className="notice notice-error mb-4">{error}</p> : null}
              {!user ? (
                <div className="grid gap-3">
                  <Link href={`/signup?next=${encodeURIComponent(here)}&email=${encodeURIComponent(invite.email)}`} className="btn btn-primary">
                    Create account and join
                  </Link>
                  <Link href={`/login?next=${encodeURIComponent(here)}`} className="btn btn-quiet">
                    I already have an account
                  </Link>
                </div>
              ) : user.email?.toLowerCase() !== invite.email.toLowerCase() ? (
                <div className="grid gap-3">
                  <p className="notice notice-warn">
                    You’re signed in as {user.email}, but this invitation is for {invite.email}. Sign out, then open this link
                    again and sign in with {invite.email}.
                  </p>
                  <SignOutButton className="btn btn-quiet w-full" label="Sign out" />
                </div>
              ) : (
                <form action={accept}>
                  <input type="hidden" name="token" value={token} />
                  <Submit pending="Joining…" className="btn btn-primary w-full">Join {invite.centre_name}</Submit>
                </form>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  )
}
