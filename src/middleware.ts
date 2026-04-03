import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'outofshift.com'

/**
 * Extract the subdomain from the request host.
 * Returns null for the root domain (marketing) or unknown hosts.
 */
function getSubdomain(hostname: string): string | null {
  const host = hostname.split(':')[0] // strip port

  // Local dev: hba.localhost
  if (host === 'localhost') return null
  if (host.endsWith('.localhost')) {
    const sub = host.slice(0, -('.localhost'.length))
    return sub || null
  }

  // Production: hba.outofshift.com
  if (host === ROOT_DOMAIN || host === `www.${ROOT_DOMAIN}`) return null
  if (host.endsWith(`.${ROOT_DOMAIN}`)) {
    const sub = host.slice(0, -(ROOT_DOMAIN.length + 1))
    // Reject nested subdomains (a.b.outofshift.com)
    if (!sub.includes('.') && sub.length > 0) return sub
  }

  return null
}

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || ''
  const subdomain = getSubdomain(hostname)

  // Inject org slug into request headers for server components and route handlers
  const requestHeaders = new Headers(request.headers)
  if (subdomain) {
    requestHeaders.set('x-org-slug', subdomain)
  } else {
    requestHeaders.delete('x-org-slug')
  }

  // Cookie domain: set to .rootdomain in production so sessions are shared
  // across all subdomains (hba., spa., demo., etc.)
  const cookieDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN
    ? `.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}`
    : undefined

  let response = NextResponse.next({
    request: { headers: requestHeaders },
  })

  // Supabase session refresh — must run on every request
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({
            request: { headers: requestHeaders },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, {
              ...options,
              ...(cookieDomain ? { domain: cookieDomain } : {}),
            })
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // ── Root domain (no subdomain) ─────────────────────────────────────────────
  // Marketing page, super admin, signup live here.
  // Protect /dashboard on root — only super admin can reach it via /superadmin.
  if (!subdomain) {
    if (pathname.startsWith('/dashboard') && !user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
    return response
  }

  // ── Subdomain (school or demo) ─────────────────────────────────────────────

  // Protect dashboard routes
  if (pathname.startsWith('/dashboard') && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Redirect already logged-in users away from login/signup
  if ((pathname === '/login' || pathname === '/signup') && user) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // Redirect root path to the submit form on school subdomains
  if (pathname === '/') {
    const url = request.nextUrl.clone()
    url.pathname = '/submit'
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
