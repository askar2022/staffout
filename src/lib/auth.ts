import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Returns the authenticated user's org ID.
 * Throws if the request is not authenticated.
 * Use this at the top of every protected API route.
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

/** Standard API error response */
export function apiError(message: string, status = 400): Response {
  return Response.json({ error: message }, { status })
}

/** Standard API success response */
export function apiOk(data: Record<string, unknown>, status = 200): Response {
  return Response.json(data, { status })
}
