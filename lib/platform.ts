import { notFound } from 'next/navigation'
import { requireUser } from '@/lib/centre'

export const PRICE_PER_STUDENT = 4 // RM per active student per month (product plan, suggested)
export const FREE_STUDENTS = 10

export { STAGES, STAGE_LABEL } from '@/lib/stages'

/** Platform admin only. Everyone else gets a 404, so the page's existence isn't revealed. */
export async function requirePlatformAdmin() {
  const { supabase, user } = await requireUser()
  const { data } = await supabase.from('platform_admins').select('user_id').eq('user_id', user.id).maybeSingle()
  if (!data) notFound()
  return { supabase, user }
}

export async function isPlatformAdmin(): Promise<boolean> {
  const { supabase, user } = await requireUser()
  const { data } = await supabase.from('platform_admins').select('user_id').eq('user_id', user.id).maybeSingle()
  return Boolean(data)
}

export type Health = 'new' | 'active' | 'quiet' | 'at_risk' | 'paused'

/** From the plan: low usage moves a centre to At risk. */
export function health(c: { status: string; created_at: string; attendance_14d: number; attendance_30d: number }): Health {
  if (c.status !== 'active') return 'paused'
  if (c.attendance_14d > 0) return 'active'
  const ageDays = (Date.now() - new Date(c.created_at).getTime()) / 86_400_000
  if (ageDays < 14) return 'new'
  return c.attendance_30d > 0 ? 'quiet' : 'at_risk'
}

export const HEALTH_LABEL: Record<Health, string> = {
  new: 'New',
  active: 'Active',
  quiet: 'Quiet',
  at_risk: 'At risk',
  paused: 'Paused',
}

export function rm(n: number) {
  return `RM${n.toLocaleString('en-MY', { maximumFractionDigits: 0 })}`
}
