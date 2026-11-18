import { headers } from 'next/headers'

/** The site's own origin, for links in emails and invite links. */
export async function getOrigin(): Promise<string> {
  const h = await headers()
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000'
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https')
  return `${proto}://${host}`
}

/** Only allow redirects to paths on this site. */
export function safeNext(next: unknown, fallback = '/app'): string {
  return typeof next === 'string' && next.startsWith('/') && !next.startsWith('//') ? next : fallback
}
