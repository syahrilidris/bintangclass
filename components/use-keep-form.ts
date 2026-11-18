'use client'

import { startTransition, type FormEvent } from 'react'

/**
 * Submit a form to a server action without React's automatic form reset.
 * React 19 resets a form after an `action` submit, which puts <select>s back to their first
 * value even though the save worked. Edit forms use this so the saved values stay on screen.
 */
export function keepFormSubmit(action: (fd: FormData) => void) {
  return (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLElement | null
    const fd = new FormData(e.currentTarget, submitter)
    startTransition(() => action(fd))
  }
}
