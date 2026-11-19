import Link from 'next/link'
import { requirePlatformAdmin } from '@/lib/platform'
import { Logo, Star } from '@/components/star'
import { ThemeSwitch } from '@/components/theme'
import { AdminTabBar, AdminTopNav } from './admin-nav'

export const metadata = { title: { default: 'Platform', template: '%s · Platform · Bintang Class' } }

// The platform admin's own space: every centre's numbers and the CRM. No children's data here.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, supabase } = await requirePlatformAdmin()
  const { count: mine } = await supabase.from('memberships').select('centre_id', { count: 'exact', head: true }).eq('user_id', user.id)
  return (
    <div className="min-h-dvh">
      <header className="bg-navy-900 pt-[env(safe-area-inset-top)] text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 pb-9 pt-3.5 md:pb-3.5 lg:px-10">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/admin" className="hidden sm:block"><Logo light /></Link>
            <Link href="/admin" className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 sm:hidden" aria-label="Bintang Class">
              <Star size={20} fill="var(--color-brass)" />
            </Link>
            <span className="rounded-full bg-brass px-2.5 py-0.5 text-xs font-bold text-navy-950">Platform</span>
          </div>
          <AdminTopNav />
          <div className="flex shrink-0 items-center gap-2">
            <ThemeSwitch tone="onNavy" compact />
            <details className="relative">
              <summary className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-full bg-teal-600 text-xs font-bold [&::-webkit-details-marker]:hidden" aria-label="Account">
                {(user.email ?? '?').slice(0, 1).toUpperCase()}
              </summary>
              <div className="absolute right-0 z-30 mt-2 w-60 rounded-xl border border-line bg-raised p-2 text-ink shadow-[var(--shadow-float)]">
                <p className="truncate px-3 py-2 text-sm text-muted">{user.email}</p>
                {mine ? <Link href="/app" className="block rounded-lg px-3 py-2 text-sm font-medium hover:bg-paper">Centres you belong to</Link> : null}
                <form action="/auth/signout" method="post">
                  <button className="block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-danger hover:bg-danger-soft">Sign out</button>
                </form>
              </div>
            </details>
          </div>
        </div>
      </header>
      <div className="sheet md:mt-0 md:rounded-none">
        <main className="mx-auto max-w-6xl px-5 pb-28 pt-6 md:pb-16 md:pt-8 lg:px-10">{children}</main>
      </div>
      <AdminTabBar />
    </div>
  )
}
