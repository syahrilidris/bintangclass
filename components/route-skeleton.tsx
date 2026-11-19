'use client'

import { useEffect, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

type Shape = 'home' | 'list' | 'detail'

function shapeFor(path: string): Shape {
  const parts = path.split('/').filter(Boolean) // c, slug, section, id
  if (parts[0] === 'admin') return parts.length === 1 ? 'home' : parts.length === 2 ? 'list' : 'detail'
  if (parts.length <= 2) return 'home'
  if (parts.length === 3) return 'list'
  return 'detail'
}

const bar = 'animate-pulse bg-line/70'
const card = 'panel'

/**
 * The outline of the next page, shown over the current one the moment a link is tapped
 * (if the page takes more than a blink). The real page then replaces it in one piece, so forms
 * are never shown before they're ready to use.
 */
export function RouteSkeleton() {
  const path = usePathname()
  const search = useSearchParams()
  const [target, setTarget] = useState<string | null>(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    setTarget(null)
    setShown(false)
  }, [path, search])

  useEffect(() => {
    const start = (e: Event) => setTarget((e as CustomEvent<string>).detail)
    window.addEventListener('bc-nav-start', start)
    return () => window.removeEventListener('bc-nav-start', start)
  }, [])

  useEffect(() => {
    if (!target) return
    const show = setTimeout(() => setShown(true), 120) // fast pages never flash an outline
    const give = setTimeout(() => setTarget(null), 10000) // never get stuck
    return () => {
      clearTimeout(show)
      clearTimeout(give)
    }
  }, [target])

  if (!target || !shown) return null
  const shape = shapeFor(target)
  return (
    <div className="absolute inset-0 z-10 bg-paper" aria-busy="true" aria-label="Loading">
      <div className="mx-auto grid max-w-5xl gap-6 px-5 pt-6 lg:px-10 lg:pt-10">
        {shape === 'home' ? (
          <>
            <div className="h-36 animate-pulse rounded-[var(--radius-card)] bg-[linear-gradient(135deg,#0e7c78_0%,#1a2f52_62%,#10213d_100%)] opacity-60" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className={`${card} grid gap-3 p-4`}>
                  <div className={`h-10 w-10 rounded-xl ${bar}`} />
                  <div className={`h-3.5 w-3/4 rounded-md ${bar}`} />
                  <div className={`h-3 w-1/2 rounded-md ${bar}`} />
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="grid gap-2">
            <div className={`h-3.5 w-20 rounded-md ${bar}`} />
            <div className={`h-7 w-56 rounded-md ${bar}`} />
            <div className={`h-3.5 w-40 rounded-md ${bar}`} />
          </div>
        )}
        {shape === 'detail' ? (
          <div className={`${card} grid gap-3 p-6`}>
            <div className={`h-3.5 w-24 rounded-md ${bar}`} />
            <div className={`h-6 w-40 rounded-md ${bar}`} />
            <div className="flex gap-2">
              {[0, 1, 2, 3, 4, 5, 6].map((i) => <div key={i} className={`h-7 w-7 rounded-full ${bar}`} />)}
            </div>
          </div>
        ) : null}
        <div className={`${card} divide-y divide-line`}>
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4">
              <div className={`h-9 w-9 shrink-0 rounded-full ${bar}`} />
              <div className="grid flex-1 gap-2">
                <div className={`h-3.5 ${i % 2 ? 'w-1/3' : 'w-2/5'} rounded-md ${bar}`} />
                <div className={`h-3 ${i % 2 ? 'w-1/2' : 'w-3/5'} rounded-md ${bar}`} />
              </div>
              <div className={`h-7 w-20 rounded-full ${bar}`} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
