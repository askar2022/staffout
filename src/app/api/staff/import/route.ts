import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth, apiError, apiOk, AuthError } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { orgId } = await requireAuth()
    const body = await request.json()
    const rows = body.rows as {
      full_name: string
      email: string
      position?: string
      campus?: string
      supervisor_name?: string
      supervisor_email?: string
    }[]

    if (!Array.isArray(rows) || rows.length === 0) {
      return apiError('No valid rows to import')
    }

    if (rows.length > 200) {
      return apiError('Maximum 200 staff per import')
    }

    const db = createAdminClient()

    const records = rows
      .filter((r) => r.full_name?.trim() && r.email?.trim())
      .map((r) => ({
        organization_id: orgId,
        full_name: r.full_name.trim(),
        email: r.email.trim().toLowerCase(),
        position: r.position?.trim() || null,
        campus: r.campus?.trim() || null,
        supervisor_name: r.supervisor_name?.trim() || null,
        supervisor_email: r.supervisor_email?.trim().toLowerCase() || null,
        is_active: true,
      }))

    if (records.length === 0) {
      return apiError('No valid rows found — make sure Name and Email columns are filled')
    }

    // Upsert on email+org so re-importing updates existing staff
    const { data, error } = await db
      .from('staff_members')
      .upsert(records, { onConflict: 'organization_id,email', ignoreDuplicates: false })
      .select('id')

    if (error) return apiError('Import failed: ' + error.message, 500)

    return apiOk({ imported: data?.length ?? records.length })
  } catch (err) {
    if (err instanceof AuthError) return apiError('Unauthorized', 401)
    return apiError('Server error', 500)
  }
}
