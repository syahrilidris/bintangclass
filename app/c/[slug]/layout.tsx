import Link from 'next/link'
import { getCentre, ROLE_LABEL } from '@/lib/centre'
import { Logo, Star } from '@/components/star'
import { SideNav, TabBar, type NavItem } from './nav'
import { InstallBanner, InstallLink } from '@/components/pwa'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { centre } = await getCentre(slug)
  return { title: { default: centre.name, template: `%s · ${centre.name}` } }
}

export default async function CentreLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { centre, role, myName, user, isManager, isStaff, supabase } = await getCentre(slug)
  const root = `/c/${slug}`

  const { count: waiting } = isStaff
    ? await supabase.from('submissions').select('id', { count: 'exact', head: true }).eq('centre_id', centre.id).is('reviewed_at', null)
    : { count: 0 }
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

  const { count } = await supabase.from('memberships').select('centre_id', { count: 'exact', head: true }).eq('user_id', user.id)
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
        <nav className="mt-6" aria-label="Centre">
          <SideNav items={items} root={root} />
        </nav>
        <div className="mt-auto border-t border-white/10 px-2 pt-4">
          <p className="truncate text-sm text-white/80">{myName || user.email}</p>
          <div className="mt-1 flex gap-4">
            <form action="/auth/signout" method="post">
              <button className="text-xs text-white/50 hover:text-white">Sign out</button>
            </form>
            <InstallLink className="text-xs text-white/50 hover:text-white" />
          </div>
        </div>
      </aside>
      </div>

      <div className="min-w-0">
        <header className="sticky top-0 z-10 flex items-center justify-between gap-3 bg-navy-900 px-5 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] lg:hidden">
          <Link href={root} className="flex min-w-0 items-center gap-2">
            <Star size={22} fill="var(--color-brass)" />
            <span className="truncate font-semibold text-white">{centre.name}</span>
          </Link>
          {role === 'owner' ? (
            <Link href={`${root}/settings`} className="shrink-0 text-xs font-semibold text-teal-100">Settings</Link>
          ) : manyCentres ? (
            <Link href="/app" className="shrink-0 text-xs font-semibold text-teal-100">Switch</Link>
          ) : (
            <form action="/auth/signout" method="post"><button className="text-xs text-white/60">Sign out</button></form>
          )}
        </header>

        {centre.status !== 'active' ? (
          <div className="notice notice-warn mx-5 mt-5 lg:mx-10">
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
      <TabBar items={items} root={root} />
    </div>
  )
}
