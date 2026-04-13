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

// POST — invite a school admin by email
// Sends a Supabase invite that lands on the school subdomain callback,
// then goes to password setup before finishing school setup.
export async function POST(request: NextRequest) {
  try {
    await requireSuperAdmin()

    const body = await request.json()
    const { org_id, email } = body

    if (!org_id || !email || !isValidEmail(email)) {
      return apiError('org_id and a valid email are required')
    }

    const db = createAdminClient()

    // Load the org to get its slug
    const { data: org } = await db
      .from('organizations')
      .select('id, name, slug, status')
      .eq('id', org_id)
      .single()

    if (!org) return apiError('Organization not found', 404)
    if (org.status !== 'approved') return apiError('Organization must be approved before inviting admins', 400)
    if (!org.slug) return apiError('Set a subdomain slug for this school before inviting admins', 400)

    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'outofshift.com'
    const redirectTo = `https://${org.slug}.${rootDomain}/auth/callback?next=/auth/reset-password`

    // Send Supabase invite — creates the auth user and emails a magic setup link
    const { error: inviteError } = await db.auth.admin.inviteUserByEmail(email, {
      redirectTo,
      data: {
        invited_org_id: org.id,
        invited_org_name: org.name,
      },
    })

    if (inviteError) {
      // If user already exists, they can just navigate to /setup on their subdomain
      if (inviteError.message?.includes('already been registered')) {
        return apiError('This email already has an account. Ask them to go to ' + redirectTo, 409)
      }
      return apiError(inviteError.message || 'Failed to send invite', 500)
    }

    return apiOk({ success: true, redirect_to: redirectTo })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error'
    return apiError(msg, msg === 'Forbidden' ? 403 : 401)
  }
}
