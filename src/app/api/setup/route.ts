import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sanitize, apiError, apiOk } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) return apiError('Unauthorized', 401)

    const body = await request.json()
    const adminName = sanitize(body.admin_name, 100)

    const db = createAdminClient()

    // Prevent double setup
    const { data: existingProfile } = await db
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (existingProfile?.organization_id) {
      return apiError('This account is already linked to a school', 400)
    }

    // Invite flow: the org already exists — find it by the subdomain slug
    // that middleware injected into the request headers
    const orgSlug = request.headers.get('x-org-slug')
    if (!orgSlug) {
      return apiError('No school subdomain detected. Please use the invite link from your email.', 400)
    }

    const { data: org } = await db
      .from('organizations')
      .select('id, name, status')
      .eq('slug', orgSlug)
      .single()

    if (!org) {
      return apiError('School not found. Please contact your administrator.', 404)
    }

    if (org.status !== 'approved') {
      return apiError('This school account is not yet active.', 403)
    }

    // Link the user to the org
    await db
      .from('profiles')
      .update({
        organization_id: org.id,
        full_name: adminName || null,
      })
      .eq('id', user.id)

    // Add them as an admin notification recipient if not already there
    const { data: existing } = await db
      .from('notification_recipients')
      .select('id')
      .eq('organization_id', org.id)
      .eq('email', user.email!)
      .single()

    if (!existing) {
      await db.from('notification_recipients').insert({
        organization_id: org.id,
        name: adminName || 'Administrator',
        email: user.email!,
        type: 'admin',
        receives_summary: true,
        receives_instant: true,
      })
    }

    return apiOk({ success: true, org_id: org.id })
  } catch {
    return apiError('Server error', 500)
  }
}
