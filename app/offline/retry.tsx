'use client'

export function RetryButton() {
  return (
    <button type="button" className="btn btn-primary mt-8 min-w-40" onClick={() => window.location.reload()}>
      Try again
    </button>
  )
}
