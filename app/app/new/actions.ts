'use server'

import { redirect } from 'next/navigation'
import { displayName, requireUser } from '@/lib/centre'

export type CreateState = { error?: string } | undefined

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}

export async function createCentre(_: CreateState, form: FormData): Promise<CreateState> {
  const { supabase, user } = await requireUser()
  const name = String(form.get('name') ?? '').trim()
  const slug = slugify(String(form.get('slug') ?? '') || name)
  const phone = String(form.get('phone') ?? '').trim() || undefined
  const city = String(form.get('city') ?? '').trim() || undefined

  if (name.length < 2) return { error: 'Enter your centre’s name.' }
  if (slug.length < 2) return { error: 'Choose a web address of at least 2 letters or numbers.' }

  const { error } = await supabase.rpc('create_centre', {
    p_name: name,
    p_slug: slug,
    p_phone: phone,
    p_city: city,
    p_display_name: displayName(user),
  })
  if (error) {
    if (/duplicate key|centres_slug_key/i.test(error.message)) return { error: `The address “${slug}” is taken. Try another.` }
    if (/too many centres/i.test(error.message)) return { error: 'You already own 5 centres, the most one account can own.' }
    return { error: error.message }
  }
  redirect(`/c/${slug}`)
}
