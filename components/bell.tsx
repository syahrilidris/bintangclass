import Link from 'next/link'

/** Bell with a count of what's new. Links to the notifications page. */
export function Bell({ href, count, tone = 'onNavy' }: { href: string; count: number; tone?: 'onNavy' }) {
  const label = count ? `Notifications, ${count} new` : 'Notifications'
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${tone === 'onNavy' ? 'bg-white/10 text-white hover:bg-white/15' : ''}`}
    >
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M6 9a6 6 0 1 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9zM10 20a2.2 2.2 0 0 0 4 0" />
      </svg>
      {count ? (
        <span className="absolute -right-0.5 -top-0.5 min-w-[1.15rem] rounded-full bg-brass px-1 text-center text-[0.65rem] font-bold leading-[1.15rem] text-navy-950 ring-2 ring-navy-900">
          {count > 9 ? '9+' : count}
        </span>
      ) : null}
    </Link>
  )
}
