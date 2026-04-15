import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { apiError, apiOk, isValidEmail, normalizeWorkEmail } from '@/lib/auth'
import { hasRecentVerifiedOtp } from '@/lib/public-security'

// Public endpoint — called from staff submit form (no auth)
// Returns PTO balance and used hours for a given staff member
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const staffId = searchParams.get('staff_id')
    const orgId = searchParams.get('org_id')
    const email = normalizeWorkEmail(searchParams.get('email') ?? '')
    const orgSlug = request.headers.get('x-org-slug')

    if (!staffId || !orgId || !email) return apiError('Missing staff_id, org_id, or email')
    if (!isValidEmail(email)) return apiError('Valid email is required')
    if (!orgSlug) return apiError('PTO lookups must come from a school subdomain.', 403)

    const db = createAdminClient()

    const { data: org } = await db
      .from('organizations')
      .select('id')
      .eq('id', orgId)
      .eq('slug', orgSlug)
      .eq('status', 'approved')
      .single()

    if (!org) return apiError('Organization not found', 404)

    const hasVerifiedOtp = await hasRecentVerifiedOtp(db, email, org.id)
    if (!hasVerifiedOtp) {
      return apiError('Please verify your email again before checking PTO.', 403)
    }

    const [{ data: member }, { data: submissions }] = await Promise.all([
      db
        .from('staff_members')
        .select('pto_balance')
        .eq('id', staffId)
        .eq('organization_id', orgId)
        .ilike('email', email)
        .single(),
      db
        .from('submissions')
        .select('pto_hours_deducted')
        .eq('staff_id', staffId)
        .eq('organization_id', orgId)
        .not('pto_hours_deducted', 'is', null),
    ])

    if (!member) return apiError('That verified email does not match this staff record.', 403)

    const balance = member?.pto_balance ?? null
    const used = (submissions ?? []).reduce(
      (sum, s) => sum + (s.pto_hours_deducted ?? 0),
      0
    )

    return apiOk({ balance, used, remaining: balance !== null ? balance - used : null })
  } catch {
    return apiError('Server error', 500)
  }
}
