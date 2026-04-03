import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { apiError, apiOk } from '@/lib/auth'

/**
 * Returns the current user's organization slug.
 * Used on the root domain after login to redirect the admin to their subdomain.
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return apiError('Unauthorized', 401)

    const db = createAdminClient()
    const { data: profile } = await db
      .from('profiles')
      .select('organization_id, organizations(slug, name, status)')
      .eq('id', user.id)
      .single()

    const org = profile?.organizations as unknown as { slug: string; name: string; status: string } | null

    if (!org) return apiOk({ slug: null, name: null })

    return apiOk({ slug: org.slug, name: org.name, status: org.status })
  } catch {
    return apiError('Server error', 500)
  }
}
