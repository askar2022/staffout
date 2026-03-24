import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sanitize, isValidEmail, apiError, apiOk } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const email = sanitize(body.email, 200).toLowerCase()
    const code = sanitize(body.code, 6)

    if (!email || !isValidEmail(email)) return apiError('Valid email is required')
    if (!code || !/^\d{6}$/.test(code)) return apiError('Invalid code format')

    const db = createAdminClient()

    // Look up the OTP code
    const { data: otpRecord } = await db
      .from('otp_codes')
      .select('*')
      .eq('email', email)
      .eq('code', code)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (!otpRecord) {
      return apiError('Invalid or expired code. Please request a new one.', 401)
    }

    // Mark code as used immediately (prevent replay attacks)
    await db
      .from('otp_codes')
      .update({ used: true })
      .eq('id', otpRecord.id)

    // Look up staff member by email
    const { data: staffMember } = await db
      .from('staff_members')
      .select('id, full_name, position, campus, supervisor_email, supervisor_name, organization_id')
      .eq('email', email)
      .eq('is_active', true)
      .single()

    // Get org info
    let orgInfo = null
    const orgId = staffMember?.organization_id ?? otpRecord.organization_id

    if (orgId) {
      const { data: org } = await db
        .from('organizations')
        .select('id, name')
        .eq('id', orgId)
        .eq('status', 'approved')
        .single()
      orgInfo = org
    }

    return apiOk({
      verified: true,
      email,
      staff: staffMember
        ? {
            id: staffMember.id,
            full_name: staffMember.full_name,
            position: staffMember.position,
            campus: staffMember.campus,
            supervisor_email: staffMember.supervisor_email,
            supervisor_name: staffMember.supervisor_name,
          }
        : null,
      org: orgInfo
        ? { id: orgInfo.id, name: orgInfo.name }
        : null,
    })
  } catch {
    return apiError('Server error', 500)
  }
}
