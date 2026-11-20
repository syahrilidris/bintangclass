'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Link = { id: string; label: string; created_at: string; last_used_at: string | null }

function when(iso: string | null) {
  if (!iso) return 'not used yet'
  return new Intl.DateTimeFormat('en-MY', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kuala_Lumpur' }).format(new Date(iso))
}

/**
 * Connects one child to the Bintang family app (app.bintangkids.com) with a one-time code,
 * and lists / disconnects existing links. Parents make codes; owners and admins can only disconnect.
 */
export function FamilyLink({ studentId, firstName, links, canConnect }: { studentId: string; firstName: string; links: Link[]; canConnect: boolean }) {
  const router = useRouter()
  const [code, setCode] = useState<{ code: string; expires: number } | null>(null)
  const [left, setLeft] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!code) return
    const tick = () => {
      const s = Math.max(0, Math.round((code.expires - Date.now()) / 1000))
      setLeft(s)
      if (s === 0) setCode(null)
    }
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [code])

  async function make() {
    setBusy(true)
    setError(null)
    const { data, error } = await createClient().rpc('bridge_new_code', { p_student: studentId })
    setBusy(false)
    if (error || !data) return setError(error?.message ?? 'Couldn’t make a code. Try again.')
    const d = data as { code: string; expires_at: string }
    setCode({ code: d.code, expires: Date.parse(d.expires_at) })
  }

  async function revoke(id: string) {
    await createClient().rpc('bridge_revoke', { p_link: id })
    router.refresh()
  }

  return (
    <section id="family-app" className="scroll-mt-6">
      <h2 className="section-title">Bintang family app</h2>
      <p className="mt-1 text-sm text-muted">
        Connect {firstName} to the Bintang app at home. Their attendance, the teacher’s replies and new Iqra books earn stars there, and this
        week’s practice shows in their Quran corner. The app can only read {firstName}’s class updates.
      </p>

      {links.length ? (
        <ul className="panel rows mt-4">
          {links.map((l) => (
            <li key={l.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
              <span className="min-w-0">
                <span className="block font-semibold">{l.label}</span>
                <span className="block text-xs text-muted">Connected {when(l.created_at)} · last update {when(l.last_used_at)}</span>
              </span>
              <button type="button" className="btn btn-danger min-h-9 px-3 text-sm" onClick={() => revoke(l.id)}>Disconnect</button>
            </li>
          ))}
        </ul>
      ) : null}

      {canConnect ? (
        code ? (
          <div className="panel mt-4 grid gap-3 p-5" aria-live="polite">
            <p className="text-sm text-muted">In the Bintang app, go to <strong className="text-ink">Parent → {firstName} → Link a class</strong> and enter:</p>
            <p className="select-all text-center font-mono text-[2rem] font-bold tracking-[0.2em] text-strong" aria-label={`Code ${code.code.split('').join(' ')}`}>{code.code}</p>
            <p className="text-center text-xs text-muted">Works once, for {Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')} more</p>
            <a href="https://app.bintangkids.com/parent" className="btn btn-quiet justify-self-center" target="_blank" rel="noreferrer">Open the Bintang app</a>
          </div>
        ) : (
          <button type="button" className="btn btn-primary mt-4" onClick={make} disabled={busy}>
            {busy ? 'Making a code…' : links.length ? 'Connect another phone' : 'Connect to the Bintang app'}
          </button>
        )
      ) : null}
      {error ? <p className="notice notice-error mt-3" role="alert">{error}</p> : null}
    </section>
  )
}
