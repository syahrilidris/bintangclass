'use client'

import { useEffect, useState } from 'react'

export type ThemeChoice = 'light' | 'dark' | 'system'
const KEY = 'bc-theme'

// Runs in <head> before first paint, so there is no flash of the wrong theme.
export const themeScript = `(function(){try{var c=localStorage.getItem('${KEY}')||'system';var d=c==='dark'||(c==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);var r=document.documentElement;r.classList.toggle('dark',d);r.dataset.theme=c;}catch(e){}})();`

function apply(choice: ThemeChoice) {
  const dark = choice === 'dark' || (choice === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)
  const root = document.documentElement
  root.classList.toggle('dark', dark)
  root.dataset.theme = choice
}

function read(): ThemeChoice {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'light' || v === 'dark' ? v : 'system'
  } catch {
    return 'system'
  }
}

const OPTIONS: { value: ThemeChoice; label: string; icon: React.ReactNode }[] = [
  { value: 'light', label: 'Light', icon: <><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" /></> },
  { value: 'dark', label: 'Dark', icon: <path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10z" /> },
  { value: 'system', label: 'Auto', icon: <><rect x="3.5" y="4.5" width="17" height="12" rx="2" /><path d="M9 20h6" /></> },
]

/** Light / Dark / Auto segmented switch. `tone="onNavy"` for the navy header and sidebar. */
export function ThemeSwitch({ tone = 'default', compact = false }: { tone?: 'default' | 'onNavy'; compact?: boolean }) {
  const [choice, setChoice] = useState<ThemeChoice>('system')

  useEffect(() => {
    setChoice(read())
    const mq = matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => { if (read() === 'system') apply('system') }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  function pick(v: ThemeChoice) {
    setChoice(v)
    try { localStorage.setItem(KEY, v) } catch {}
    apply(v)
  }

  const onNavy = tone === 'onNavy'
  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className={`inline-flex rounded-full p-0.5 ${onNavy ? 'bg-white/10' : 'border border-line bg-paper'}`}
    >
      {OPTIONS.map((o) => {
        const on = choice === o.value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={o.label}
            title={o.label}
            onClick={() => pick(o.value)}
            className={`flex h-8 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold transition-colors ${
              on
                ? onNavy ? 'bg-white text-navy-900' : 'bg-surface text-ink shadow-sm'
                : onNavy ? 'text-white/65 hover:text-white' : 'text-muted hover:text-ink'
            }`}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              {o.icon}
            </svg>
            {compact ? null : <span>{o.label}</span>}
          </button>
        )
      })}
    </div>
  )
}
