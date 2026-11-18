import Link from 'next/link'
import { Logo, Star } from '@/components/star'

// Two-column frame for sign-in pages: the form on the left, a quiet navy panel with the star field on the right.
export function AuthShell({ title, lead, children }: { title: string; lead?: string; children: React.ReactNode }) {
  return (
    <main className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
      <section className="flex flex-col px-6 py-8 sm:px-12">
        <Link href="/" className="self-start">
          <Logo />
        </Link>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">
          <h1 className="text-[1.75rem] font-bold">{title}</h1>
          {lead ? <p className="mt-2 text-muted">{lead}</p> : null}
          <div className="mt-8">{children}</div>
        </div>
      </section>
      <aside className="relative hidden overflow-hidden bg-navy-900 lg:block" aria-hidden>
        <StarField />
        <div className="absolute inset-x-12 bottom-12 max-w-sm text-white/85">
          <p className="text-lg font-semibold text-white">Every child’s reading, page by page.</p>
          <p className="mt-2 text-white/70">
            Levels, attendance and practice for your kelas mengaji, shared with the parents who need to see it.
          </p>
        </div>
      </aside>
    </main>
  )
}

function StarField() {
  // A sparse lattice of stars, brightest near the top, like the sky after Maghrib.
  const stars: { x: number; y: number; s: number; o: number }[] = []
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 6; c++) {
      const offset = r % 2 ? 0.5 : 0
      stars.push({ x: (c + offset) * 18 + 4, y: r * 11 + 4, s: r === 2 && c === 3 ? 44 : 10 + ((r * 7 + c * 3) % 5) * 3, o: Math.max(0.12, 0.7 - r * 0.07) })
    }
  }
  return (
    <div className="absolute inset-0">
      {stars.map((s, i) => (
        <span key={i} className="absolute" style={{ left: `${s.x}%`, top: `${s.y}%`, opacity: s.o }}>
          <Star size={s.s} fill={s.s > 40 ? 'var(--color-brass)' : 'var(--color-navy-700)'} />
        </span>
      ))}
    </div>
  )
}
