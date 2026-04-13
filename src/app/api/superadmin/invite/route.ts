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
// Sends a Supabase invite that lands directly on the school password setup page.
export async function POST(request: NextRequest) {
  try {
    await requireSuperAdmin()

    const body = await request.json()
    const { org_id, email } = body

    if (!org_id || !email || !isValidEmail(email)) {
      return apiError('org_id and a valid email are required')
    }

    const db = createAdminClient()
    const cleanEmail = email.trim().toLowerCase()

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
    const loginUrl = `https://${org.slug}.${rootDomain}/login`
    const redirectTo = `https://${org.slug}.${rootDomain}/auth/reset-password?next=/setup`

    // Preflight: if the auth user already exists, steer the owner toward reset/sign-in
    const { data: usersPage, error: listUsersError } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 })
    if (listUsersError) {
      console.error('Invite admin preflight failed', {
        email: cleanEmail,
        org_id,
        org_slug: org.slug,
        error: listUsersError,
      })
      return apiError(`Could not verify existing users before inviting: ${listUsersError.message}`, 500)
    }

    const existingUser = usersPage.users.find((user) => user.email?.toLowerCase() === cleanEmail)
    if (existingUser) {
      return apiError(`This email already has an account. Ask them to sign in at ${loginUrl} or use Send reset link.`, 409)
    }

    // Send Supabase invite — creates the auth user and emails a magic setup link
    const { error: inviteError } = await db.auth.admin.inviteUserByEmail(cleanEmail, {
      redirectTo,
      data: {
        invited_org_id: org.id,
        invited_org_name: org.name,
      },
    })

    if (inviteError) {
      console.error('Invite school admin failed', {
        email: cleanEmail,
        org_id,
        org_slug: org.slug,
        redirectTo,
        error: inviteError,
      })

      if (inviteError.message?.includes('already been registered')) {
        return apiError(`This email already has an account. Ask them to sign in at ${loginUrl} or use Send reset link.`, 409)
      }

      if (inviteError.message?.toLowerCase().includes('database error saving new user')) {
        return apiError(
          `Supabase could not create the invited auth user for ${cleanEmail}. This usually means there is still a Supabase Auth-side issue, not an HBA school setup issue. Check Authentication > Auth Hooks and any custom invite email template settings.`,
          500,
        )
      }

      return apiError(`Invite failed for ${cleanEmail}: ${inviteError.message || 'Unknown Supabase error'}`, 500)
    }

    return apiOk({ success: true, redirect_to: redirectTo, email: cleanEmail })
  } catch (err) {
    console.error('Invite school admin route crashed', err)
    const msg = err instanceof Error ? err.message : 'Error'
    return apiError(msg, msg === 'Forbidden' ? 403 : 401)
  }
}
