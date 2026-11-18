import { cache } from 'react'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type Role = 'owner' | 'admin' | 'teacher' | 'parent'

export const ROLE_LABEL: Record<Role, string> = {
  owner: 'Owner',
  admin: 'Admin',
  teacher: 'Teacher',
  parent: 'Parent',
}

export async function requireUser() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  if (!data.user) redirect('/login')
  return { supabase, user: data.user }
}

/** The centre in the URL plus the signed-in user's role there. 404 if they don't belong. */
export const getCentre = cache(async (slug: string) => {
  const { supabase, user } = await requireUser()
  const { data: centre } = await supabase.from('centres').select('*').eq('slug', slug).maybeSingle()
  if (!centre) notFound()
  const { data: me } = await supabase
    .from('memberships')
    .select('role, display_name')
    .eq('centre_id', centre.id)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!me) notFound()
  const role = me.role as Role
  return {
    supabase,
    user,
    centre,
    role,
    myName: me.display_name,
    isManager: role === 'owner' || role === 'admin',
    isStaff: role !== 'parent',
    canWrite: centre.status === 'active',
  }
})

export function displayName(user: { email?: string | null; user_metadata?: Record<string, unknown> }) {
  const name = user.user_metadata?.full_name
  return typeof name === 'string' && name.trim() ? name.trim() : (user.email ?? '').split('@')[0]
}

/** Today's date in Malaysia, as YYYY-MM-DD */
export function todayMY(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kuala_Lumpur' }).format(new Date())
}

const TITLES = /^(ustazah|ustaz|ust\.?|cikgu|puan|pn\.?|encik|en\.?|tuan|hajah|haji|hj\.?|dr\.?|datin|dato'?|datuk)$/i

/** How to greet someone: "Puan Siti Aminah" → "Puan Siti", "Aisyah Rahman" → "Aisyah". */
export function greetingName(full: string | null | undefined): string {
  const words = (full ?? '').trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return ''
  return TITLES.test(words[0]) && words[1] ? `${words[0]} ${words[1]}` : words[0]
}
