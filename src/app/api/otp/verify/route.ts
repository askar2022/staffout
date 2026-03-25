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

    // Look up all staff members with this email (may be multiple for demo/multi-role)
    const { data: staffMembers } = await db
      .from('staff_members')
      .select('id, full_name, position, campus, supervisor_email, supervisor_name, organization_id')
      .eq('email', email)
      .eq('is_active', true)

    // Get org info
    const orgId = (staffMembers && staffMembers.length > 0)
      ? staffMembers[0].organization_id
      : otpRecord.organization_id

    let orgInfo = null
    if (orgId) {
      const { data: org } = await db
        .from('organizations')
        .select('id, name')
        .eq('id', orgId)
        .eq('status', 'approved')
        .single()
      orgInfo = org
    }

    const staffList = (staffMembers ?? []).map((s) => ({
      id: s.id,
      full_name: s.full_name,
      position: s.position,
      campus: s.campus,
      supervisor_email: s.supervisor_email,
      supervisor_name: s.supervisor_name,
    }))

    return apiOk({
      verified: true,
      email,
      // single staff for backward compat (first match)
      staff: staffList.length === 1 ? staffList[0] : null,
      // full list so the form can show a picker when there are multiple
      staffList,
      org: orgInfo ? { id: orgInfo.id, name: orgInfo.name } : null,
    })
  } catch {
    return apiError('Server error', 500)
  }
}
