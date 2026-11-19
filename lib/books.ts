// Reading levels. Centres in Malaysia mostly follow Iqra 1–6, then move on to the Quran itself.
// Pages per Iqra book follow the common printed edition; centres can still enter any page.
export const BOOKS = [
  { name: 'Iqra 1', pages: 32 },
  { name: 'Iqra 2', pages: 32 },
  { name: 'Iqra 3', pages: 32 },
  { name: 'Iqra 4', pages: 32 },
  { name: 'Iqra 5', pages: 32 },
  { name: 'Iqra 6', pages: 32 },
  { name: 'Al-Quran', pages: 604 },
] as const

export type BookName = (typeof BOOKS)[number]['name']

export function bookIndex(book: string): number {
  const i = BOOKS.findIndex((b) => b.name === book)
  return i === -1 ? 0 : i
}

export function bookPages(book: string): number {
  return BOOKS[bookIndex(book)].pages
}

/** 0..1 within the current book */
export function pageFraction(book: string, page: number): number {
  const pages = bookPages(book)
  return Math.max(0, Math.min(1, page / pages))
}

/** Short label for a level, e.g. "Iqra 3, page 14" or "Al-Quran, page 212" */
export function levelLabel(book: string, page: number): string {
  return `${book}, page ${page}`
}
