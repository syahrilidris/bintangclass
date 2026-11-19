// Shown the instant a link is tapped, while the next page loads, so the app never feels stuck.
function Block({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-[var(--radius-card)] bg-line/60 ${className}`} />
}

export function PageSkeleton({ hero = false }: { hero?: boolean }) {
  return (
    <div className="grid gap-6" aria-busy="true" aria-label="Loading">
      {hero ? <Block className="h-36" /> : (
        <div className="grid gap-2">
          <Block className="h-4 w-24 rounded-md" />
          <Block className="h-8 w-56 rounded-lg" />
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Block className="h-24" />
        <Block className="h-24" />
        <Block className="h-24" />
        <Block className="h-24" />
      </div>
      <div className="panel divide-y divide-line">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-4">
            <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-line/70" />
            <div className="grid flex-1 gap-2">
              <div className="h-3.5 w-2/5 animate-pulse rounded bg-line/70" />
              <div className="h-3 w-3/5 animate-pulse rounded bg-line/50" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
