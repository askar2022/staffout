import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth, sanitize, isValidEmail, normalizeWorkEmail, apiError, apiOk, AuthError } from '@/lib/auth'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { orgId } = await requireAuth()
    const { id } = await params
    const body = await request.json()
    const db = createAdminClient()

    // Verify ownership
    const { data: existing } = await db
      .from('staff_members')
      .select('id')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single()

    if (!existing) return apiError('Staff member not found', 404)

    // Archive / restore — only is_active flag
    if (typeof body.is_active === 'boolean' && Object.keys(body).length === 1) {
      const { data, error } = await db
        .from('staff_members')
        .update({ is_active: body.is_active })
        .eq('id', id)
        .eq('organization_id', orgId)
      .select('id, full_name, email, position, campus, supervisor_name, supervisor_email, is_active, pto_balance, employee_id, created_at')
      .single()
      if (error) return apiError('Failed to update staff member', 500)
      return apiOk({ member: data })
    }

    // Full edit — requires full_name
    const fullName = sanitize(body.full_name, 100)
    if (!fullName) return apiError('Full name is required')

    const emailRaw = sanitize(body.email, 200)
    if (emailRaw && !isValidEmail(emailRaw)) return apiError('Invalid email address')
    const email = emailRaw ? normalizeWorkEmail(emailRaw) : ''

    const supervisorEmail = sanitize(body.supervisor_email, 200)
    if (supervisorEmail && !isValidEmail(supervisorEmail)) return apiError('Invalid supervisor email')

    if (email) {
      const { data: dupe } = await db
        .from('staff_members')
        .select('id')
        .eq('organization_id', orgId)
        .eq('is_active', true)
        .ilike('email', email)
        .neq('id', id)
        .limit(1)
        .maybeSingle()
      if (dupe) {
        return apiError(
          'Another staff member already uses this email. Use a different email or archive the duplicate.',
          409
        )
      }
    }

    const ptoBalance = body.pto_balance !== undefined
      ? (body.pto_balance === '' || body.pto_balance === null ? null : Number(body.pto_balance))
      : undefined

    const { data, error } = await db
      .from('staff_members')
      .update({
        full_name: fullName,
        email: email || null,
        position: sanitize(body.position, 100) || null,
        campus: sanitize(body.campus, 100) || null,
        supervisor_name: sanitize(body.supervisor_name, 100) || null,
        supervisor_email: supervisorEmail ? normalizeWorkEmail(supervisorEmail) : null,
        employee_id: sanitize(body.employee_id, 50) || null,
        ...(ptoBalance !== undefined ? { pto_balance: ptoBalance } : {}),
      })
      .eq('id', id)
      .eq('organization_id', orgId)
      .select('id, full_name, email, position, campus, supervisor_name, supervisor_email, is_active, pto_balance, employee_id, created_at')
      .single()

    if (error) return apiError('Failed to update staff member', 500)
    return apiOk({ member: data })
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
      .from('staff_members')
      .select('id')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single()

    if (!existing) return apiError('Staff member not found', 404)

    const { error } = await db
      .from('staff_members')
      .delete()
      .eq('id', id)
      .eq('organization_id', orgId)

    if (error) return apiError('Failed to delete staff member', 500)
    return apiOk({ success: true })
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.message, 401)
    return apiError('Server error', 500)
  }
}
