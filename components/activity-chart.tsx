'use client'

import { useState } from 'react'

// One small bar chart per measure (small multiples, never two scales on one axis).
// Single series, single hue; hover or tap a bar for the day's figure.
export function ActivityChart({
  title,
  days,
  values,
  unit,
}: {
  title: string
  days: string[]
  values: number[]
  unit: string
}) {
  const [hover, setHover] = useState<number | null>(null)
  const W = 300
  const H = 96
  const max = Math.max(1, ...values)
  const n = values.length
  const step = W / n
  const barW = Math.max(2, step - 2) // 2px surface gap between bars
  const total = values.reduce((a, b) => a + b, 0)
  const fmt = (d: string) => new Intl.DateTimeFormat('en-MY', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(d + 'T12:00:00Z'))
  const shown = hover ?? n - 1

  return (
    <figure className="panel p-5">
      <figcaption className="flex items-baseline justify-between gap-3">
        <span className="font-semibold">{title}</span>
        <span className="text-sm text-muted">{total.toLocaleString('en-MY')} in 30 days</span>
      </figcaption>
      <p className="mt-1 h-5 text-sm text-ink" aria-live="polite">
        {fmt(days[shown])}: <strong>{values[shown]}</strong> {unit}
      </p>
      <svg
        viewBox={`0 0 ${W} ${H + 18}`}
        className="mt-2 w-full touch-none"
        role="img"
        aria-label={`${title}, last 30 days, total ${total}`}
        onMouseLeave={() => setHover(null)}
      >
        <line x1={0} x2={W} y1={H + 0.5} y2={H + 0.5} stroke="var(--color-line)" />
        {values.map((v, i) => {
          const h = v === 0 ? 0 : Math.max(2, (v / max) * (H - 4))
          const x = i * step + (step - barW) / 2
          const active = i === shown
          return (
            <g key={days[i]} onMouseEnter={() => setHover(i)} onClick={() => setHover(i)}>
              {/* hit target taller and wider than the bar */}
              <rect x={i * step} y={0} width={step} height={H} fill="transparent" />
              {h > 0 ? (
                <g fill={active ? 'var(--color-teal-700)' : 'var(--color-teal-500)'} opacity={hover === null || active ? 1 : 0.55}>
                  {/* rounded data end at the top, square at the baseline */}
                  <rect x={x} y={H - h} width={barW} height={h} rx={Math.min(2, barW / 2)} />
                  <rect x={x} y={H - Math.min(2, h)} width={barW} height={Math.min(2, h)} />
                </g>
              ) : null}
            </g>
          )
        })}
        <text x={0} y={H + 14} fontSize="10" fill="var(--color-faint)">{fmt(days[0])}</text>
        <text x={W} y={H + 14} fontSize="10" fill="var(--color-faint)" textAnchor="end">Today</text>
      </svg>
    </figure>
  )
}
