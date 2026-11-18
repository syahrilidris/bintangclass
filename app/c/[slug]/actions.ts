'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getCentre, type Role } from '@/lib/centre'
import { BOOKS, bookPages } from '@/lib/books'

export type FormState = { error?: string; ok?: string; token?: string } | undefined

const str = (f: FormData, k: string) => String(f.get(k) ?? '').trim()
const opt = (f: FormData, k: string) => str(f, k) || null

function dbError(message: string): string {
  if (/row-level security|permission denied/i.test(message)) return 'You don’t have permission to do that here.'
  if (/managed by Bintang Class billing/i.test(message)) return message
  if (/belongs to another centre|not staff at this centre|must be a member/i.test(message)) return message.charAt(0).toUpperCase() + message.slice(1) + '.'
  return message
}

async function ctx(f: FormData) {
  const slug = str(f, 'slug')
  const c = await getCentre(slug)
  return { ...c, slug, root: `/c/${slug}` }
}

// ---------- classes ----------
export async function saveClass(_: FormState, f: FormData): Promise<FormState> {
  const { supabase, centre, root, isManager } = await ctx(f)
  if (!isManager) return { error: 'Only the owner or an admin can change classes.' }
  const id = opt(f, 'id')
  const row = { name: str(f, 'name'), schedule: opt(f, 'schedule'), teacher_id: opt(f, 'teacher_id') }
  if (!row.name) return { error: 'Give the class a name.' }
  const { data, error } = id
    ? await supabase.from('classes').update(row).eq('id', id).select('id').single()
    : await supabase.from('classes').insert({ ...row, centre_id: centre.id }).select('id').single()
  if (error) return { error: dbError(error.message) }
  revalidatePath(root, 'layout')
  if (!id) redirect(`${root}/classes/${data.id}`)
  return { ok: 'Class saved.' }
}

export async function deleteClass(f: FormData) {
  const { supabase, root } = await ctx(f)
  await supabase.from('classes').delete().eq('id', str(f, 'id'))
  revalidatePath(root, 'layout')
  redirect(`${root}/classes`)
}

// ---------- students ----------
export async function saveStudent(_: FormState, f: FormData): Promise<FormState> {
  const { supabase, centre, root, isManager } = await ctx(f)
  if (!isManager) return { error: 'Only the owner or an admin can change student details.' }
  const id = opt(f, 'id')
  const fee = str(f, 'monthly_fee')
  const row = {
    full_name: str(f, 'full_name'),
    class_id: opt(f, 'class_id'),
    monthly_fee: fee ? Number(fee) : null,
    status: str(f, 'status') || 'active',
  }
  if (!row.full_name) return { error: 'Enter the student’s name.' }
  if (fee && (Number.isNaN(row.monthly_fee) || row.monthly_fee! < 0)) return { error: 'Enter the monthly fee as a number, e.g. 50.' }

  if (id) {
    const { error } = await supabase.from('students').update(row).eq('id', id)
    if (error) return { error: dbError(error.message) }
    revalidatePath(root, 'layout')
    return { ok: 'Saved.' }
  }
  const book = BOOKS.some((b) => b.name === str(f, 'book')) ? str(f, 'book') : 'Iqra 1'
  const page = Math.max(1, Math.min(bookPages(book), Number(str(f, 'page')) || 1))
  const { data, error } = await supabase
    .from('students')
    .insert({ ...row, centre_id: centre.id, book, page })
    .select('id')
    .single()
  if (error) return { error: dbError(error.message) }
  revalidatePath(root, 'layout')
  if (f.get('another')) return { ok: `${row.full_name} added.` }
  redirect(`${root}/students/${data.id}`)
}

// ---------- progress ----------
export async function recordProgress(_: FormState, f: FormData): Promise<FormState> {
  const { supabase, centre, root, user, isStaff } = await ctx(f)
  if (!isStaff) return { error: 'Only teachers can record progress.' }
  const studentId = str(f, 'student_id')
  const book = str(f, 'book')
  const page = Number(str(f, 'page'))
  if (!BOOKS.some((b) => b.name === book)) return { error: 'Choose a book.' }
  if (!Number.isInteger(page) || page < 1 || page > bookPages(book)) return { error: `Enter a page from 1 to ${bookPages(book)}.` }
  const { error } = await supabase
    .from('progress')
    .insert({ centre_id: centre.id, student_id: studentId, book, page, note: opt(f, 'note'), by_user: user.id })
  if (error) return { error: dbError(error.message) }
  revalidatePath(root, 'layout')
  return { ok: `Moved to ${book}, page ${page}.` }
}

// ---------- attendance ----------
export async function markAttendance(slug: string, classId: string, studentId: string, day: string, present: boolean | null) {
  const { supabase, centre, user } = await getCentre(slug)
  if (present === null) {
    const { error } = await supabase.from('attendance').delete().eq('student_id', studentId).eq('day', day)
    if (error) return { error: dbError(error.message) }
  } else {
    const { error } = await supabase
      .from('attendance')
      .upsert(
        { centre_id: centre.id, class_id: classId, student_id: studentId, day, present, marked_by: user.id },
        { onConflict: 'student_id,day' },
      )
    if (error) return { error: dbError(error.message) }
  }
  revalidatePath(`/c/${slug}`, 'layout')
  return { ok: true }
}

// ---------- people and invites ----------
export async function createInvite(_: FormState, f: FormData): Promise<FormState> {
  const { supabase, centre, root, role: myRole } = await ctx(f)
  const email = str(f, 'email').toLowerCase()
  const role = str(f, 'role') as Role
  const studentId = opt(f, 'student_id')
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: 'Enter a valid email address.' }
  if (!['admin', 'teacher', 'parent'].includes(role)) return { error: 'Choose a role.' }
  if (role === 'admin' && myRole !== 'owner') return { error: 'Only the owner can invite admins.' }
  const { data, error } = await supabase
    .from('invites')
    .insert({ centre_id: centre.id, email, role, student_id: role === 'parent' ? studentId : null })
    .select('token')
    .single()
  if (error) return { error: dbError(error.message) }
  revalidatePath(root, 'layout')
  return { ok: `Invitation ready for ${email}.`, token: data.token }
}

export async function revokeInvite(f: FormData) {
  const { supabase, root } = await ctx(f)
  await supabase.from('invites').delete().eq('id', str(f, 'id'))
  revalidatePath(root, 'layout')
}

export async function removeMember(f: FormData) {
  const { supabase, centre, root } = await ctx(f)
  await supabase.from('memberships').delete().eq('centre_id', centre.id).eq('user_id', str(f, 'user_id'))
  revalidatePath(root, 'layout')
}

export async function changeRole(f: FormData) {
  const { supabase, centre, root } = await ctx(f)
  await supabase.from('memberships').update({ role: str(f, 'role') }).eq('centre_id', centre.id).eq('user_id', str(f, 'user_id'))
  revalidatePath(root, 'layout')
}

// ---------- settings ----------
export async function saveCentre(_: FormState, f: FormData): Promise<FormState> {
  const { supabase, centre, root, role } = await ctx(f)
  if (role !== 'owner') return { error: 'Only the owner can change centre details.' }
  const name = str(f, 'name')
  if (name.length < 2) return { error: 'Enter the centre’s name.' }
  const { error } = await supabase.from('centres').update({ name, phone: opt(f, 'phone'), city: opt(f, 'city') }).eq('id', centre.id)
  if (error) return { error: dbError(error.message) }
  revalidatePath(root, 'layout')
  return { ok: 'Centre details saved.' }
}
