import Link from 'next/link'
import { Star } from '@/components/star'

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60dvh] max-w-md flex-col justify-center px-6 py-16">
      <Star size={36} fill="none" stroke="var(--color-faint)" strokeWidth={6} />
      <h1 className="page-title mt-6">Nothing here</h1>
      <p className="mt-2 text-muted">
        This page doesn’t exist, or it belongs to a centre you’re not part of.
      </p>
      <Link href="/app" className="btn btn-primary mt-6 self-start">Go to your centres</Link>
    </main>
  )
}
