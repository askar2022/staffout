import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth, sanitize, isValidEmail, apiError, apiOk, AuthError } from '@/lib/auth'

export async function GET() {
  try {
    const { orgId } = await requireAuth()
    const db = createAdminClient()

    const { data, error } = await db
      .from('staff_members')
      .select('id, full_name, email, position, campus, supervisor_name, supervisor_email, is_active, pto_balance, created_at')
      .eq('organization_id', orgId)
      .eq('is_active', true)
      .order('full_name')

    if (error) return apiError('Failed to load staff', 500)
    return apiOk({ staff: data ?? [] })
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.message, 401)
    return apiError('Server error', 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { orgId } = await requireAuth()
    const body = await request.json()

    const fullName = sanitize(body.full_name, 100)
    if (!fullName) return apiError('Full name is required')

    const email = sanitize(body.email, 200)
    if (email && !isValidEmail(email)) return apiError('Invalid email address')

    const supervisorEmail = sanitize(body.supervisor_email, 200)
    if (supervisorEmail && !isValidEmail(supervisorEmail)) return apiError('Invalid supervisor email')

    const db = createAdminClient()
    const { data, error } = await db
      .from('staff_members')
      .insert({
        organization_id: orgId,
        full_name: fullName,
        email: email || null,
        position: sanitize(body.position, 100) || null,
        campus: sanitize(body.campus, 100) || null,
        supervisor_name: sanitize(body.supervisor_name, 100) || null,
        supervisor_email: supervisorEmail || null,
        is_active: true,
      })
      .select('id, full_name, email, position, campus, supervisor_name, supervisor_email, is_active, pto_balance, created_at')
      .single()

    if (error) return apiError('Failed to add staff member', 500)
    return apiOk({ member: data }, 201)
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.message, 401)
    return apiError('Server error', 500)
  }
}
