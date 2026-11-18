'use client'

import { useEffect, useState } from 'react'
import { Star } from './star'

// ---------- service worker ----------
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {})
  }, [])
  return null
}

// ---------- install ----------
// Chrome/Edge/Samsung on Android fire `beforeinstallprompt`; the root layout's inline script keeps it in
// window.__bcInstall so it isn't missed before React loads. iPhone has no prompt: we show the Share steps.

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }
declare global {
  interface Window {
    __bcInstall?: InstallEvent | null
  }
}

const DISMISS_KEY = 'bc-install-dismissed'
const SHOW_EVENT = 'bc-show-install'

type Platform = 'installed' | 'android' | 'ios-safari' | 'ios-other' | 'other'

function detect(): Platform {
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true
  if (standalone) return 'installed'
  const ua = navigator.userAgent
  const ios = /iPhone|iPad|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1)
  if (ios) return /CriOS|FxiOS|EdgiOS|FBAN|FBAV|Instagram|Line\/|WhatsApp/.test(ua) ? 'ios-other' : 'ios-safari'
  if (/Android/.test(ua)) return 'android'
  return 'other'
}

function dismissedRecently(): boolean {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY) ?? 0)
    return Date.now() - at < 1000 * 60 * 60 * 24 * 30
  } catch {
    return false
  }
}

function ShareIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline -mt-0.5" aria-label="Share">
      <path d="M12 3v12M8 7l4-4 4 4M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
    </svg>
  )
}

export function InstallBanner() {
  const [platform, setPlatform] = useState<Platform | null>(null)
  const [prompt, setPrompt] = useState<InstallEvent | null>(null)
  const [open, setOpen] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    const p = detect()
    setPlatform(p)
    setPrompt(window.__bcInstall ?? null)
    const onPrompt = () => setPrompt(window.__bcInstall ?? null)
    const onShow = () => setOpen(true)
    const onInstalled = () => setDone(true)
    window.addEventListener('bc-install-ready', onPrompt)
    window.addEventListener(SHOW_EVENT, onShow)
    window.addEventListener('appinstalled', onInstalled)
    // Show by default on phones, unless installed or dismissed in the last 30 days.
    if (p !== 'installed' && p !== 'other' && !dismissedRecently()) setOpen(true)
    return () => {
      window.removeEventListener('bc-install-ready', onPrompt)
      window.removeEventListener(SHOW_EVENT, onShow)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  // Desktop Chrome can install too, but only offer it there when the browser says it's possible.
  useEffect(() => {
    if (platform === 'other' && prompt && !dismissedRecently()) setOpen(true)
  }, [platform, prompt])

  if (!platform || platform === 'installed' || !open) return null

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()))
    } catch {}
    setOpen(false)
  }

  async function install() {
    if (!prompt) return
    await prompt.prompt()
    const { outcome } = await prompt.userChoice
    window.__bcInstall = null
    setPrompt(null)
    if (outcome === 'accepted') setDone(true)
  }

  return (
    <section className="mb-6 rounded-xl bg-navy-900 p-4 text-white sm:p-5" aria-label="Install the app">
      <div className="flex items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-navy-950">
          <Star size={30} fill="var(--color-brass)" />
        </span>
        <div className="min-w-0 flex-1">
          {done ? (
            <p className="font-semibold">Installed. Open Bintang Class from your home screen.</p>
          ) : (
            <>
              <p className="font-semibold">Put Bintang Class on your phone</p>
              {prompt ? (
                <p className="mt-0.5 text-sm text-white/70">Opens like an app, full-screen, straight from your home screen.</p>
              ) : platform === 'ios-safari' ? (
                <ol className="mt-1.5 grid gap-1 text-sm text-white/80">
                  <li>1. Tap <ShareIcon /> <strong className="text-white">Share</strong> at the bottom of Safari</li>
                  <li>2. Scroll and tap <strong className="text-white">Add to Home Screen</strong></li>
                  <li>3. Tap <strong className="text-white">Add</strong></li>
                </ol>
              ) : platform === 'ios-other' ? (
                <p className="mt-0.5 text-sm text-white/75">
                  Open this page in <strong className="text-white">Safari</strong>, then tap Share and <strong className="text-white">Add to Home Screen</strong>.
                </p>
              ) : (
                <p className="mt-0.5 text-sm text-white/75">
                  In your browser menu <span aria-hidden>⋮</span>, tap <strong className="text-white">Install app</strong> or{' '}
                  <strong className="text-white">Add to Home screen</strong>.
                </p>
              )}
            </>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {prompt && !done ? (
              <button type="button" onClick={install} className="btn btn-primary">Install app</button>
            ) : null}
            <button type="button" onClick={dismiss} className="btn border border-white/20 text-white/80 hover:text-white">
              {done ? 'Close' : 'Not now'}
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

/** A quiet "Install the app" link that brings the banner back after it was dismissed. */
export function InstallLink({ className }: { className?: string }) {
  const [show, setShow] = useState(false)
  useEffect(() => setShow(detect() !== 'installed'), [])
  if (!show) return null
  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        try {
          localStorage.removeItem(DISMISS_KEY)
        } catch {}
        window.dispatchEvent(new Event(SHOW_EVENT))
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }}
    >
      Install the app
    </button>
  )
}
