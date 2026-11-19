'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const ITEMS = [
  { href: '/admin', label: 'Overview', icon: <><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="4.5" rx="1.5" /><rect x="13" y="10.5" width="7" height="9.5" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /></> },
  { href: '/admin/centres', label: 'Centres', icon: <path d="M4 11.5 12 5l8 6.5V20h-5v-5H9v5H4z" /> },
  { href: '/admin/leads', label: 'Leads', icon: <><circle cx="10" cy="8" r="3.5" /><path d="M3.5 20c.8-3.6 3.4-5.5 6.5-5.5 1.3 0 2.5.3 3.5.9M18 14v6M15 17h6" /></> },
]

function active(path: string, href: string) {
  if (href === '/admin') return path === '/admin'
  if (href === '/admin/centres') return path.startsWith('/admin/centres')
  return path.startsWith('/admin/leads') || path.startsWith('/admin/crm')
}

/** Links in the navy header on wide screens. */
export function AdminTopNav() {
  const path = usePathname()
  return (
    <nav className="hidden items-center gap-1 md:flex" aria-label="Platform">
      {ITEMS.map((it) => {
        const on = active(path, it.href)
        return (
          <Link
            key={it.href}
            href={it.href}
            aria-current={on ? 'page' : undefined}
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${on ? 'bg-white/10 text-white' : 'text-white/70 hover:text-white'}`}
          >
            {it.label}
          </Link>
        )
      })}
    </nav>
  )
}

/** Bottom tab bar on phones, same as inside a centre. */
export function AdminTabBar() {
  const path = usePathname()
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden" aria-label="Platform">
      <ul className="mx-auto flex max-w-md justify-around px-2">
        {ITEMS.map((it) => {
          const on = active(path, it.href)
          return (
            <li key={it.href} className="flex-1">
              <Link
                href={it.href}
                aria-current={on ? 'page' : undefined}
                className={`flex flex-col items-center gap-1 px-1 pb-2 pt-2 text-[0.7rem] font-semibold ${on ? 'text-teal-700' : 'text-faint hover:text-muted'}`}
              >
                <span className={`flex h-8 w-14 items-center justify-center rounded-full ${on ? 'bg-teal-50' : ''}`}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    {it.icon}
                  </svg>
                </span>
                {it.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
