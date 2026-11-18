'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requirePlatformAdmin, STAGES, STAGE_LABEL } from '@/lib/platform'

export type AdminState = { error?: string; ok?: string } | undefined

const str = (f: FormData, k: string) => String(f.get(k) ?? '').trim()
const opt = (f: FormData, k: string) => str(f, k) || null

export async function setCentrePlan(_: AdminState, f: FormData): Promise<AdminState> {
  const { supabase, user } = await requirePlatformAdmin()
  const id = str(f, 'centre_id')
  const plan = str(f, 'plan')
  const status = str(f, 'status')
  if (!['free', 'centre'].includes(plan) || !['active', 'read_only', 'closed'].includes(status)) return { error: 'Choose a plan and a status.' }
  const { data: before } = await supabase.from('centres').select('plan, status').eq('id', id).single()
  const { error } = await supabase.from('centres').update({ plan, status }).eq('id', id)
  if (error) return { error: error.message }
  if (before && (before.plan !== plan || before.status !== status)) {
    const { data: acct } = await supabase.from('crm_accounts').select('id').eq('centre_id', id).maybeSingle()
    if (acct) {
      const changes = [
        before.plan !== plan ? `plan ${before.plan} → ${plan}` : null,
        before.status !== status ? `status ${before.status} → ${status}` : null,
      ].filter(Boolean)
      await supabase.from('crm_notes').insert({ account_id: acct.id, kind: 'system', body: `Changed ${changes.join(', ')}`, created_by: user.id })
    }
  }
  revalidatePath('/admin', 'layout')
  return { ok: 'Saved.' }
}

export async function saveAccount(_: AdminState, f: FormData): Promise<AdminState> {
  const { supabase } = await requirePlatformAdmin()
  const stage = str(f, 'stage')
  if (!STAGES.includes(stage as (typeof STAGES)[number])) return { error: 'Choose a stage.' }
  const name = str(f, 'name')
  if (!name) return { error: 'Enter a name.' }
  const { error } = await supabase
    .from('crm_accounts')
    .update({
      name,
      stage,
      contact_name: opt(f, 'contact_name'),
      contact_phone: opt(f, 'contact_phone'),
      contact_email: opt(f, 'contact_email'),
      city: opt(f, 'city'),
      source: opt(f, 'source'),
      next_follow_up: opt(f, 'next_follow_up'),
    })
    .eq('id', str(f, 'id'))
  if (error) return { error: error.message }
  revalidatePath('/admin', 'layout')
  return { ok: `Saved. Stage: ${STAGE_LABEL[stage]}.` }
}

export async function addNote(_: AdminState, f: FormData): Promise<AdminState> {
  const { supabase, user } = await requirePlatformAdmin()
  const body = str(f, 'body')
  const kind = str(f, 'kind')
  if (!body) return { error: 'Write the note first.' }
  if (!['note', 'call', 'whatsapp', 'meeting'].includes(kind)) return { error: 'Choose what kind of note it is.' }
  const { error } = await supabase.from('crm_notes').insert({ account_id: str(f, 'account_id'), body, kind, created_by: user.id })
  if (error) return { error: error.message }
  revalidatePath('/admin', 'layout')
  return { ok: 'Note added.' }
}

export async function addLead(_: AdminState, f: FormData): Promise<AdminState> {
  const { supabase, user } = await requirePlatformAdmin()
  const name = str(f, 'name')
  if (!name) return { error: 'Enter the centre’s name.' }
  const { data, error } = await supabase
    .from('crm_accounts')
    .insert({
      name,
      stage: 'lead',
      contact_name: opt(f, 'contact_name'),
      contact_phone: opt(f, 'contact_phone'),
      city: opt(f, 'city'),
      source: opt(f, 'source'),
      next_follow_up: opt(f, 'next_follow_up'),
    })
    .select('id')
    .single()
  if (error) return { error: error.message }
  await supabase.from('crm_notes').insert({ account_id: data.id, kind: 'system', body: 'Lead added', created_by: user.id })
  revalidatePath('/admin', 'layout')
  redirect(`/admin/crm/${data.id}`)
}
