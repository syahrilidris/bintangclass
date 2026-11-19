'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { flushQueue, onQueueChange, pendingCount, wipeDevice, wipePages } from '@/lib/offline-queue'

function timeOf(ms: number) {
  return new Intl.DateTimeFormat('en-MY', { hour: 'numeric', minute: '2-digit', day: 'numeric', month: 'short', timeZone: 'Asia/Kuala_Lumpur' }).format(new Date(ms))
}

/**
 * The connection strip at the top of the app:
 * - offline: "You're offline" and, on a saved page, when it was saved
 * - back online with work waiting: sends it, then refreshes the page
 */
export function OfflineStatus() {
  const router = useRouter()
  const path = usePathname()
  const [online, setOnline] = useState(true)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [pending, setPending] = useState(0)
  const [note, setNote] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)
  const sending = useRef(false)

  useEffect(() => {
    const meta = document.querySelector('meta[name="bc-saved-at"]')?.getAttribute('content')
    setSavedAt(meta ? Number(meta) : null)
  }, [path])

  useEffect(() => {
    if (path === '/login' || path === '/signup') {
      wipePages()
      return
    }
    // Keep a copy of this page for offline use (in-app links don't pass through the worker as pages).
    if (navigator.onLine && /^\/(app$|app\/|c\/)/.test(path)) {
      const t = setTimeout(() => navigator.serviceWorker?.controller?.postMessage({ type: 'bc-save-page', url: location.pathname + location.search }), 1500)
      return () => clearTimeout(t)
    }
  }, [path])

  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    const count = () => pendingCount().then(setPending)
    async function send() {
      if (sending.current || !navigator.onLine) return
      if ((await pendingCount()) === 0) return
      sending.current = true
      try {
        const { sent, failed } = await flushQueue()
        if (failed.length) setNote({ tone: 'error', text: failed.join(' ') })
        else if (sent) setNote({ tone: 'ok', text: `Sent ${sent} saved item${sent === 1 ? '' : 's'}.` })
        if (sent || failed.length) router.refresh()
      } catch {
        // try again on the next chance
      } finally {
        sending.current = false
        count()
      }
    }
    const goOnline = () => {
      update()
      send()
    }
    const visible = () => document.visibilityState === 'visible' && send()
    update()
    count()
    send()
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', update)
    document.addEventListener('visibilitychange', visible)
    const off = onQueueChange(count)
    const timer = setInterval(send, 30000)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', update)
      document.removeEventListener('visibilitychange', visible)
      off()
      clearInterval(timer)
    }
  }, [router])

  useEffect(() => {
    if (!note || note.tone === 'error') return
    const t = setTimeout(() => setNote(null), 4000)
    return () => clearTimeout(t)
  }, [note])

  let text: string | null = null
  let tone = 'bg-navy-950 text-white'
  if (!online) {
    text = savedAt ? `You’re offline. Showing this page as it was at ${timeOf(savedAt)}.` : 'You’re offline. What you do now is saved on this phone.'
    if (pending) text += ` ${pending} waiting to send.`
  } else if (pending) {
    text = `Sending ${pending} saved item${pending === 1 ? '' : 's'}…`
    tone = 'bg-brass text-navy-950'
  } else if (note) {
    text = note.text
    tone = note.tone === 'ok' ? 'bg-teal-600 text-white' : 'bg-danger-solid text-white'
  }
  if (!text) return null
  return (
    <div role="status" className={`sticky top-0 z-40 px-4 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))] text-center text-xs font-semibold ${tone}`}>
      {text}
      {note?.tone === 'error' ? <button className="ml-2 underline" onClick={() => setNote(null)}>Dismiss</button> : null}
    </div>
  )
}

/** Sign out, wiping saved pages and kept work from this phone. Warns first if work hasn't been sent. */
export function SignOutButton({ className, label = 'Sign out' }: { className?: string; label?: string }) {
  const [warn, setWarn] = useState(0)
  return (
    <form
      action="/auth/signout"
      method="post"
      onSubmit={async (e) => {
        e.preventDefault()
        const form = e.currentTarget
        const n = await pendingCount()
        if (n && !warn) {
          setWarn(n)
          return
        }
        await wipeDevice()
        form.submit()
      }}
    >
      {warn ? <p className="px-3 pb-1 text-xs text-danger">{warn} item{warn === 1 ? ' hasn’t' : 's haven’t'} been sent yet and will be lost.</p> : null}
      <button className={className}>{warn ? 'Sign out anyway' : label}</button>
    </form>
  )
}
