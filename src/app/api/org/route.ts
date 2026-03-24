import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth, sanitize, isValidEmail, apiError, apiOk, AuthError } from '@/lib/auth'

export async function GET() {
  try {
    const { orgId } = await requireAuth()
    const db = createAdminClient()

    const { data, error } = await db
      .from('organizations')
      .select('id, name, reply_to_email, summary_send_time, timezone')
      .eq('id', orgId)
      .single()

    if (error) return apiError('Failed to load organization', 500)
    return apiOk({ org: data })
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.message, 401)
    return apiError('Server error', 500)
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { orgId } = await requireAuth()
    const body = await request.json()

    const name = sanitize(body.name, 150)
    if (!name) return apiError('Organization name is required')

    const replyTo = sanitize(body.reply_to_email, 200)
    if (replyTo && !isValidEmail(replyTo)) return apiError('Invalid reply-to email')

    // Validate time format HH:MM
    const summaryTime = sanitize(body.summary_send_time, 5)
    if (summaryTime && !/^\d{2}:\d{2}$/.test(summaryTime)) return apiError('Invalid time format')

    const db = createAdminClient()
    const { data, error } = await db
      .from('organizations')
      .update({
        name,
        reply_to_email: replyTo || null,
        summary_send_time: summaryTime || '08:00',
      })
      .eq('id', orgId)
      .select('id, name, reply_to_email, summary_send_time')
      .single()

    if (error) return apiError('Failed to update organization', 500)
    return apiOk({ org: data })
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.message, 401)
    return apiError('Server error', 500)
  }
}
