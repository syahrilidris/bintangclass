'use client'

import { useFormStatus } from 'react-dom'

export function Submit({
  children,
  pending,
  className = 'btn btn-primary',
  disabled,
  busy,
}: {
  children: React.ReactNode
  pending?: string
  className?: string
  disabled?: boolean
  busy?: boolean
}) {
  const status = useFormStatus()
  const isBusy = status.pending || Boolean(busy)
  return (
    <button type="submit" className={className} disabled={disabled || isBusy}>
      {isBusy && pending ? pending : children}
    </button>
  )
}
