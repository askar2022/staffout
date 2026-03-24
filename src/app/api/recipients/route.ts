import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth, sanitize, isValidEmail, apiError, apiOk, AuthError } from '@/lib/auth'

const ALLOWED_TYPES = ['all_staff', 'admin', 'reception', 'hr']

export async function GET() {
  try {
    const { orgId } = await requireAuth()
    const db = createAdminClient()

    const { data, error } = await db
      .from('notification_recipients')
      .select('id, name, email, type, receives_summary, receives_instant')
      .eq('organization_id', orgId)
      .order('created_at')

    if (error) return apiError('Failed to load recipients', 500)
    return apiOk({ recipients: data ?? [] })
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.message, 401)
    return apiError('Server error', 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { orgId } = await requireAuth()
    const body = await request.json()

    const name = sanitize(body.name, 100)
    if (!name) return apiError('Name is required')

    const email = sanitize(body.email, 200)
    if (!email || !isValidEmail(email)) return apiError('Valid email is required')

    const type = sanitize(body.type, 50)
    if (!ALLOWED_TYPES.includes(type)) return apiError('Invalid recipient type')

    const db = createAdminClient()
    const { data, error } = await db
      .from('notification_recipients')
      .insert({
        organization_id: orgId,
        name,
        email,
        type,
        receives_summary: true,
        receives_instant: true,
      })
      .select('id, name, email, type, receives_summary, receives_instant')
      .single()

    if (error) return apiError('Failed to add recipient', 500)
    return apiOk({ recipient: data }, 201)
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.message, 401)
    return apiError('Server error', 500)
  }
}
