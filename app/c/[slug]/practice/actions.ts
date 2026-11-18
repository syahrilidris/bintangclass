'use server'

import { revalidatePath } from 'next/cache'
import { getCentre } from '@/lib/centre'

export type PracticeState = { error?: string; ok?: string } | undefined

const str = (f: FormData, k: string) => String(f.get(k) ?? '').trim()

function friendly(message: string) {
  if (/row-level security|permission denied/i.test(message)) return 'You don’t have permission to do that here.'
  return message
}

/** Called by the recorder after the audio is in Storage. */
export async function saveSubmission(input: { slug: string; studentId: string; homeworkId: string | null; path: string; seconds: number }) {
  const { supabase, centre, user } = await getCentre(input.slug)
  const { error } = await supabase.from('submissions').insert({
    centre_id: centre.id,
    student_id: input.studentId,
    homework_id: input.homeworkId,
    audio_path: input.path,
    duration_s: Math.max(0, Math.min(900, input.seconds)) || null,
    submitted_by: user.id,
  })
  if (error) return { error: friendly(error.message) }
  revalidatePath(`/c/${input.slug}`, 'layout')
  return { ok: true }
}

export async function replyToSubmission(_: PracticeState, f: FormData): Promise<PracticeState> {
  const slug = str(f, 'slug')
  const { supabase } = await getCentre(slug)
  const stars = Number(str(f, 'stars'))
  const verdict = str(f, 'verdict')
  if (![1, 2, 3].includes(stars)) return { error: 'Choose 1, 2 or 3 stars.' }
  if (!['good', 'repeat'].includes(verdict)) return { error: 'Choose “Good” or “Repeat”.' }
  const { data, error } = await supabase
    .from('submissions')
    .update({ stars, verdict, feedback: str(f, 'feedback') || null })
    .eq('id', str(f, 'id'))
    .select('id')
  if (error) return { error: friendly(error.message) }
  if (!data?.length) return { error: 'This recording is no longer available.' }
  revalidatePath(`/c/${slug}`, 'layout')
  return { ok: 'Reply sent.' }
}

export async function setHomework(_: PracticeState, f: FormData): Promise<PracticeState> {
  const slug = str(f, 'slug')
  const { supabase, centre, user } = await getCentre(slug)
  const title = str(f, 'title')
  if (!title) return { error: 'Say what to practise, e.g. “Iqra 4, pages 22–23”.' }
  const { error } = await supabase.from('homework').insert({
    centre_id: centre.id,
    class_id: str(f, 'class_id'),
    title,
    due_on: str(f, 'due_on') || null,
    created_by: user.id,
  })
  if (error) return { error: friendly(error.message) }
  revalidatePath(`/c/${slug}`, 'layout')
  return { ok: 'Practice set. Parents will see it on their child’s page.' }
}

export async function removeHomework(f: FormData) {
  const slug = str(f, 'slug')
  const { supabase } = await getCentre(slug)
  await supabase.from('homework').delete().eq('id', str(f, 'id'))
  revalidatePath(`/c/${slug}`, 'layout')
}

/** Removes the audio from Storage first (the database can't), then the record. */
export async function removeSubmission(f: FormData) {
  const slug = str(f, 'slug')
  const { supabase } = await getCentre(slug)
  const { data } = await supabase.from('submissions').select('audio_path').eq('id', str(f, 'id')).maybeSingle()
  if (!data) return
  const { error } = await supabase.from('submissions').delete().eq('id', str(f, 'id'))
  if (!error) await supabase.storage.from('recordings').remove([data.audio_path])
  revalidatePath(`/c/${slug}`, 'layout')
}
