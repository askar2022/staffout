import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth, apiError, apiOk, AuthError } from '@/lib/auth'

const DEFAULT_SETTINGS = [
  { status: 'absent',        hours_per_day: 8 },
  { status: 'personal_day',  hours_per_day: 8 },
  { status: 'late',          hours_per_day: 2 },
  { status: 'leaving_early', hours_per_day: 4 },
  { status: 'appointment',   hours_per_day: 2 },
]

export async function GET() {
  try {
    const { orgId } = await requireAuth()
    const db = createAdminClient()

    const { data } = await db
      .from('pto_deduction_settings')
      .select('*')
      .eq('organization_id', orgId)
      .order('status')

    // Return existing or defaults if none set yet
    const settings = DEFAULT_SETTINGS.map((def) => {
      const existing = data?.find((d) => d.status === def.status)
      return existing ?? { ...def, organization_id: orgId, id: null }
    })

    return apiOk({ settings })
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.message, 401)
    return apiError('Server error', 500)
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { orgId } = await requireAuth()
    const db = createAdminClient()
    const body = await request.json()

    // body.settings = [{ status, hours_per_day }]
    const updates = (body.settings ?? []).filter(
      (s: { status: string; hours_per_day: number }) =>
        typeof s.status === 'string' && typeof s.hours_per_day === 'number'
    )

    if (updates.length === 0) return apiError('No valid settings provided')

    const rows = updates.map((s: { status: string; hours_per_day: number }) => ({
      organization_id: orgId,
      status: s.status,
      hours_per_day: Math.max(0, Number(s.hours_per_day)),
    }))

    const { error } = await db
      .from('pto_deduction_settings')
      .upsert(rows, { onConflict: 'organization_id,status' })

    if (error) return apiError('Failed to save settings', 500)
    return apiOk({ success: true })
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.message, 401)
    return apiError('Server error', 500)
  }
}
