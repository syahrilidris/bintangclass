import type { Metadata, Viewport } from 'next'
import './globals.css'
import { HydratedMarker } from '@/components/hydrated'

export const metadata: Metadata = {
  title: { default: 'Bintang Class', template: '%s · Bintang Class' },
  description: 'Run your Quran class: students, Iqra levels, attendance and parents in one place.',
}

export const viewport: Viewport = {
  themeColor: '#10213d',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh">
        <HydratedMarker />
        {children}
      </body>
    </html>
  )
}
