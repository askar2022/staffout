import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { apiError, apiOk } from '@/lib/auth'

// Public endpoint — called from staff submit form (no auth)
// Returns PTO balance and used hours for a given staff member
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const staffId = searchParams.get('staff_id')
    const orgId = searchParams.get('org_id')

    if (!staffId || !orgId) return apiError('Missing staff_id or org_id')

    const db = createAdminClient()

    const [{ data: member }, { data: submissions }] = await Promise.all([
      db
        .from('staff_members')
        .select('pto_balance')
        .eq('id', staffId)
        .eq('organization_id', orgId)
        .single(),
      db
        .from('submissions')
        .select('pto_hours_deducted')
        .eq('staff_id', staffId)
        .eq('organization_id', orgId)
        .not('pto_hours_deducted', 'is', null),
    ])

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
