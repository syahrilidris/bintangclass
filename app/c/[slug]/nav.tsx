'use client'

import Link, { useLinkStatus } from 'next/link'
import { usePathname } from 'next/navigation'

export type NavItem = { href: string; label: string; icon: 'home' | 'classes' | 'students' | 'people' | 'settings' | 'practice' | 'messages'; badge?: number }

const ICONS: Record<NavItem['icon'], React.ReactNode> = {
  home: <path d="M4 11.5 12 5l8 6.5V20h-5v-5H9v5H4z" />,
  classes: <path d="M4 6h16M4 12h16M4 18h10" />,
  students: <><circle cx="12" cy="8" r="3.5" /><path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5" /></>,
  people: <><circle cx="9" cy="9" r="3" /><circle cx="17" cy="10" r="2.4" /><path d="M3.5 19c.6-3 2.8-4.6 5.5-4.6s4.9 1.6 5.5 4.6M15 15c2.4-.3 4.6.9 5.3 3.6" /></>,
  practice: <><rect x="9" y="3.5" width="6" height="11" rx="3" /><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v2.5" /></>,
  messages: <path d="M4 5.5h16v10.5H9.5L5 19.5v-3.5H4z" />,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8" /></>,
}

function Icon({ name }: { name: NavItem['icon'] }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {ICONS[name]}
    </svg>
  )
}

function isActive(path: string, href: string, root: string) {
  // A child's conversation (/students/<id>/messages) belongs to the Messages tab.
  if (path.endsWith('/messages')) return href.endsWith('/messages')
  return href === root ? path === root : path === href || path.startsWith(href + '/')
}

export function SideNav({ items, root }: { items: NavItem[]; root: string }) {
  const path = usePathname()
  return (
    <ul className="grid gap-0.5">
      {items.map((it) => {
        const active = isActive(path, it.href, root)
        return (
          <li key={it.href}>
            <Link
              href={it.href}
              prefetch
              aria-current={active ? 'page' : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[0.93rem] font-medium transition-colors ${
                active ? 'bg-white/10 text-white shadow-[inset_3px_0_0_var(--color-teal-500)]' : 'text-white/70 hover:bg-white/5 hover:text-white'
              }`}
            >
              <span className={active ? 'text-teal-100' : ''}><Icon name={it.icon} /></span>
              <span className="flex-1">{it.label}</span>
              {it.badge ? <span className="rounded-full bg-brass px-2 text-xs font-bold text-navy-950">{it.badge}</span> : null}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

export function TabBar({ items, root }: { items: NavItem[]; root: string }) {
  const path = usePathname()
  // Phones have room for five tabs: Settings and People live in the account menu there.
  items = items.filter((it) => it.icon !== 'settings' && (items.length <= 5 || it.icon !== 'people'))
  if (items.length < 2) return null
  return (
    <nav data-tour="nav" className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden">
      <ul className="mx-auto flex max-w-md justify-around px-2">
        {items.map((it) => {
          const active = isActive(path, it.href, root)
          return (
            <li key={it.href} className="flex-1">
              <Link
                href={it.href}
                prefetch
                aria-current={active ? 'page' : undefined}
                className={`flex flex-col items-center gap-1 px-1 pb-2 pt-2 text-[0.7rem] font-semibold transition-colors ${active ? 'text-teal-700' : 'text-faint hover:text-muted'}`}
              >
                <TabPill active={active}>
                  <Icon name={it.icon} />
                  {it.badge ? <span className="absolute -top-1 right-1.5 min-w-4 rounded-full bg-brass px-1 text-center text-[0.6rem] leading-4 text-navy-950">{it.badge}</span> : null}
                </TabPill>
                {it.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

/** Lights up as soon as the tab is tapped, before the page has arrived. */
function TabPill({ active, children }: { active: boolean; children: React.ReactNode }) {
  const { pending } = useLinkStatus()
  return (
    <span className={`relative flex h-8 w-14 items-center justify-center rounded-full transition-colors ${active || pending ? 'bg-teal-50 text-teal-700' : ''} ${pending ? 'animate-pulse' : ''}`}>
      {children}
    </span>
  )
}
