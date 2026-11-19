import Link from 'next/link'
import { requirePlatformAdmin } from '@/lib/platform'
import { Logo } from '@/components/star'
import { ThemeSwitch } from '@/components/theme'

export const metadata = { title: { default: 'Platform', template: '%s · Platform · Bintang Class' } }

// The platform admin's own space: every centre's numbers and the CRM. No children's data here.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requirePlatformAdmin()
  return (
    <div className="min-h-dvh">
      <header className="bg-navy-900 pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-5 py-4 lg:px-10">
          <div className="flex items-center gap-4">
            <Link href="/admin"><Logo light /></Link>
            <span className="rounded-full bg-brass px-2.5 py-0.5 text-xs font-bold text-navy-950">Platform</span>
          </div>
          <nav className="flex items-center gap-5 text-sm font-semibold text-white/75" aria-label="Platform">
            <Link href="/admin" className="hover:text-white">Overview</Link>
            <Link href="/admin/leads" className="hover:text-white">Leads</Link>
            <Link href="/app" className="hover:text-white">Your centres</Link>
            <span className="hidden text-white/45 sm:inline">{user.email}</span>
            <ThemeSwitch tone="onNavy" compact />
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 pb-16 pt-8 lg:px-10">{children}</main>
    </div>
  )
}
