import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sanitize, isValidEmail, apiError, apiOk } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) return apiError('Unauthorized', 401)

    const body = await request.json()

    const name = sanitize(body.name, 150)
    if (!name) return apiError('School name is required')

    const adminName = sanitize(body.admin_name, 100)
    const contactEmail = sanitize(body.contact_email, 200)
    if (contactEmail && !isValidEmail(contactEmail)) return apiError('Invalid contact email')

    const db = createAdminClient()

    // Prevent double setup
    const { data: existingProfile } = await db
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (existingProfile?.organization_id) {
      return apiError('This account already has a school set up', 400)
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')

    const { data: org, error: orgError } = await db
      .from('organizations')
      .insert({
        name,
        slug: `${slug}-${Date.now()}`,
        contact_email: contactEmail || user.email,
        reply_to_email: contactEmail || user.email,
      })
      .select()
      .single()

    if (orgError || !org) return apiError('Failed to create organization', 500)

    await db
      .from('profiles')
      .update({ organization_id: org.id, full_name: adminName || null })
      .eq('id', user.id)

    // Add the admin as the first notification recipient
    await db.from('notification_recipients').insert({
      organization_id: org.id,
      name: adminName || 'Administrator',
      email: user.email!,
      type: 'admin',
      receives_summary: true,
      receives_instant: true,
    })

    return apiOk({ success: true, org_id: org.id }, 201)
  } catch {
    return apiError('Server error', 500)
  }
}
