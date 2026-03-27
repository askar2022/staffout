import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth, apiError, apiOk, AuthError } from '@/lib/auth'

export async function POST() {
  try {
    const { orgId } = await requireAuth()
    const db = createAdminClient()

    // Get all active staff members
    const { data: staffList, error: staffError } = await db
      .from('staff_members')
      .select('full_name, email')
      .eq('organization_id', orgId)
      .eq('is_active', true)
      .not('email', 'is', null)

    if (staffError) return apiError('Failed to load staff', 500)
    if (!staffList || staffList.length === 0) return apiError('No active staff found', 400)

    // Get existing recipient emails to avoid duplicates
    const { data: existing } = await db
      .from('notification_recipients')
      .select('email')
      .eq('organization_id', orgId)

    const existingEmails = new Set((existing ?? []).map((r: { email: string }) => r.email.toLowerCase()))

    const toInsert = staffList
      .filter((s) => s.email && !existingEmails.has(s.email.toLowerCase()))
      .map((s) => ({
        organization_id: orgId,
        name: s.full_name,
        email: s.email,
        type: 'all_staff',
        receives_summary: true,
        receives_instant: true,
      }))

    if (toInsert.length === 0) {
      return apiOk({ added: 0, message: 'All staff are already in the recipient list.' })
    }

    const { error: insertError } = await db
      .from('notification_recipients')
      .insert(toInsert)

    if (insertError) return apiError('Failed to sync staff', 500)

    return apiOk({ added: toInsert.length, skipped: staffList.length - toInsert.length })
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.message, 401)
    return apiError('Server error', 500)
  }
}
