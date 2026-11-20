import Link from 'next/link'
import { Tour, TourButton } from '@/components/tour'
import { Suspense } from 'react'
import { RouteSkeleton } from '@/components/route-skeleton'
import { PullToRefresh } from '@/components/pull-refresh'
import { SignOutButton } from '@/components/offline'
import { getCentre, ROLE_LABEL } from '@/lib/centre'
import { Logo, Star } from '@/components/star'
import { SideNav, TabBar, type NavItem } from './nav'
import { InstallBanner, InstallLink } from '@/components/pwa'
import { ThemeSwitch } from '@/components/theme'
import { initials } from '@/lib/people'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { centre } = await getCentre(slug)
  return { title: { default: centre.name, template: `%s · ${centre.name}` } }
}

export default async function CentreLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { centre, role, myName, user, isManager, isStaff, supabase } = await getCentre(slug)
  const root = `/c/${slug}`

  const [{ count: waiting }, { count }] = await Promise.all([
    isStaff
      ? supabase.from('submissions').select('id', { count: 'exact', head: true }).eq('centre_id', centre.id).is('reviewed_at', null)
      : Promise.resolve({ count: 0 }),
    supabase.from('memberships').select('centre_id', { count: 'exact', head: true }).eq('user_id', user.id),
  ])
  const practice: NavItem = { href: `${root}/practice`, label: 'Practice', icon: 'practice', badge: waiting ?? 0 }

  const items: NavItem[] = isManager
    ? [
        { href: root, label: 'Today', icon: 'home' },
        { href: `${root}/classes`, label: 'Classes', icon: 'classes' },
        { href: `${root}/students`, label: 'Students', icon: 'students' },
        practice,
        { href: `${root}/people`, label: 'People', icon: 'people' },
        ...(role === 'owner' ? [{ href: `${root}/settings`, label: 'Settings', icon: 'settings' } as NavItem] : []),
      ]
    : isStaff
      ? [
          { href: root, label: 'Today', icon: 'home' },
          { href: `${root}/classes`, label: 'My classes', icon: 'classes' },
          { href: `${root}/students`, label: 'My students', icon: 'students' },
          practice,
        ]
      : [{ href: root, label: 'My children', icon: 'students' }]

  const manyCentres = (count ?? 0) > 1

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[15.5rem_minmax(0,1fr)]">
      <div className="hidden bg-navy-900 lg:block">
      <aside className="sticky top-0 flex h-dvh flex-col px-4 py-6">
        <Link href={root} className="px-2"><Logo light /></Link>
        <div className="mt-8 rounded-lg bg-navy-950/60 px-3 py-3">
          <p className="truncate font-semibold text-white">{centre.name}</p>
          <p className="text-xs text-white/55">{ROLE_LABEL[role]}{centre.city ? `, ${centre.city}` : ''}</p>
          {manyCentres ? <Link href="/app" className="mt-2 inline-block text-xs font-semibold text-teal-100 hover:underline">Switch centre</Link> : null}
        </div>
        <nav className="mt-6" aria-label="Centre" data-tour="nav">
          <SideNav items={items} root={root} />
        </nav>
        <div className="mt-auto grid gap-4 border-t border-white/10 px-2 pt-4" data-tour="account">
          <ThemeSwitch tone="onNavy" />
          <div>
          <p className="truncate text-sm text-white/80">{myName || user.email}</p>
          <div className="mt-1 flex gap-4">
            <SignOutButton className="text-xs text-white/50 hover:text-white" label="Sign out" />
            <InstallLink className="text-xs text-white/50 hover:text-white" />
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            <TourButton className="text-xs font-semibold text-teal-100 hover:underline" />
            <Link href="/help" className="text-xs text-white/50 hover:text-white">User guide</Link>
            <Link href="/app/password" className="text-xs text-white/50 hover:text-white">Change password</Link>
          </div>
          </div>
        </div>
      </aside>
      </div>

      <div className="min-w-0">
        {/* Phone header: navy band the content sheet rises over (eSchool-style). */}
        <header className="bg-navy-900 px-5 pb-9 pt-[max(0.9rem,env(safe-area-inset-top))] text-white lg:hidden">
          <div className="flex items-center justify-between gap-3">
            <Link href={root} className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10">
                <Star size={20} fill="var(--color-brass)" />
              </span>
              <span className="min-w-0">
                <span className="block truncate font-semibold leading-tight">{centre.name}</span>
                <span className="block text-xs text-white/60">{ROLE_LABEL[role]}</span>
              </span>
            </Link>
            <div className="flex shrink-0 items-center gap-2">
              <ThemeSwitch tone="onNavy" compact />
              <details className="relative" data-tour="account">
                <summary
                  className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-full bg-teal-600 text-xs font-bold [&::-webkit-details-marker]:hidden"
                  aria-label="Account"
                >
                  {initials(myName || user.email || '?')}
                </summary>
                <div className="absolute right-0 z-30 mt-2 w-56 rounded-xl border border-line bg-raised p-2 text-ink shadow-[var(--shadow-float)]">
                  <p className="truncate px-3 py-2 text-sm text-muted">{myName || user.email}</p>
                  <TourButton className="block w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-teal-700 hover:bg-paper" />
                  <Link href="/help" className="block rounded-lg px-3 py-2 text-sm font-medium hover:bg-paper">User guide</Link>
                  <Link href="/app/password" className="block rounded-lg px-3 py-2 text-sm font-medium hover:bg-paper">Change password</Link>
                  {role === 'owner' ? <Link href={`${root}/settings`} className="block rounded-lg px-3 py-2 text-sm font-medium hover:bg-paper">Centre settings</Link> : null}
                  {manyCentres ? <Link href="/app" className="block rounded-lg px-3 py-2 text-sm font-medium hover:bg-paper">Switch centre</Link> : null}
                  <InstallLink className="block w-full rounded-lg px-3 py-2 text-left text-sm font-medium hover:bg-paper" />
                  <SignOutButton className="block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-danger hover:bg-danger-soft" label="Sign out" />
                </div>
              </details>
            </div>
          </div>
        </header>

        <div className="sheet relative lg:mt-0 lg:rounded-none">
          <Suspense fallback={null}><RouteSkeleton /></Suspense>
        {centre.status !== 'active' ? (
          <div className="notice notice-warn mx-5 pt-5 lg:mx-10">
            {centre.status === 'read_only'
              ? 'This centre is read-only until its subscription is paid. You can still view everything; changes are paused.'
              : 'This centre is closed. Records stay viewable, but nothing can be changed.'}
          </div>
        ) : null}

        <main className="mx-auto max-w-5xl px-5 pb-28 pt-6 lg:px-10 lg:pb-12 lg:pt-10">
          <InstallBanner />
          {children}
        </main>
        </div>
      </div>
      <TabBar items={items} root={root} />
      <PullToRefresh />
      <Tour role={role} />
    </div>
  )
}
