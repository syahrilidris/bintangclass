import { Star } from '@/components/star'
import { RetryButton } from './retry'

export const metadata = { title: 'No connection' }
export const dynamic = 'force-static'

// Shown by the service worker when a page can't load because the phone is offline.
export default function Offline() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-navy-900 px-8 text-center text-white">
      <Star size={56} fill="var(--color-brass)" />
      <h1 className="mt-8 text-2xl font-bold">No connection</h1>
      <p className="mt-3 max-w-xs text-white/75">
        Bintang Class needs the internet to open your centre. Check your Wi-Fi or mobile data, then try again.
      </p>
      <RetryButton />
    </main>
  )
}
