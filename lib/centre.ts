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

export type AppUser = { id: string; email: string | null; user_metadata: Record<string, unknown> }

/**
 * The signed-in user, from the session token. getClaims checks the token's signature locally
 * (no round trip to the auth server on every page), and the database still checks it on every query.
 * Cached per request, so the layout and the page share one check.
 */
export const requireUser = cache(async () => {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const c = data?.claims
  if (!c?.sub) redirect('/login')
  const user: AppUser = {
    id: c.sub,
    email: typeof c.email === 'string' ? c.email : null,
    user_metadata: (c.user_metadata as Record<string, unknown> | undefined) ?? {},
  }
  return { supabase, user }
})

/** The centre in the URL plus the signed-in user's role there. 404 if they don't belong. One query, not two. */
export const getCentre = cache(async (slug: string) => {
  const { supabase, user } = await requireUser()
  const { data: me } = await supabase
    .from('memberships')
    .select('role, display_name, centres!inner(*)')
    .eq('user_id', user.id)
    .eq('centres.slug', slug)
    .maybeSingle()
  if (!me || !me.centres) notFound()
  const centre = me.centres
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
