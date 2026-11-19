import type { Metadata, Viewport } from 'next'
import './globals.css'
import { HydratedMarker } from '@/components/hydrated'
import { ServiceWorkerRegister } from '@/components/pwa'
import { themeScript } from '@/components/theme'

export const metadata: Metadata = {
  title: { default: 'Bintang Class', template: '%s · Bintang Class' },
  description: 'Run your Quran class: students, Iqra levels, attendance and parents in one place.',
  applicationName: 'Bintang Class',
  appleWebApp: { capable: true, title: 'Bintang Class', statusBarStyle: 'black' },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: '/icons/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180' }],
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#10213d' },
    { media: '(prefers-color-scheme: dark)', color: '#0a1529' },
  ],
  colorScheme: 'light dark',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

// Keeps Android's install prompt if it fires before React has loaded.
const captureInstallPrompt = `window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();window.__bcInstall=e;window.dispatchEvent(new Event('bc-install-ready'))});`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script dangerouslySetInnerHTML={{ __html: captureInstallPrompt }} />
      </head>
      <body className="min-h-dvh">
        <HydratedMarker />
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  )
}
