import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sanitize, isValidEmail, normalizeWorkEmail, apiError, apiOk } from '@/lib/auth'
import { getSubmitCampusOptions } from '@/lib/org-campuses'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const email = normalizeWorkEmail(sanitize(body.email, 200))
    const code = sanitize(body.code, 6)
    const campusRaw = sanitize(body.campus ?? '', 200)
    const campus = campusRaw.trim() || null

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

    // The org is the one stored in the OTP record (set when the code was created,
    // scoped to the subdomain the user submitted from)
    const orgId = otpRecord.organization_id

    // Look up all active staff members with this email, scoped to this org
    let staffQuery = db
      .from('staff_members')
      .select('id, full_name, position, campus, supervisor_email, supervisor_name, organization_id')
      .ilike('email', email)
      .eq('is_active', true)

    if (orgId) {
      staffQuery = staffQuery.eq('organization_id', orgId)
    }

    const { data: staffMembersRaw } = await staffQuery

    // Get org info
    let orgInfo = null
    let orgSlug: string | null = null
    if (orgId) {
      const { data: org } = await db
        .from('organizations')
        .select('id, name, slug')
        .eq('id', orgId)
        .eq('status', 'approved')
        .single()
      orgInfo = org
      orgSlug = org?.slug ?? null
    }

    let staffMembers = staffMembersRaw ?? []

    if (orgId && orgSlug !== 'demo') {
      const orgCampuses = await getSubmitCampusOptions(db, orgId, orgSlug)
      if (orgCampuses.length > 1 && !campus) {
        return apiError('Please select the school or campus where you work.', 400)
      }
      if (campus) {
        staffMembers = staffMembers.filter((s) => s.campus === campus)
      }
    }

    if (!staffMembers.length) {
      if (orgId) {
        return apiError(
          'No matching staff record for this email at the selected campus. Request a new code and verify your school selection.',
          401,
        )
      }
    }

    const staffList = staffMembers.map((s) => ({
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
      staff: staffList.length === 1 ? staffList[0] : null,
      staffList,
      org: orgInfo ? { id: orgInfo.id, name: orgInfo.name } : null,
    })
  } catch {
    return apiError('Server error', 500)
  }
}
