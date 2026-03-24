import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { apiError, apiOk } from '@/lib/auth'

/**
 * Public endpoint — requires a valid submit_token.
 * Returns ONLY what the staff submission form needs.
 * Staff names are hidden from anyone without the correct token.
 *
 * Usage: GET /api/public/form-data?token=abc123
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token')

    // No token = return nothing — form shows manual name entry only
    if (!token) {
      return apiOk({ org: null, staff: [] })
    }

    const db = createAdminClient()

    // Look up org by secret token only
    const { data: org } = await db
      .from('organizations')
      .select('id, name')
      .eq('submit_token', token)
      .eq('status', 'approved')
      .single()

    if (!org) {
      // Invalid token — return empty, don't reveal why
      return apiOk({ org: null, staff: [] })
    }

    const { data: staff } = await db
      .from('staff_members')
      .select('id, full_name, campus, position')
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
