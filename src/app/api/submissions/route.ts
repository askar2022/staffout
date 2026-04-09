import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth, sanitize, isValidEmail, apiError, apiOk, AuthError } from '@/lib/auth'
import { sendEmail } from '@/lib/email/resend'
import { buildInstantEmail, buildSupervisorEmail, buildConfirmationEmail } from '@/lib/email/templates'
import type { Submission, NotificationRecipient } from '@/lib/types'

const ALLOWED_STATUSES = ['absent', 'late', 'leaving_early', 'appointment', 'personal_day']
const ALLOWED_REASONS = ['sick', 'personal', 'family', 'medical', 'other']
const SCHOOL_START_HOUR = 8      // 8:00 AM CT
const SCHOOL_END_HOUR  = 15      // 3:00 PM CT
const SCHOOL_END_MINUTE = 30     // 3:30 PM CT

function getCentralHourMinute(): { hour: number; minute: number } {
  const now = new Date()
  // CDT = UTC-5 (approx Mar–Nov), CST = UTC-6 (Nov–Mar)
  const utcMonth = now.getUTCMonth() // 0 = Jan
  const isDST = utcMonth >= 2 && utcMonth <= 10
  const offset = isDST ? 5 : 6
  const totalMinutes = now.getUTCHours() * 60 + now.getUTCMinutes() - offset * 60
  const adjusted = ((totalMinutes % 1440) + 1440) % 1440
  return { hour: Math.floor(adjusted / 60), minute: adjusted % 60 }
}

function isDuringSchoolHours(): boolean {
  const { hour, minute } = getCentralHourMinute()
  const afterStart = hour >= SCHOOL_START_HOUR
  const beforeEnd  = hour < SCHOOL_END_HOUR || (hour === SCHOOL_END_HOUR && minute < SCHOOL_END_MINUTE)
  return afterStart && beforeEnd
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

    // Multi-day: validate end_date
    const endDate = sanitize(body.end_date, 10) || null
    if (endDate && !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) return apiError('Invalid end_date format')

    // Count weekdays between date and end_date (inclusive)
    function countWeekdays(start: string, end: string | null): number {
      if (!end || end <= start) return 1
      let count = 0
      const cur = new Date(start + 'T12:00:00Z')
      const last = new Date(end + 'T12:00:00Z')
      while (cur <= last) {
        const day = cur.getUTCDay()
        if (day !== 0 && day !== 6) count++
        cur.setUTCDate(cur.getUTCDate() + 1)
      }
      return Math.max(1, count)
    }

    const numDays = countWeekdays(date, endDate)

    // Auto-calculate PTO hours to deduct
    let ptoHoursDeducted: number | null = null
    if (staffId) {
      const { data: ptoSetting } = await db
        .from('pto_deduction_settings')
        .select('hours_per_day')
        .eq('organization_id', orgId)
        .eq('status', status)
        .single()

      const hoursPerDay = ptoSetting?.hours_per_day ?? 0
      if (hoursPerDay > 0) {
        ptoHoursDeducted = hoursPerDay * numDays
      }
    }

    // Lesson plan URL (already uploaded by client)
    const lessonPlanUrl = sanitize(body.lesson_plan_url, 500) || null

    // Override campus if manually set (for unlisted staff)
    if (!campus) campus = sanitize(body.campus, 100) || null

    const { data: submission, error } = await db
      .from('submissions')
      .insert({
        organization_id: orgId,
        staff_id: staffId || null,
        staff_name: staffName,
        staff_email: staffEmail,
        position,
        campus,
        supervisor_email: supervisorEmail,
        supervisor_name: supervisorName,
        status,
        date,
        end_date: endDate,
        expected_arrival: sanitize(body.expected_arrival, 10) || null,
        leave_time: sanitize(body.leave_time, 10) || null,
        reason_category: reasonCategory || null,
        notes: sanitize(body.notes, 500) || null,
        pto_hours_deducted: ptoHoursDeducted,
        lesson_plan_url: lessonPlanUrl,
        instant_sent: false,
        summary_included: false,
      })
      .select()
      .single()

    if (error || !submission) {
      console.error('Submission insert error:', error)
      return apiError('Failed to save submission', 500)
    }

    const sub = submission as Submission

    // Always send confirmation back to the staff member who submitted
    if (staffEmail) {
      const { subject, html, text } = buildConfirmationEmail(org.name, sub)
      await sendEmail({
        to: [staffEmail],
        subject,
        html,
        text,
        replyTo: org.reply_to_email ?? undefined,
      })
    }

    // Supervisor always gets an instant alert — coverage cannot wait
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

    // All-staff instant alert only during school hours (8 AM – 3:30 PM CT)
    if (isDuringSchoolHours()) {
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

      await db.from('submissions').update({ instant_sent: true }).eq('id', submission.id)
    }

    return apiOk(
      {
        success: true,
        id: submission.id,
        pto_hours_deducted: ptoHoursDeducted,
      },
      201
    )
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
