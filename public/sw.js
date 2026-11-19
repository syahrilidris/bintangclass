// Bintang Class service worker.
// Makes the app installable and lets it work without signal:
// - Pages inside the app are always fetched fresh when there is a connection. A copy of each page
//   you open is kept so it can still be shown, marked with its time, when there is no connection.
// - Saved pages are wiped on sign-out and when the sign-in page opens (see lib/offline-queue.ts),
//   so nothing private stays on a shared family phone.
// - The app's own code, fonts and icons are cached so it can start offline.

const VERSION = 'v3'
const STATIC = `bc-static-${VERSION}`
const PAGES = 'bc-pages'
const KEEP_PAGES = /^\/(app$|app\/|c\/)/
const PRECACHE = ['/offline.html', '/icons/icon-192.png', '/icons/icon-512.png', '/icons/apple-touch-icon.png']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(STATIC).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('bc-static-') && k !== STATIC).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return // Supabase, audio and everything else go straight to the network

  // Pages: network first. Keep a copy of app pages; with no connection, show the copy or the offline page.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const type = res.headers.get('content-type') || ''
          if (res.ok && !res.redirected && type.includes('text/html') && KEEP_PAGES.test(url.pathname)) {
            const copy = res.clone()
            event.waitUntil(
              copy.text().then((html) =>
                caches.open(PAGES).then((c) =>
                  c.put(url.pathname + url.search, new Response(html, { headers: { 'content-type': type, 'x-bc-saved-at': String(Date.now()) } })),
                ),
              ),
            )
          }
          return res
        })
        .catch(async () => {
          const cache = await caches.open(PAGES)
          const hit = (await cache.match(url.pathname + url.search)) || (await cache.match(url.pathname))
          if (hit) {
            const html = (await hit.text()).replace('<head>', `<head><meta name="bc-saved-at" content="${hit.headers.get('x-bc-saved-at') || ''}">`)
            return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } })
          }
          return caches.match('/offline.html')
        }),
    )
    return
  }

  // Build files (content-hashed, never change) and icons: cache first.
  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone()
              caches.open(STATIC).then((c) => c.put(req, copy))
            }
            return res
          }),
      ),
    )
  }
})

// Messages from the app:
// - 'bc-wipe-pages': forget saved pages (sign-out, sign-in page)
// - { type: 'bc-save-page', url }: keep a copy of a page reached by an in-app link
//   (those load without a full page request, so they aren't saved on the way through).
self.addEventListener('message', (event) => {
  if (event.data === 'bc-wipe-pages') {
    event.waitUntil(caches.delete(PAGES))
    return
  }
  if (event.data && event.data.type === 'bc-save-page') {
    const url = new URL(event.data.url, self.location.origin)
    if (url.origin !== self.location.origin || !KEEP_PAGES.test(url.pathname)) return
    const key = url.pathname + url.search
    event.waitUntil(
      caches.open(PAGES).then(async (cache) => {
        const old = await cache.match(key)
        if (old && Date.now() - Number(old.headers.get('x-bc-saved-at') || 0) < 2 * 60 * 1000) return
        const res = await fetch(url.href, { credentials: 'include', headers: { accept: 'text/html' } }).catch(() => null)
        const type = (res && res.headers.get('content-type')) || ''
        if (!res || !res.ok || res.redirected || !type.includes('text/html')) return
        const html = await res.text()
        await cache.put(key, new Response(html, { headers: { 'content-type': type, 'x-bc-saved-at': String(Date.now()) } }))
      }),
    )
  }
})
