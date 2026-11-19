import type { MetadataRoute } from 'next'

// Lets phones install Bintang Class as an app: own icon, opens full-screen, no browser bar.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/app',
    name: 'Bintang Class',
    short_name: 'Bintang Class',
    description: 'Your kelas mengaji in one place: Iqra levels, attendance, practice at home and parents.',
    start_url: '/app',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#10213d',
    theme_color: '#10213d',
    lang: 'en-MY',
    categories: ['education'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
