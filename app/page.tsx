import Link from 'next/link'
import { Logo } from '@/components/star'
import { StarTrack } from '@/components/star-track'

export default function Home() {
  return (
    <main className="min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Logo />
        <nav className="flex items-center gap-2">
          <Link href="/login" className="btn btn-quiet">Sign in</Link>
          <Link href="/signup" className="btn btn-primary">Start free</Link>
        </nav>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 pb-20 pt-10 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <h1 className="max-w-xl text-[2.4rem] font-bold leading-[1.1] sm:text-[3rem]">
            Know where every child is in their reading.
          </h1>
          <p className="mt-5 max-w-lg text-lg text-muted">
            Bintang Class keeps your kelas mengaji in one place: students and their Iqra level, attendance in one tap,
            and parents who can see their child’s progress without asking.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/signup" className="btn btn-primary">Set up your centre</Link>
            <Link href="/login" className="btn btn-quiet">I was invited</Link>
          </div>
          <p className="mt-4 text-sm text-faint">Free for up to 10 students.</p>
        </div>

        <figure className="panel overflow-hidden">
          <div className="bg-navy-900 px-6 py-4 text-sm text-white/80">Kelas Iqra Pagi, Isnin</div>
          <ul className="rows">
            {[
              { name: 'Aisyah binti Rahman', book: 'Iqra 4', page: 22 },
              { name: 'Muhammad Umar', book: 'Iqra 2', page: 9 },
              { name: 'Nur Iman', book: 'Al-Quran', page: 48 },
            ].map((s) => (
              <li key={s.name} className="flex flex-wrap items-center justify-between gap-4 px-6 py-5">
                <div>
                  <p className="font-semibold">{s.name}</p>
                  <p className="text-sm text-muted">{s.book}, page {s.page}</p>
                </div>
                <StarTrack book={s.book} page={s.page} size="sm" />
              </li>
            ))}
          </ul>
          <figcaption className="border-t border-line px-6 py-3 text-xs text-faint">
            One star per book, from Iqra 1 to the Quran.
          </figcaption>
        </figure>
      </section>
    </main>
  )
}
