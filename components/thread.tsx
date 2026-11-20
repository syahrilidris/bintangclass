'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export type Msg = { id: string; body: string; created_at: string; sender_id: string; sender_name: string | null; sender_role: string | null; pending?: boolean; failed?: boolean }

function time(iso: string) {
  return new Intl.DateTimeFormat('en-MY', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kuala_Lumpur' }).format(new Date(iso))
}
function day(iso: string) {
  return new Intl.DateTimeFormat('en-MY', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Kuala_Lumpur' }).format(new Date(iso))
}
const ROLE: Record<string, string> = { parent: 'Parent', teacher: 'Teacher', owner: 'Owner', admin: 'Admin' }

/** One child's conversation: bubbles, live updates, and a box to write in. */
export function Thread({
  centreId,
  studentId,
  me,
  initial,
  canSend,
}: {
  centreId: string
  studentId: string
  me: string
  initial: Msg[]
  canSend: boolean
}) {
  const [msgs, setMsgs] = useState<Msg[]>(initial)
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const end = useRef<HTMLDivElement>(null)
  const supabase = useRef(createClient()).current

  // New messages from others arrive live while the conversation is open.
  useEffect(() => {
    const channel = supabase
      .channel(`messages:${studentId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `student_id=eq.${studentId}` }, (payload) => {
        const m = payload.new as Msg
        setMsgs((cur) => (cur.some((x) => x.id === m.id) ? cur : [...cur, m]))
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages' }, (payload) => {
        const id = (payload.old as { id?: string }).id
        if (id) setMsgs((cur) => cur.filter((x) => x.id !== id))
      })
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) supabase.realtime.setAuth(data.session.access_token)
      channel.subscribe()
    })
    return () => {
      supabase.removeChannel(channel)
    }
  }, [studentId, supabase])

  useLayoutEffect(() => {
    end.current?.scrollIntoView({ block: 'end' })
  }, [msgs.length])

  async function send() {
    const body = text.trim()
    if (!body) return
    setError(null)
    const temp: Msg = { id: `tmp-${Date.now()}`, body, created_at: new Date().toISOString(), sender_id: me, sender_name: null, sender_role: null, pending: true }
    setMsgs((cur) => [...cur, temp])
    setText('')
    const { data, error } = await supabase.from('messages').insert({ centre_id: centreId, student_id: studentId, body }).select('id, body, created_at, sender_id, sender_name, sender_role').single()
    if (error || !data) {
      setMsgs((cur) => cur.map((x) => (x.id === temp.id ? { ...x, pending: false, failed: true } : x)))
      setError(navigator.onLine ? 'Couldn’t send. Tap the message to try again.' : 'No connection. Tap the message to try again when you’re back online.')
      return
    }
    setMsgs((cur) => {
      const without = cur.filter((x) => x.id !== temp.id && x.id !== data.id)
      return [...without, data as Msg]
    })
  }

  async function retry(m: Msg) {
    setMsgs((cur) => cur.filter((x) => x.id !== m.id))
    setText(m.body)
  }

  async function remove(m: Msg) {
    const { error } = await supabase.from('messages').delete().eq('id', m.id)
    if (!error) setMsgs((cur) => cur.filter((x) => x.id !== m.id))
  }

  let lastDay = ''
  return (
    <div className="flex min-h-[60dvh] flex-col">
      <ol className="grid flex-1 content-start gap-2" aria-label="Messages" aria-live="polite">
        {msgs.length === 0 ? (
          <li className="py-10 text-center text-sm text-muted">No messages yet. Say assalamualaikum!</li>
        ) : null}
        {msgs.map((m) => {
          const mine = m.sender_id === me
          const d = day(m.created_at)
          const showDay = d !== lastDay
          lastDay = d
          return (
            <li key={m.id} className="grid gap-2">
              {showDay ? <p className="my-2 text-center text-xs font-semibold text-faint">{d}</p> : null}
              <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div className={`group max-w-[85%] sm:max-w-[70%]`}>
                  {!mine ? (
                    <p className="mb-0.5 px-1 text-xs font-semibold text-muted">
                      {m.sender_name ?? 'Someone'}
                      {m.sender_role ? <span className="font-normal text-faint"> · {ROLE[m.sender_role] ?? m.sender_role}</span> : null}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    disabled={!m.failed}
                    onClick={() => m.failed && retry(m)}
                    className={`block w-full whitespace-pre-wrap break-words rounded-2xl px-4 py-2.5 text-left text-[0.95rem] leading-relaxed ${
                      mine
                        ? `rounded-br-md bg-teal-600 text-white ${m.pending ? 'opacity-70' : ''} ${m.failed ? 'bg-danger-solid' : ''}`
                        : 'rounded-bl-md border border-line bg-surface'
                    } disabled:cursor-default`}
                  >
                    {m.body}
                  </button>
                  <p className={`mt-0.5 flex gap-2 px-1 text-[0.7rem] text-faint ${mine ? 'justify-end' : ''}`}>
                    <span>{m.failed ? 'Not sent' : m.pending ? 'Sending…' : time(m.created_at)}</span>
                    {mine && !m.pending && !m.failed ? (
                      <button type="button" className="hidden hover:text-danger group-hover:inline focus:inline" onClick={() => remove(m)}>Delete</button>
                    ) : null}
                  </p>
                </div>
              </div>
            </li>
          )
        })}
      </ol>
      <div ref={end} />

      {canSend ? (
        <form
          className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] mt-4 flex items-end gap-2 rounded-2xl border border-line bg-surface p-2 shadow-[var(--shadow-card)] lg:bottom-4"
          onSubmit={(e) => {
            e.preventDefault()
            send()
          }}
        >
          <label className="sr-only" htmlFor="message">Message</label>
          <textarea
            id="message"
            rows={1}
            value={text}
            maxLength={2000}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !('ontouchstart' in window)) {
                e.preventDefault()
                send()
              }
            }}
            placeholder="Write a message"
            className="max-h-40 min-h-11 flex-1 resize-none bg-transparent px-3 py-2.5 text-[0.95rem] outline-none [field-sizing:content]"
          />
          <button className="btn btn-primary h-11 min-h-0 shrink-0 px-4" disabled={!text.trim()} aria-label="Send">
            Send
          </button>
        </form>
      ) : null}
      {error ? <p className="notice notice-error mt-2" role="alert">{error}</p> : null}
    </div>
  )
}
