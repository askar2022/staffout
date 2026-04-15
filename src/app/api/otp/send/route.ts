import { randomInt } from 'node:crypto'
import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sanitize, isValidEmail, normalizeWorkEmail, apiError, apiOk } from '@/lib/auth'
import { sendEmail } from '@/lib/email/resend'
import { getOtpSendRateLimitMessage } from '@/lib/public-security'

function generateCode(): string {
  return randomInt(100000, 1000000).toString()
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const email = normalizeWorkEmail(sanitize(body.email, 200))

    if (!email || !isValidEmail(email)) {
      return apiError('Valid work email is required')
    }

    const db = createAdminClient()

    // Resolve org from subdomain slug (sent by client from window.location)
    // Falls back to x-org-slug header injected by middleware for server-side calls
    const orgSlug: string | null =
      sanitize(body.org_slug ?? '', 63) || request.headers.get('x-org-slug')

    let orgId: string | null = null
    let orgName: string | null = null

    if (orgSlug) {
      const { data: org } = await db
        .from('organizations')
        .select('id, name, status')
        .eq('slug', orgSlug)
        .single()

      if (!org || org.status !== 'approved') {
        return apiError('This school is not active. Please contact your administrator.', 403)
      }

      orgId = org.id
      orgName = org.name
    }

    // Find the staff member — scoped to the org if we have one
    // Use ilike (case-insensitive) + limit(1): .single() fails when duplicate rows exist for the same email;
    // mixed-case storage (A@x.com vs a@x.com) also broke .eq() lookups.
    let staffQuery = db
      .from('staff_members')
      .select('id, full_name, organization_id, position, campus')
      .ilike('email', email)
      .eq('is_active', true)

    if (orgId) {
      staffQuery = staffQuery.eq('organization_id', orgId)
    }

    const { data: staffRows } = await staffQuery.limit(1)
    const staffMember = staffRows?.[0] ?? null

    // For real schools (non-demo), block if email is not in the staff directory
    if (orgId && orgSlug !== 'demo' && !staffMember) {
      return apiError('This email is not in the staff directory. Contact your administrator to be added.', 403)
    }

    // No org resolved yet — try to find it from the staff member's org
    if (!orgId && staffMember) {
      orgId = staffMember.organization_id
    }

    const rateLimitMessage = await getOtpSendRateLimitMessage(db, email, orgId)
    if (rateLimitMessage) {
      return apiError(rateLimitMessage, 429)
    }

    // Delete any existing unused codes for this email + org
    await db
      .from('otp_codes')
      .delete()
      .eq('email', email)
      .eq('used', false)

    const code = generateCode()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    await db.from('otp_codes').insert({
      email,
      organization_id: orgId,
      code,
      expires_at: expiresAt.toISOString(),
      used: false,
    })

    const html = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
      <body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
        <div style="max-width:480px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
          <div style="background:#4f46e5;padding:28px 32px;">
            <div style="font-size:13px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:#c7d2fe;margin-bottom:4px;">${orgName ?? 'StaffOut'}</div>
            <div style="font-size:20px;font-weight:700;color:#ffffff;">Your sign-in code</div>
          </div>
          <div style="padding:32px;">
            <p style="margin:0 0 24px;color:#374151;font-size:15px;">
              Hi${staffMember?.full_name ? ` ${staffMember.full_name}` : ''},<br><br>
              Use this code to verify your identity and submit your absence report.
            </p>
            <div style="background:#f1f5f9;border-radius:12px;padding:20px;text-align:center;margin-bottom:24px;">
              <div style="font-size:40px;font-weight:800;letter-spacing:0.15em;color:#1e293b;font-family:monospace;">${code}</div>
              <div style="font-size:13px;color:#64748b;margin-top:8px;">Expires in 10 minutes</div>
            </div>
            <p style="margin:0;color:#94a3b8;font-size:13px;">
              If you did not request this code, you can safely ignore this email.
            </p>
          </div>
        </div>
      </body>
      </html>`

    const result = await sendEmail({
      to: [email],
      subject: `${code} — Your ${orgName ?? 'StaffOut'} verification code`,
      html,
      text: `Your ${orgName ?? 'StaffOut'} verification code is: ${code}\n\nThis code expires in 10 minutes.\n\nIf you did not request this, ignore this email.`,
    })

    if (!result.success) {
      return apiError('Failed to send code. Check your email address.', 500)
    }

    return apiOk({
      success: true,
      is_known_staff: !!staffMember,
    })
  } catch {
    return apiError('Server error', 500)
  }
}
