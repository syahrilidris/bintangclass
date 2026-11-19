import Link from 'next/link'

/** Donut showing part of a whole, e.g. classes attended this month. */
export function Ring({ value, total, size = 64, label }: { value: number; total: number; size?: number; label: string }) {
  const stroke = size >= 72 ? 8 : 6
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const pct = total > 0 ? value / total : 0
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-line)" strokeWidth={stroke} />
        {pct > 0 ? (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--color-teal-500)"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${c * pct} ${c}`}
          />
        ) : null}
      </svg>
      <span className="absolute text-sm font-bold text-strong" aria-hidden>
        {total > 0 ? `${Math.round(pct * 100)}%` : '–'}
      </span>
    </span>
  )
}

const TILE_ICONS = {
  attendance: <><rect x="4" y="5" width="16" height="15" rx="2.5" /><path d="M4 9.5h16M8.5 3v4M15.5 3v4M9 14.5l2 2 4-4" /></>,
  mic: <><rect x="9" y="3.5" width="6" height="11" rx="3" /><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v2.5" /></>,
  book: <><path d="M12 6.5c-1.8-1.4-4.3-2-7.5-2v13c3.2 0 5.7.6 7.5 2 1.8-1.4 4.3-2 7.5-2v-13c-3.2 0-5.7.6-7.5 2z" /><path d="M12 6.5v13" /></>,
  student: <><circle cx="12" cy="8" r="3.5" /><path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5" /></>,
  addStudent: <><circle cx="10" cy="8" r="3.5" /><path d="M3.5 20c.8-3.6 3.4-5.5 6.5-5.5 1.3 0 2.5.3 3.5.9M18 14v6M15 17h6" /></>,
  classes: <><rect x="3.5" y="5" width="17" height="12" rx="2" /><path d="M8 21h8M12 17v4" /></>,
  invite: <><path d="M4 6.5h16v11H4z" /><path d="m4.5 7 7.5 6 7.5-6" /></>,
  task: <><path d="M8 4.5h8M6.5 6.5h11v13h-11z" /><path d="m9.5 13 2 2 3.5-4" /></>,
} as const

export type TileIconName = keyof typeof TILE_ICONS

const TONES = {
  teal: 'bg-teal-50 text-teal-700',
  brass: 'bg-brass-soft text-brass-ink',
  navy: 'bg-solid/10 text-strong dark:bg-white/10',
} as const

/** eSchool-style quick action: icon in a soft square, label, optional hint and badge. */
export function Tile({
  href,
  icon,
  label,
  hint,
  tone = 'teal',
  badge,
}: {
  href: string
  icon: TileIconName
  label: string
  hint?: string
  tone?: keyof typeof TONES
  badge?: number
}) {
  return (
    <Link href={href} className="tile">
      <span className="flex items-start justify-between">
        <span className={`tile-icon ${TONES[tone]}`}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            {TILE_ICONS[icon]}
          </svg>
        </span>
        {badge ? <span className="rounded-full bg-brass px-2 py-0.5 text-xs font-bold text-navy-950">{badge}</span> : null}
      </span>
      <span>
        <span className="block font-semibold leading-snug">{label}</span>
        {hint ? <span className="mt-0.5 block text-xs text-muted">{hint}</span> : null}
      </span>
    </Link>
  )
}

/** The greeting card at the top of each home screen: teal-to-navy, the same in both themes. */
export function Hero({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: React.ReactNode }) {
  return (
    <header className="relative overflow-hidden rounded-[var(--radius-card)] bg-[linear-gradient(135deg,#0e7c78_0%,#1a2f52_62%,#10213d_100%)] px-6 py-6 text-white shadow-[var(--shadow-float)] sm:px-8 sm:py-7">
      <svg className="pointer-events-none absolute -right-6 -top-8 h-44 w-44 text-white/[0.07]" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M12 1.5l2.6 4.2 4.8-1.2-1.2 4.8 4.2 2.6-4.2 2.6 1.2 4.8-4.8-1.2L12 22.5l-2.6-4.4-4.8 1.2 1.2-4.8L1.5 12l4.3-2.6-1.2-4.8 4.8 1.2z" />
      </svg>
      {eyebrow ? <p className="text-sm text-white/70">{eyebrow}</p> : null}
      <h1 className="mt-1 text-[1.55rem] font-bold leading-tight sm:text-[1.8rem]">{title}</h1>
      {children ? <div className="relative mt-4">{children}</div> : null}
    </header>
  )
}

export function HeroStat({ value, label }: { value: number | string; label: string }) {
  return (
    <span className="rounded-xl bg-white/10 px-3.5 py-2 backdrop-blur-sm">
      <span className="block text-lg font-bold leading-tight">{value}</span>
      <span className="text-xs text-white/70">{label}</span>
    </span>
  )
}
