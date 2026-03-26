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

    // Get existing emails for this org to avoid duplicates
    const { data: existing } = await db
      .from('staff_members')
      .select('id, email')
      .eq('organization_id', orgId)

    const existingMap = new Map((existing ?? []).map((e) => [e.email.toLowerCase(), e.id]))

    // Split into inserts and updates
    const toInsert = records.filter((r) => !existingMap.has(r.email))
    const toUpdate = records.filter((r) => existingMap.has(r.email))

    let totalCount = 0

    if (toInsert.length > 0) {
      const { data: inserted, error: insertErr } = await db
        .from('staff_members')
        .insert(toInsert)
        .select('id')
      if (insertErr) return apiError('Insert failed: ' + insertErr.message, 500)
      totalCount += inserted?.length ?? 0
    }

    for (const r of toUpdate) {
      const id = existingMap.get(r.email)
      await db.from('staff_members').update(r).eq('id', id)
      totalCount++
    }

    const { data, error } = { data: { length: totalCount }, error: null }

    if (error) return apiError('Import failed', 500)

    return apiOk({ imported: data?.length ?? records.length })
  } catch (err) {
    if (err instanceof AuthError) return apiError('Unauthorized', 401)
    return apiError('Server error', 500)
  }
}
