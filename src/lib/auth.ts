import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'

/**
 * Returns the authenticated user's org ID.
 * If the user is a super admin with an active impersonation cookie,
 * returns that org's ID instead of their own.
 * Throws if the request is not authenticated.
 */
export async function requireAuth(): Promise<{ userId: string; orgId: string }> {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    throw new AuthError('Unauthorized')
  }

  // Super admin impersonation — use the cookie org instead of their own
  if (user.email === process.env.SUPER_ADMIN_EMAIL) {
    const cookieStore = await cookies()
    const impersonateOrgId = cookieStore.get('sa_impersonate_org')?.value
    if (impersonateOrgId) {
      return { userId: user.id, orgId: impersonateOrgId }
    }
  }

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (!profile?.organization_id) {
    throw new AuthError('No organization linked to this account')
  }

  return { userId: user.id, orgId: profile.organization_id }
}

export class AuthError extends Error {
  status = 401
  constructor(message: string) {
    super(message)
    this.name = 'AuthError'
  }
}

/** Sanitize a string — strip HTML tags, trim whitespace, limit length */
export function sanitize(value: unknown, maxLength = 500): string {
  if (typeof value !== 'string') return ''
  return value
    .trim()
    .replace(/<[^>]*>/g, '')
    .slice(0, maxLength)
}

/** Validate an email address format */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

/** Normalize work emails for storage and duplicate checks (case-insensitive) */
export function normalizeWorkEmail(email: string): string {
  return email.trim().toLowerCase()
}

/** Standard API error response */
export function apiError(message: string, status = 400): Response {
  return Response.json({ error: message }, { status })
}

/** Standard API success response */
export function apiOk(data: Record<string, unknown>, status = 200): Response {
  return Response.json(data, { status })
}
