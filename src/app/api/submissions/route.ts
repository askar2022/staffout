import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth, sanitize, isValidEmail, apiError, apiOk, AuthError } from '@/lib/auth'
import { sendEmail } from '@/lib/email/resend'
import { buildInstantEmail, buildSupervisorEmail } from '@/lib/email/templates'
import type { Submission, NotificationRecipient } from '@/lib/types'

const ALLOWED_STATUSES = ['absent', 'late', 'leaving_early', 'appointment', 'personal_day']
const ALLOWED_REASONS = ['sick', 'personal', 'family', 'medical', 'other']
const SUMMARY_HOUR = 8

function isAfterSummaryTime(): boolean {
  const centralHour = parseInt(
    new Date().toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: 'America/Chicago' })
  )
  return centralHour >= SUMMARY_HOUR
}

// ── POST /api/submissions (public — staff submit without logging in) ──────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const db = createAdminClient()

    // Validate required fields
    const orgId = sanitize(body.organization_id, 36)
    if (!orgId) return apiError('Missing organization')

    const staffName = sanitize(body.staff_name, 100)
    if (!staffName) return apiError('Staff name is required')

    const status = sanitize(body.status, 50)
    if (!ALLOWED_STATUSES.includes(status)) return apiError('Invalid status')

    const date = sanitize(body.date, 10)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return apiError('Invalid date format')

    const reasonCategory = sanitize(body.reason_category, 50)
    if (reasonCategory && !ALLOWED_REASONS.includes(reasonCategory)) return apiError('Invalid reason')

    // Verify the org exists
    const { data: org } = await db
      .from('organizations')
      .select('id, name, reply_to_email')
      .eq('id', orgId)
      .single()

    if (!org) return apiError('Organization not found', 404)

    // If a staff ID was sent, look up their supervisor server-side
    // The client never sends supervisor emails — we retrieve them from the DB
    let supervisorEmail: string | null = null
    let supervisorName: string | null = null
    let staffEmail: string | null = null
    let position: string | null = null
    let campus: string | null = null

    const staffId = sanitize(body.staff_id, 36)
    if (staffId) {
      const { data: member } = await db
        .from('staff_members')
        .select('email, position, campus, supervisor_email, supervisor_name')
        .eq('id', staffId)
        .eq('organization_id', orgId)
        .single()

      if (member) {
        staffEmail = member.email ?? null
        position = member.position ?? null
        campus = member.campus ?? null
        supervisorEmail = member.supervisor_email ?? null
        supervisorName = member.supervisor_name ?? null
      }
    }

    // Override campus if manually set (for unlisted staff)
    if (!campus) campus = sanitize(body.campus, 100) || null

    const { data: submission, error } = await db
      .from('submissions')
      .insert({
        organization_id: orgId,
        staff_name: staffName,
        staff_email: staffEmail,
        position,
        campus,
        supervisor_email: supervisorEmail,
        supervisor_name: supervisorName,
        status,
        date,
        expected_arrival: sanitize(body.expected_arrival, 10) || null,
        leave_time: sanitize(body.leave_time, 10) || null,
        reason_category: reasonCategory || null,
        notes: sanitize(body.notes, 500) || null,
        instant_sent: false,
        summary_included: false,
      })
      .select()
      .single()

    if (error || !submission) {
      console.error('Submission insert error:', error)
      return apiError('Failed to save submission', 500)
    }

    // If after 8 AM → fire instant + supervisor emails
    if (isAfterSummaryTime()) {
      const sub = submission as Submission

      const { data: rawRecipients } = await db
        .from('notification_recipients')
        .select('email')
        .eq('organization_id', orgId)
        .eq('receives_instant', true)

      const instantEmails = (rawRecipients ?? []).map((r: { email: string }) => r.email)

      if (instantEmails.length > 0) {
        const { subject, html, text } = buildInstantEmail(org.name, sub)
        const result = await sendEmail({
          to: instantEmails,
          subject,
          html,
          text,
          replyTo: org.reply_to_email ?? undefined,
        })

        await db.from('email_logs').insert({
          organization_id: orgId,
          type: 'instant',
          recipients: instantEmails,
          subject,
          submission_id: submission.id,
          success: result.success,
          error_message: result.success ? null : result.error,
        })
      }

      if (supervisorEmail) {
        const { subject, html, text } = buildSupervisorEmail(org.name, sub)
        await sendEmail({
          to: [supervisorEmail],
          subject,
          html,
          text,
          replyTo: org.reply_to_email ?? undefined,
        })
        await db.from('email_logs').insert({
          organization_id: orgId,
          type: 'supervisor',
          recipients: [supervisorEmail],
          subject,
          submission_id: submission.id,
        })
      }

      await db.from('submissions').update({ instant_sent: true }).eq('id', submission.id)
    }

    return apiOk({ success: true, id: submission.id }, 201)
  } catch {
    return apiError('Server error', 500)
  }
}

// ── GET /api/submissions (admin only) ────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { orgId } = await requireAuth()
    const db = createAdminClient()

    const url = new URL(request.url)
    const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0]

    // Validate date param
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return apiError('Invalid date format')

    const { data, error } = await db
      .from('submissions')
      .select('*')
      .eq('organization_id', orgId)
      .eq('date', date)
      .order('submitted_at', { ascending: false })

    if (error) return apiError('Failed to load submissions', 500)
    return apiOk({ submissions: data ?? [] })
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.message, 401)
    return apiError('Server error', 500)
  }
}
