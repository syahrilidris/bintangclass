import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import type { Role } from '@/lib/centre'

export type Person = { user_id: string; name: string; role: Role; main_contact: boolean; billing_contact: boolean }

/** Members of a centre the signed-in user is allowed to see (RLS: staff see everyone, parents only themselves). */
export async function loadPeople(supabase: SupabaseClient<Database>, centreId: string): Promise<Map<string, Person>> {
  const { data } = await supabase
    .from('memberships')
    .select('user_id, display_name, role, main_contact, billing_contact')
    .eq('centre_id', centreId)
    .order('created_at')
  return new Map(
    (data ?? []).map((m) => [
      m.user_id,
      { user_id: m.user_id, name: m.display_name || 'Unnamed member', role: m.role as Role, main_contact: m.main_contact, billing_contact: m.billing_contact },
    ]),
  )
}

export function initials(name: string): string {
  return name
    .replace(/^(ustazah|ustaz|cikgu|puan|encik|tuan|dr\.?)\s+/i, '')
    .split(/\s+/)
    .filter((w) => w && !/^(bin|binti|bt|b\.)$/i.test(w))
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('')
}
