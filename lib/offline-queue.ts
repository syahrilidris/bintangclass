'use client'

// Work done without signal waits here (IndexedDB, on this phone only) until it can be sent.
// - attendance: one entry per student per day; a later tap replaces an earlier one.
// - recordings: the audio itself plus what it belongs to.
// Sending goes straight to the database with the person's own sign-in, so the same
// security rules apply as when they are online. Everything is wiped on sign-out.

import { createClient } from '@/lib/supabase/client'

export type QueuedMark = {
  key: string // `${studentId}|${day}`
  uid: string
  centreId: string
  classId: string
  studentId: string
  day: string
  present: boolean | null
  at: number
}

export type QueuedRecording = {
  id: string
  uid: string
  centreId: string
  studentId: string
  homeworkId: string | null
  childName: string
  type: string
  ext: string
  seconds: number
  blob: Blob
  at: number
}

const DB = 'bintang-offline'
const EVENT = 'bc-queue-change'

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains('marks')) db.createObjectStore('marks', { keyPath: 'key' })
      if (!db.objectStoreNames.contains('recordings')) db.createObjectStore('recordings', { keyPath: 'id' })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function tx<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  const db = await open()
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, mode)
    const r = fn(t.objectStore(store))
    t.oncomplete = () => {
      db.close()
      resolve(r ? r.result : undefined)
    }
    t.onerror = () => reject(t.error)
  })
}

function changed() {
  window.dispatchEvent(new Event(EVENT))
}

export function onQueueChange(fn: () => void) {
  window.addEventListener(EVENT, fn)
  return () => window.removeEventListener(EVENT, fn)
}

/** Who is signed in on this phone, read from the stored session (works with no signal). */
async function myId(): Promise<string> {
  const { data } = await createClient().auth.getSession()
  return data.session?.user.id ?? ''
}

export async function queueMark(m: Omit<QueuedMark, 'key' | 'at' | 'uid'>) {
  const uid = await myId()
  await tx('marks', 'readwrite', (s) => s.put({ ...m, uid, key: `${m.studentId}|${m.day}`, at: Date.now() }))
  changed()
}

export async function queueRecording(r: Omit<QueuedRecording, 'id' | 'at' | 'uid'>) {
  const uid = await myId()
  await tx('recordings', 'readwrite', (s) => s.put({ ...r, uid, id: crypto.randomUUID(), at: Date.now() }))
  changed()
}

export async function listMarks(): Promise<QueuedMark[]> {
  return ((await tx<QueuedMark[]>('marks', 'readonly', (s) => s.getAll())) ?? []) as QueuedMark[]
}

export async function listRecordings(): Promise<QueuedRecording[]> {
  return ((await tx<QueuedRecording[]>('recordings', 'readonly', (s) => s.getAll())) ?? []) as QueuedRecording[]
}

export async function pendingCount(): Promise<number> {
  try {
    const [m, r] = await Promise.all([listMarks(), listRecordings()])
    return m.length + r.length
  } catch {
    return 0
  }
}

/** True when an error means "no connection" rather than "the server said no". */
export function isNetworkError(e: unknown): boolean {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return true
  const msg = e instanceof Error ? e.message : String(e ?? '')
  return /failed to fetch|networkerror|network request failed|load failed|fetch failed|connection/i.test(msg)
}

let flushing: Promise<{ sent: number; failed: string[] }> | null = null

/** Send everything waiting. Safe to call often; runs one at a time. */
export function flushQueue() {
  if (!flushing) flushing = doFlush().finally(() => (flushing = null))
  return flushing
}

async function doFlush(): Promise<{ sent: number; failed: string[] }> {
  const out = { sent: 0, failed: [] as string[] }
  if (!navigator.onLine) return out
  const supabase = createClient()
  const uid = await myId()
  if (!uid) return out

  // Only send what this person saved; someone else's waits for them (or is wiped when they sign out).
  for (const m of (await listMarks()).filter((x) => x.uid === uid)) {
    try {
      const { error } =
        m.present === null
          ? await supabase.from('attendance').delete().eq('student_id', m.studentId).eq('day', m.day)
          : await supabase.from('attendance').upsert(
              { centre_id: m.centreId, class_id: m.classId, student_id: m.studentId, day: m.day, present: m.present, marked_by: uid },
              { onConflict: 'student_id,day' },
            )
      if (error) {
        if (isNetworkError(error)) return out
        out.failed.push(`Attendance for ${m.day} couldn’t be saved: ${error.message}`)
      } else out.sent++
      await tx('marks', 'readwrite', (s) => s.delete(m.key))
    } catch (e) {
      if (isNetworkError(e)) return out
      throw e
    }
  }

  for (const r of (await listRecordings()).filter((x) => x.uid === uid)) {
    const path = `${r.centreId}/${r.studentId}/${r.id}.${r.ext}`
    try {
      const up = await supabase.storage.from('recordings').upload(path, r.blob, { contentType: r.type, upsert: false })
      if (up.error && !/exists|duplicate/i.test(up.error.message)) {
        if (isNetworkError(up.error)) return out
        out.failed.push(`${r.childName}’s recording couldn’t be sent: ${up.error.message}`)
        await tx('recordings', 'readwrite', (s) => s.delete(r.id))
        continue
      }
      const { error } = await supabase.from('submissions').insert({
        centre_id: r.centreId,
        student_id: r.studentId,
        homework_id: r.homeworkId,
        audio_path: path,
        duration_s: Math.max(0, Math.min(900, Math.round(r.seconds))) || null,
        submitted_by: uid,
      })
      if (error) {
        if (isNetworkError(error)) return out
        await supabase.storage.from('recordings').remove([path])
        out.failed.push(`${r.childName}’s recording couldn’t be sent: ${error.message}`)
      } else out.sent++
      await tx('recordings', 'readwrite', (s) => s.delete(r.id))
    } catch (e) {
      if (isNetworkError(e)) return out
      throw e
    }
  }
  if (out.sent || out.failed.length) changed()
  return out
}

/** Wipe everything this app stored on the phone: queued work and saved pages. */
export async function wipeDevice() {
  try {
    await new Promise<void>((resolve) => {
      const req = indexedDB.deleteDatabase(DB)
      req.onsuccess = req.onerror = req.onblocked = () => resolve()
    })
  } catch {}
  await wipePages()
}

/** Forget saved pages only (kept work stays). Used when the sign-in page opens. */
export async function wipePages() {
  try {
    await caches.delete('bc-pages')
  } catch {}
  try {
    navigator.serviceWorker?.controller?.postMessage('bc-wipe-pages')
  } catch {}
}
