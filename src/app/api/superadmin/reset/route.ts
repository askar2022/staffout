import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isValidEmail, apiError, apiOk } from '@/lib/auth'

async function requireSuperAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL
  if (!superAdminEmail || user.email !== superAdminEmail) throw new Error('Forbidden')
  return user
}

export async function POST(request: NextRequest) {
  try {
    await requireSuperAdmin()

    const body = await request.json()
    const { org_id, email } = body

    if (!org_id || !email || !isValidEmail(email)) {
      return apiError('org_id and a valid email are required')
    }

    const db = createAdminClient()

    const [{ data: org }, { data: recipient }] = await Promise.all([
      db
        .from('organizations')
        .select('id, name, slug, contact_email, status')
        .eq('id', org_id)
        .single(),
      db
        .from('notification_recipients')
        .select('id')
        .eq('organization_id', org_id)
        .eq('email', email)
        .eq('type', 'admin')
        .maybeSingle(),
    ])

    if (!org) return apiError('Organization not found', 404)
    if (org.status !== 'approved') return apiError('Organization must be approved before resetting admin access', 400)

    const matchesContact = !!org.contact_email && org.contact_email.toLowerCase() === email.toLowerCase()
    if (!recipient && !matchesContact) {
      return apiError('That email is not listed as a school admin for this organization', 404)
    }

    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'outofshift.com'
    const redirectTo = `https://${org.slug}.${rootDomain}/auth/reset-password`

    const { error } = await db.auth.resetPasswordForEmail(email, { redirectTo })
    if (error) {
      const errorMessage = error.message || 'Failed to send reset link'
      if (errorMessage.toLowerCase().includes('rate limit')) {
        return apiError('Too many reset emails were sent. Please wait a few minutes and try again.', 429)
      }
      return apiError(errorMessage, 500)
    }

    return apiOk({ success: true, email, redirect_to: redirectTo })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error'
    return apiError(msg, msg === 'Forbidden' ? 403 : 401)
  }
}
