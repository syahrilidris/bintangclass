import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireUser, ROLE_LABEL, type Role } from '@/lib/centre'
import { Logo, Star } from '@/components/star'

export const metadata = { title: 'Your centres' }

// After sign-in: go straight to your only centre, or choose between several, or set one up.
export default async function AppHome() {
  const { supabase, user } = await requireUser()
  const { data: rows } = await supabase
    .from('memberships')
    .select('role, centres(name, slug, city, status)')
    .eq('user_id', user.id)
    .order('created_at')

  const centres = (rows ?? []).filter((r) => r.centres)
  if (centres.length === 1) redirect(`/c/${centres[0].centres!.slug}`)

  return (
    <main className="mx-auto max-w-2xl px-6 py-8">
      <header className="flex items-center justify-between">
        <Logo />
        <form action="/auth/signout" method="post">
          <button className="text-sm text-muted hover:text-ink">Sign out</button>
        </form>
      </header>

      {centres.length === 0 ? (
        <section className="mt-16">
          <h1 className="page-title">Set up your centre</h1>
          <p className="mt-2 max-w-md text-muted">
            You’re not part of a centre yet. Start one now, or open the invite link your centre sent you.
          </p>
          <Link href="/app/new" className="btn btn-primary mt-6">Set up a centre</Link>
        </section>
      ) : (
        <section className="mt-12">
          <h1 className="page-title">Choose a centre</h1>
          <ul className="panel rows mt-6">
            {centres.map((r) => (
              <li key={r.centres!.slug}>
                <Link href={`/c/${r.centres!.slug}`} className="flex items-center gap-4 px-5 py-4 hover:bg-paper">
                  <Star size={22} fill="var(--color-teal-600)" />
                  <span className="flex-1">
                    <span className="block font-semibold">{r.centres!.name}</span>
                    <span className="text-sm text-muted">
                      {ROLE_LABEL[r.role as Role]}
                      {r.centres!.city ? `, ${r.centres!.city}` : ''}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <Link href="/app/new" className="link mt-6 inline-block text-sm">Set up another centre</Link>
        </section>
      )}
    </main>
  )
}
