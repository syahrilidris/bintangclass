import { BOOKS, bookIndex, pageFraction } from '@/lib/books'
import { Star } from './star'

// A child's journey from Iqra 1 to the Quran: one star per book.
// Finished books are solid brass, the current book fills as pages go by, later books are outlines.
export function StarTrack({ book, page, size = 'md' }: { book: string; page: number; size?: 'sm' | 'md' | 'lg' }) {
  const current = bookIndex(book)
  const frac = pageFraction(book, page)
  const px = size === 'lg' ? 34 : size === 'md' ? 22 : 14
  const gap = size === 'lg' ? 'gap-3' : size === 'md' ? 'gap-1.5' : 'gap-1'
  const label = `${book}, page ${page}. Book ${current + 1} of ${BOOKS.length}.`

  return (
    <div className="flex flex-col gap-1.5" role="img" aria-label={label}>
      <div className={`flex items-center ${gap}`}>
        {BOOKS.map((b, i) => {
          if (i < current) return <Star key={b.name} size={px} fill="var(--color-brass)" />
          if (i > current) return <Star key={b.name} size={px} fill="none" stroke="var(--color-line)" strokeWidth={7} />
          const id = `fill-${b.name.replace(/\W/g, '')}-${Math.round(frac * 100)}`
          return (
            <span key={b.name} className="relative inline-flex" style={{ width: px, height: px }}>
              <svg width={0} height={0} className="absolute">
                <defs>
                  <linearGradient id={id} x1="0" y1="1" x2="0" y2="0">
                    <stop offset={frac} stopColor="var(--color-brass)" />
                    <stop offset={frac} stopColor="var(--color-brass-soft)" />
                  </linearGradient>
                </defs>
              </svg>
              <Star size={px} fill={`url(#${id})`} stroke="var(--color-brass)" strokeWidth={5} />
            </span>
          )
        })}
      </div>
      {size !== 'sm' ? (
        <div className={`flex ${gap} text-[0.7rem] leading-none text-faint`}>
          {BOOKS.map((b, i) => (
            <span key={b.name} className={`text-center ${i === current ? 'font-semibold text-ink' : ''}`} style={{ width: px }}>
              {b.name === 'Al-Quran' ? 'Q' : b.name.replace('Iqra ', '')}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  )
}
