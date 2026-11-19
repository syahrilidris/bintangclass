// The eight-pointed star (two squares, one turned 45°): the brand mark and the reading-progress marker.
const POINTS = (() => {
  const pts: string[] = []
  for (let i = 0; i < 16; i++) {
    const angle = (Math.PI / 8) * i - Math.PI / 2
    const r = i % 2 === 0 ? 50 : 50 * Math.cos(Math.PI / 8) * 0.83
    pts.push(`${(50 + r * Math.cos(angle)).toFixed(2)},${(50 + r * Math.sin(angle)).toFixed(2)}`)
  }
  return pts.join(' ')
})()

export function Star({
  size = 20,
  fill = 'currentColor',
  stroke,
  strokeWidth = 6,
  className,
  title,
}: {
  size?: number
  fill?: string
  stroke?: string
  strokeWidth?: number
  className?: string
  title?: string
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="-4 -4 108 108"
      className={className}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
    >
      {title ? <title>{title}</title> : null}
      <polygon points={POINTS} fill={fill} stroke={stroke} strokeWidth={stroke ? strokeWidth : 0} strokeLinejoin="round" />
    </svg>
  )
}

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <Star size={26} fill="var(--color-brass)" />
      <span className={`text-[1.05rem] font-bold tracking-tight ${light ? 'text-white' : 'text-ink'}`}>
        Bintang Class
      </span>
    </span>
  )
}
