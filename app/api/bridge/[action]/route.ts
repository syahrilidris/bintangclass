import { createClient } from '@supabase/supabase-js'

// The Bintang family app's door into Bintang Class: claim a pairing code, read one child's updates,
// or disconnect. The code or key in the request is the only permission; see the family_bridge migration.
export const runtime = 'nodejs'

const ALLOWED = ['https://app.bintangkids.com', 'https://bintangkids.vercel.app', 'http://localhost:3000', 'http://localhost:3200']

function cors(req: Request) {
  const origin = req.headers.get('origin') ?? ''
  const ok = ALLOWED.includes(origin) || /^https:\/\/bintangkids-[a-z0-9-]+\.vercel\.app$/.test(origin)
  return {
    'access-control-allow-origin': ok ? origin : ALLOWED[0],
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
    'access-control-max-age': '86400',
    vary: 'origin',
    'cache-control': 'no-store',
  }
}

export function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: cors(req) })
}

export async function POST(req: Request, { params }: { params: Promise<{ action: string }> }) {
  const { action } = await params
  const headers = cors(req)
  let body: { code?: string; token?: string; since?: string; label?: string }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Send JSON.' }, { status: 400, headers })
  }
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false },
  })

  let res
  if (action === 'claim' && typeof body.code === 'string') {
    res = await supabase.rpc('bridge_claim', { p_code: body.code.slice(0, 20), p_label: body.label ?? null })
  } else if (action === 'feed' && typeof body.token === 'string') {
    const since = body.since && !Number.isNaN(Date.parse(body.since)) ? body.since : null
    res = await supabase.rpc('bridge_feed', { p_token: body.token.slice(0, 100), p_since: since })
  } else if (action === 'disconnect' && typeof body.token === 'string') {
    res = await supabase.rpc('bridge_disconnect', { p_token: body.token.slice(0, 100) })
  } else {
    return Response.json({ error: 'Unknown request.' }, { status: 404, headers })
  }

  if (res.error) {
    const gone = /disconnected|doesn.t work/i.test(res.error.message)
    return Response.json({ error: res.error.message }, { status: gone ? (action === 'feed' ? 410 : 400) : 500, headers })
  }
  return Response.json(res.data ?? { ok: true }, { headers })
}
