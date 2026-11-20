import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Refreshes the Supabase session cookie on every request and keeps signed-out visitors
// out of the app. Data access is still enforced by Row Level Security, not here.
// The app's home is class.bintangkids.com. The old Vercel address forwards page visits there,
// but still serves the service worker, manifest and /api so installed phones and push keep working.
const HOME = 'class.bintangkids.com'
const OLD = 'bintangclass.vercel.app'

export async function middleware(request: NextRequest) {
  if (request.headers.get('host') === OLD && !request.nextUrl.pathname.startsWith('/api/')) {
    const url = new URL(request.nextUrl.pathname + request.nextUrl.search, `https://${HOME}`)
    return NextResponse.redirect(url, 308)
  }
  let response = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet) => {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    },
  )

  const { data } = await supabase.auth.getClaims()
  const signedIn = Boolean(data?.claims?.sub)
  const path = request.nextUrl.pathname

  if (!signedIn && (path.startsWith('/app') || path.startsWith('/c/') || path.startsWith('/admin'))) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.search = `?next=${encodeURIComponent(path)}`
    return NextResponse.redirect(url)
  }
  if (signedIn && (path === '/login' || path === '/signup')) {
    const url = request.nextUrl.clone()
    url.pathname = request.nextUrl.searchParams.get('next') || '/app'
    url.search = ''
    return NextResponse.redirect(url)
  }
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|icons/|splash/|offline.html|.*\\.(?:svg|png|jpg|jpeg|webp|ico|woff2?)$).*)'],
}
