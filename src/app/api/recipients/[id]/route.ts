import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth, apiError, apiOk, AuthError, sanitize } from '@/lib/auth'
import { normalizeCampusScope } from '@/lib/notification-scope'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { orgId } = await requireAuth()
    const { id } = await params
    const body = await request.json()

    const db = createAdminClient()

    // Verify ownership
    const { data: existing } = await db
      .from('notification_recipients')
      .select('id')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single()

    if (!existing) return apiError('Recipient not found', 404)

    const updates: Record<string, boolean | string | null> = {}
    if (typeof body.receives_summary === 'boolean') updates.receives_summary = body.receives_summary
    if (typeof body.receives_instant === 'boolean') updates.receives_instant = body.receives_instant
    if ('campus_scope' in body) {
      const raw = body.campus_scope
      updates.campus_scope =
        typeof raw === 'string' ? normalizeCampusScope(sanitize(raw, 100)) : null
    }

    const { data, error } = await db
      .from('notification_recipients')
      .update(updates)
      .eq('id', id)
      .eq('organization_id', orgId)
      .select('id, name, email, campus_scope, type, receives_summary, receives_instant')
      .single()

    if (error) return apiError('Failed to update recipient', 500)
    return apiOk({ recipient: data })
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.message, 401)
    return apiError('Server error', 500)
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { orgId } = await requireAuth()
    const { id } = await params
    const db = createAdminClient()

    // Verify ownership before deleting
    const { data: existing } = await db
      .from('notification_recipients')
      .select('id')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single()

    if (!existing) return apiError('Recipient not found', 404)

    const { error } = await db
      .from('notification_recipients')
      .delete()
      .eq('id', id)
      .eq('organization_id', orgId)

    if (error) return apiError('Failed to delete recipient', 500)
    return apiOk({ success: true })
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.message, 401)
    return apiError('Server error', 500)
  }
}
