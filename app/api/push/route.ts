import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

// Delivers a notification to people's phones. Called only by the database (private.notify via pg_net),
// signed with a shared secret. It knows nothing private beyond the message itself.
export const runtime = 'nodejs'

type Sub = { endpoint: string; p256dh: string; auth: string }

export async function POST(req: Request) {
  const secret = process.env.PUSH_SECRET
  if (!secret || req.headers.get('x-push-secret') !== secret) return new Response('Forbidden', { status: 403 })
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  if (!pub || !priv) return new Response('Push not configured', { status: 503 })
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'https://bintangclass.vercel.app', pub, priv)

  const { title, body, url, tag, subs } = (await req.json()) as { title: string; body?: string; url: string; tag?: string; subs: Sub[] }
  const payload = JSON.stringify({ title, body, url, tag })
  const gone: string[] = []
  await Promise.all(
    (subs ?? []).slice(0, 200).map((s) =>
      webpush
        .sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 60 * 60 * 24, urgency: 'normal' })
        .catch((e: { statusCode?: number }) => {
          if (e?.statusCode === 404 || e?.statusCode === 410) gone.push(s.endpoint)
        }),
    ),
  )
  if (gone.length) {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!)
    await supabase.rpc('push_gone', { p_secret: secret, p_endpoints: gone })
  }
  return Response.json({ sent: (subs?.length ?? 0) - gone.length, gone: gone.length })
}
