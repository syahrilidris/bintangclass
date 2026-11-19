'use client'

import { useEffect, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

/**
 * A thin teal bar across the top the moment an in-app link is tapped, until the next page arrives.
 * Gives instant feedback without splitting pages into separately-loading parts (which would let
 * people type into a form before it is ready).
 */
export function NavProgress() {
  const path = usePathname()
  const search = useSearchParams()
  const [busy, setBusy] = useState(false)

  useEffect(() => setBusy(false), [path, search])

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null
      if (!a || a.target === '_blank' || a.hasAttribute('download')) return
      const url = new URL(a.href, location.href)
      if (url.origin !== location.origin) return
      if (url.pathname === location.pathname && url.search === location.search) return
      setBusy(true)
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [])

  // Safety net: never leave the bar running if a navigation is cancelled.
  useEffect(() => {
    if (!busy) return
    const t = setTimeout(() => setBusy(false), 10000)
    return () => clearTimeout(t)
  }, [busy])

  return (
    <div aria-hidden className={`pointer-events-none fixed inset-x-0 top-0 z-50 h-[3px] overflow-hidden transition-opacity duration-200 ${busy ? 'opacity-100' : 'opacity-0'}`}>
      <div className={`h-full bg-teal-500 shadow-[0_0_8px_var(--color-teal-500)] ${busy ? 'animate-[navbar_1.6s_ease-out_forwards]' : 'w-0'}`} />
    </div>
  )
}
