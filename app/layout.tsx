import type { Metadata, Viewport } from 'next'
import './globals.css'
import { HydratedMarker } from '@/components/hydrated'
import { ServiceWorkerRegister } from '@/components/pwa'
import { themeScript } from '@/components/theme'
import { NavProgress } from '@/components/nav-progress'
import { OfflineStatus } from '@/components/offline'
import { Suspense } from 'react'

export const metadata: Metadata = {
  title: { default: 'Bintang Class', template: '%s · Bintang Class' },
  description: 'Run your Quran class: students, Iqra levels, attendance and parents in one place.',
  applicationName: 'Bintang Class',
  appleWebApp: {
    capable: true,
    title: 'Bintang Class',
    statusBarStyle: 'black',
    // iPhone launch screens: navy with the star while the app opens
    startupImage: [
      { url: '/splash/1320x2868.png', media: '(device-width: 440px) and (device-height: 956px) and (-webkit-device-pixel-ratio: 3)' },
      { url: '/splash/1206x2622.png', media: '(device-width: 402px) and (device-height: 874px) and (-webkit-device-pixel-ratio: 3)' },
      { url: '/splash/1290x2796.png', media: '(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)' },
      { url: '/splash/1179x2556.png', media: '(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3)' },
      { url: '/splash/1284x2778.png', media: '(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3)' },
      { url: '/splash/1170x2532.png', media: '(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)' },
      { url: '/splash/1242x2688.png', media: '(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3)' },
      { url: '/splash/1125x2436.png', media: '(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)' },
      { url: '/splash/828x1792.png', media: '(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2)' },
      { url: '/splash/750x1334.png', media: '(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)' },
    ],
  },
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
        <Suspense fallback={null}><NavProgress /></Suspense>
        <OfflineStatus />
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  )
}
