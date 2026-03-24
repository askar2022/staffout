import { createAdminClient } from '@/lib/supabase/admin'
import { apiError, apiOk } from '@/lib/auth'

/**
 * Public endpoint — no auth required.
 * Returns ONLY what the staff submission form needs:
 *   - Organization name (for display)
 *   - Staff list (id + name + campus only — no emails, no supervisor details)
 *
 * Supervisor email is intentionally excluded from this response.
 * It gets looked up server-side when a submission is saved.
 */
export async function GET() {
  try {
    const db = createAdminClient()

    // For now we serve the first org. In multi-tenant with custom domains
    // this would resolve org by hostname or slug from query param.
    const { data: org } = await db
      .from('organizations')
      .select('id, name')
      .limit(1)
      .single()

    if (!org) return apiError('Organization not found', 404)

    const { data: staff } = await db
      .from('staff_members')
      .select('id, full_name, campus, position')  // no emails, no supervisor details
      .eq('organization_id', org.id)
      .eq('is_active', true)
      .order('full_name')

    return apiOk({
      org: { id: org.id, name: org.name },
      staff: staff ?? [],
    })
  } catch {
    return apiError('Server error', 500)
  }
}
