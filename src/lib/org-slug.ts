/**
 * Client-side utility to read the current org slug from the browser hostname.
 * This mirrors the server-side subdomain logic in middleware.ts.
 * Safe to call in 'use client' components.
 */
export function getClientOrgSlug(): string | null {
  if (typeof window === 'undefined') return null

  const host = window.location.hostname
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'outofshift.com'

  // Local dev: hba.localhost
  if (host === 'localhost') return null
  if (host.endsWith('.localhost')) {
    const sub = host.slice(0, -('.localhost'.length))
    return sub || null
  }

  // Production: hba.outofshift.com
  if (host === rootDomain || host === `www.${rootDomain}`) return null
  if (host.endsWith(`.${rootDomain}`)) {
    const sub = host.slice(0, -(rootDomain.length + 1))
    if (!sub.includes('.') && sub.length > 0) return sub
  }

  return null
}
