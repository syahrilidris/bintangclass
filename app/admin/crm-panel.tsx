import { AccountForm, NoteForm } from './crm-forms'
import { ago } from '@/lib/recordings'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

const KIND: Record<string, string> = { note: 'Note', call: 'Call', whatsapp: 'WhatsApp', meeting: 'Meeting', system: 'Update' }

/** Malaysian numbers to wa.me format: 012-345 6789 → 60123456789 */
export function waNumber(phone: string | null): string | null {
  if (!phone) return null
  let d = phone.replace(/\D/g, '')
  if (d.startsWith('0')) d = '60' + d.slice(1)
  return d.length >= 10 ? d : null
}

// Contact, stage, follow-up and the history of calls and notes for one centre or lead.
export async function CrmPanel({ supabase, accountId }: { supabase: SupabaseClient<Database>; accountId: string }) {
  const [{ data: a }, { data: notes }] = await Promise.all([
    supabase.from('crm_accounts').select('*').eq('id', accountId).single(),
    supabase.from('crm_notes').select('id, kind, body, created_at').eq('account_id', accountId).order('created_at', { ascending: false }).limit(50),
  ])
  if (!a) return null
  const wa = waNumber(a.contact_phone)
  const message = `Assalamualaikum ${a.contact_name ?? ''}, this is Syahril from Bintang Class. `

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="section-title">Contact</h2>
          {wa ? (
            <a className="btn btn-quiet" target="_blank" rel="noreferrer" href={`https://wa.me/${wa}?text=${encodeURIComponent(message)}`}>
              Message on WhatsApp
            </a>
          ) : null}
        </div>
        <div className="mt-4"><AccountForm a={a} /></div>
      </section>
      <section>
        <h2 className="section-title">History</h2>
        <div className="mt-4"><NoteForm accountId={a.id} /></div>
        <ol className="mt-6 grid gap-4 border-l-2 border-line pl-5">
          {(notes ?? []).map((n) => (
            <li key={n.id} className="relative">
              <span className={`absolute -left-[1.6rem] top-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-paper ${n.kind === 'system' ? 'bg-faint' : 'bg-teal-600'}`} aria-hidden />
              <p className="text-xs text-muted">{KIND[n.kind] ?? n.kind}, {ago(n.created_at)}</p>
              <p className={n.kind === 'system' ? 'text-muted' : ''}>{n.body}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}
