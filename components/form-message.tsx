export function FormMessage({ state }: { state?: { error?: string; ok?: string } }) {
  if (state?.error) return <p className="notice notice-error" role="alert">{state.error}</p>
  if (state?.ok) return <p className="notice notice-info" role="status">{state.ok}</p>
  return null
}
