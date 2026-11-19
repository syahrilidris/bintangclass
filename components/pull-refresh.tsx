'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

const TRIGGER = 72

/** Pull down at the top of the page to refresh, like a phone app. Only in the installed app. */
export function PullToRefresh() {
  const router = useRouter()
  const [pull, setPull] = useState(0)
  const [busy, setBusy] = useState(false)
  const start = useRef<number | null>(null)

  useEffect(() => {
    const installed = matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true
    if (!installed) return
    document.documentElement.classList.add('installed')
    const down = (e: TouchEvent) => {
      start.current = window.scrollY <= 0 && e.touches.length === 1 ? e.touches[0].clientY : null
    }
    const move = (e: TouchEvent) => {
      if (start.current === null) return
      const d = e.touches[0].clientY - start.current
      setPull(d > 0 ? Math.min(110, d * 0.55) : 0)
    }
    const up = () => {
      if (start.current === null) return
      start.current = null
      setPull((p) => {
        if (p >= TRIGGER) {
          setBusy(true)
          if ('vibrate' in navigator) navigator.vibrate?.(8)
          router.refresh()
          setTimeout(() => setBusy(false), 900)
        }
        return 0
      })
    }
    window.addEventListener('touchstart', down, { passive: true })
    window.addEventListener('touchmove', move, { passive: true })
    window.addEventListener('touchend', up)
    return () => {
      window.removeEventListener('touchstart', down)
      window.removeEventListener('touchmove', move)
      window.removeEventListener('touchend', up)
    }
  }, [router])

  const shown = busy ? TRIGGER : pull
  if (!shown) return null
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-40 flex justify-center" style={{ transform: `translateY(${shown - 24}px)` }} aria-hidden>
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-raised shadow-[var(--shadow-float)]">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--color-teal-500)"
          strokeWidth="2.2"
          strokeLinecap="round"
          className={busy ? 'animate-spin' : ''}
          style={busy ? undefined : { transform: `rotate(${(pull / TRIGGER) * 270}deg)`, opacity: Math.min(1, pull / TRIGGER) }}
        >
          <path d="M20 12a8 8 0 1 1-2.3-5.6M20 4v5h-5" />
        </svg>
      </span>
    </div>
  )
}
