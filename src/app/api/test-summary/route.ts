import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth, apiError, apiOk } from '@/lib/auth'
import { sendEmail } from '@/lib/email/resend'
import { buildSummaryEmail } from '@/lib/email/templates'
import type { Submission } from '@/lib/types'
import { filterSubmissionsForCampusScope, normalizeCampusScope } from '@/lib/notification-scope'

export async function POST() {
  try {
    const { orgId } = await requireAuth()
    const db = createAdminClient()

    const today = new Date().toISOString().split('T')[0]

    // Get org info
    const { data: org } = await db
      .from('organizations')
      .select('*')
      .eq('id', orgId)
      .single()

    if (!org) return apiError('Organization not found', 404)

    // Get today's submissions (all of them — don't filter summary_included for test)
    const { data: rawSubs } = await db
      .from('submissions')
      .select('*')
      .eq('organization_id', orgId)
      .eq('date', today)

    const submissions = (rawSubs ?? []) as Submission[]

    // Get summary recipients
    const { data: rawRecipients } = await db
      .from('notification_recipients')
      .select('email, campus_scope')
      .eq('organization_id', orgId)
      .eq('receives_summary', true)

    const recipients = (rawRecipients ?? []) as { email: string; campus_scope: string | null }[]

    if (!recipients.length) {
      return apiError('No summary recipients configured. Go to Settings → Notification Recipients and add someone with Summary enabled.', 400)
    }

    let emailsSent = 0

    const scopes = [...new Set(recipients.map((r) => normalizeCampusScope(r.campus_scope) ?? '__ALL__'))]

    for (const scopeKey of scopes) {
      const campusScope = scopeKey === '__ALL__' ? null : scopeKey
      const scopedSubmissions = filterSubmissionsForCampusScope(submissions, campusScope)
      const summaryEmails = recipients
        .filter((r) => normalizeCampusScope(r.campus_scope) === campusScope)
        .map((r) => r.email)

      if (!summaryEmails.length) continue

      const { subject, html, text } = buildSummaryEmail(org.name, scopedSubmissions, new Date())

      const scopeSuffix = campusScope ? ` [${campusScope}]` : ''
      const testSubject = `[TEST]${scopeSuffix} ${subject}`

      const result = await sendEmail({
        to: summaryEmails,
        subject: testSubject,
        html,
        text,
        replyTo: org.reply_to_email ?? undefined,
      })

      if (!result.success) {
        return apiError('Failed to send test email. Check your Resend configuration.', 500)
      }

      emailsSent += summaryEmails.length
    }

    return apiOk({
      success: true,
      recipientEmailsSent: emailsSent,
      submissionsIncluded: submissions.length,
    })
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return apiError('Unauthorized', 401)
    }
    return apiError('Server error', 500)
  }
}
