'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { saveSubmission } from '@/app/c/[slug]/practice/actions'

const MAX_SECONDS = 5 * 60

type Phase =
  | { kind: 'idle' }
  | { kind: 'recording'; started: number }
  | { kind: 'review'; blob: Blob; url: string; seconds: number; type: string }
  | { kind: 'sending' }
  | { kind: 'sent' }

function pickType(): string {
  if (typeof MediaRecorder === 'undefined') return ''
  for (const t of ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm', 'audio/ogg;codecs=opus']) {
    if (MediaRecorder.isTypeSupported(t)) return t
  }
  return ''
}

const EXT: Record<string, string> = { 'audio/webm': 'webm', 'audio/mp4': 'm4a', 'audio/ogg': 'ogg', 'audio/mpeg': 'mp3', 'audio/aac': 'aac', 'audio/wav': 'wav', 'audio/x-m4a': 'm4a' }

function clock(s: number) {
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
}

// Record a child's reading on a parent's phone, listen back, then send it to the teacher.
// Phones without in-browser recording get the phone's own voice recorder through a file picker.
export function Recorder({
  slug,
  centreId,
  studentId,
  homeworkId,
  childName,
}: {
  slug: string
  centreId: string
  studentId: string
  homeworkId: string | null
  childName: string
}) {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' })
  const [error, setError] = useState<string | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [canRecord, setCanRecord] = useState(true)
  const recRef = useRef<MediaRecorder | null>(null)
  const chunks = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    setCanRecord(typeof MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia)
    return () => streamRef.current?.getTracks().forEach((t) => t.stop())
  }, [])

  useEffect(() => {
    if (phase.kind !== 'recording') return
    const id = setInterval(() => {
      const s = (Date.now() - phase.started) / 1000
      setElapsed(s)
      if (s >= MAX_SECONDS) recRef.current?.stop()
    }, 250)
    return () => clearInterval(id)
  }, [phase])

  async function start() {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
      streamRef.current = stream
      const type = pickType()
      const rec = new MediaRecorder(stream, { ...(type ? { mimeType: type } : {}), audioBitsPerSecond: 48000 })
      chunks.current = []
      rec.ondataavailable = (e) => e.data.size && chunks.current.push(e.data)
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop())
        const base = (rec.mimeType || type || 'audio/webm').split(';')[0]
        const blob = new Blob(chunks.current, { type: base })
        const seconds = (Date.now() - started) / 1000
        setPhase({ kind: 'review', blob, url: URL.createObjectURL(blob), seconds, type: base })
      }
      recRef.current = rec
      const started = Date.now()
      rec.start(1000)
      setElapsed(0)
      setPhase({ kind: 'recording', started })
    } catch {
      setError('The microphone isn’t available. Allow microphone access for this site in your browser settings, then try again.')
    }
  }

  function stop() {
    recRef.current?.stop()
  }

  function picked(file: File | undefined) {
    if (!file) return
    const base = (file.type || 'audio/mp4').split(';')[0]
    setPhase({ kind: 'review', blob: file, url: URL.createObjectURL(file), seconds: 0, type: base })
  }

  async function send() {
    if (phase.kind !== 'review') return
    const { blob, seconds, type } = phase
    if (blob.size > 15 * 1024 * 1024) {
      setError('This recording is longer than the 15 MB limit. Record a shorter part, about 5 minutes at most.')
      return
    }
    setError(null)
    setPhase({ kind: 'sending' })
    const path = `${centreId}/${studentId}/${crypto.randomUUID()}.${EXT[type] ?? 'webm'}`
    const supabase = createClient()
    const up = await supabase.storage.from('recordings').upload(path, blob, { contentType: type, upsert: false })
    if (up.error) {
      setError(`Couldn’t upload the recording: ${up.error.message}. Check your connection and try again.`)
      setPhase({ kind: 'review', blob, url: URL.createObjectURL(blob), seconds, type })
      return
    }
    const res = await saveSubmission({ slug, studentId, homeworkId, path, seconds: Math.round(seconds) })
    if (res?.error) {
      await supabase.storage.from('recordings').remove([path])
      setError(res.error)
      setPhase({ kind: 'review', blob, url: URL.createObjectURL(blob), seconds, type })
      return
    }
    setPhase({ kind: 'sent' })
    router.refresh()
  }

  return (
    <div className="rounded-xl border border-line bg-white p-5">
      {phase.kind === 'idle' ? (
        <div className="grid gap-3">
          <p className="text-sm text-muted">Let {childName} read aloud, then send it to the teacher.</p>
          {canRecord ? (
            <button type="button" className="btn btn-primary w-full sm:w-auto" onClick={start}>
              <span className="h-2.5 w-2.5 rounded-full bg-white" aria-hidden /> Start recording
            </button>
          ) : null}
          <label className={`text-sm ${canRecord ? 'text-muted' : ''}`}>
            {canRecord ? 'Or choose a recording from this phone: ' : 'Use your phone’s voice recorder, then choose the file: '}
            <input type="file" accept="audio/*" capture className="mt-2 block text-sm" onChange={(e) => picked(e.target.files?.[0])} />
          </label>
        </div>
      ) : null}

      {phase.kind === 'recording' ? (
        <div className="flex flex-wrap items-center justify-between gap-4" aria-live="polite">
          <p className="flex items-center gap-3 font-semibold">
            <span className="h-3 w-3 animate-pulse rounded-full bg-danger" aria-hidden />
            Recording {clock(elapsed)}
            <span className="text-sm font-normal text-faint">of {clock(MAX_SECONDS)}</span>
          </p>
          <button type="button" className="btn btn-quiet" onClick={stop}>Stop</button>
        </div>
      ) : null}

      {phase.kind === 'review' ? (
        <div className="grid gap-4">
          <p className="text-sm text-muted">Listen back. If it sounds right, send it.</p>
          <audio controls src={phase.url} className="w-full" />
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-primary" onClick={send}>Send to teacher</button>
            <button type="button" className="btn btn-quiet" onClick={() => setPhase({ kind: 'idle' })}>Record again</button>
          </div>
        </div>
      ) : null}

      {phase.kind === 'sending' ? <p className="font-semibold" aria-live="polite">Sending…</p> : null}

      {phase.kind === 'sent' ? (
        <div className="flex flex-wrap items-center justify-between gap-3" aria-live="polite">
          <p className="font-semibold text-teal-700">Sent. The teacher will listen and reply here.</p>
          <button type="button" className="btn btn-quiet" onClick={() => setPhase({ kind: 'idle' })}>Record another</button>
        </div>
      ) : null}

      {error ? <p className="notice notice-error mt-4" role="alert">{error}</p> : null}
    </div>
  )
}
