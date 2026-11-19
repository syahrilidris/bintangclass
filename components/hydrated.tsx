'use client'

import { useEffect, useSyncExternalStore } from 'react'

/** Marks <html data-hydrated> once React has taken over the page. Tests wait for it before typing. */
export function HydratedMarker() {
  useEffect(() => {
    document.documentElement.dataset.hydrated = '1'
  }, [])
  return null
}

const subscribe = () => () => {}
/** false during server render and hydration, true afterwards. */
export function useHydrated() {
  return useSyncExternalStore(subscribe, () => true, () => false)
}
