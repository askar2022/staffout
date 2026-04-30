import { NextRequest } from 'next/server'
import crypto from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth, sanitize, isValidEmail, normalizeWorkEmail, apiError, apiOk, AuthError } from '@/lib/auth'
import { sendEmail } from '@/lib/email/resend'
import { calculateTimedPtoHours } from '@/lib/pto'
import { getLessonPlanAccessUrl, getSubmissionRateLimitMessage, hasRecentVerifiedOtp } from '@/lib/public-security'
import { resolveSubmissionPayType } from '@/lib/submission-pay'
import {
  buildInstantEmail,
  buildSupervisorEmail,
  buildConfirmationEmail,
} from '@/lib/email/templates'
import type { Submission } from '@/lib/types'

const ALLOWED_STATUSES = ['absent', 'late', 'leaving_early', 'appointment', 'personal_day']
const ALLOWED_REASONS = ['sick', 'personal', 'family', 'medical', 'other']
const ALLOWED_PAY_TYPES = ['pto', 'unpaid']
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
    const orgSlug = request.headers.get('x-org-slug')

    // Validate required fields
    const orgId = sanitize(body.organization_id, 36)
    if (!orgId) return apiError('Missing organization')
    if (!orgSlug) return apiError('Submissions must be sent from a school subdomain.', 403)

    const verifiedEmail = normalizeWorkEmail(sanitize(body.staff_email, 200))
    if (!verifiedEmail || !isValidEmail(verifiedEmail)) {
      return apiError('A verified staff email is required', 400)
    }

    const staffName = sanitize(body.staff_name, 100)
    if (!staffName) return apiError('Staff name is required')

    const status = sanitize(body.status, 50)
    if (!ALLOWED_STATUSES.includes(status)) return apiError('Invalid status')

    const date = sanitize(body.date, 10)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return apiError('Invalid date format')

    const reasonCategory = sanitize(body.reason_category, 50)
    if (reasonCategory && !ALLOWED_REASONS.includes(reasonCategory)) return apiError('Invalid reason')
    const requestedPayType = sanitize(body.requested_pay_type, 20) || 'pto'
    if (!ALLOWED_PAY_TYPES.includes(requestedPayType)) return apiError('Invalid pay type')
    const expectedArrival = sanitize(body.expected_arrival, 10) || null
    const leaveTime = sanitize(body.leave_time, 10) || null

    // Verify the org exists
    const { data: org } = await db
      .from('organizations')
      .select('id, name, reply_to_email')
      .eq('id', orgId)
      .eq('slug', orgSlug)
      .eq('status', 'approved')
      .single()

    if (!org) return apiError('Organization not found', 404)

    const hasVerifiedOtp = await hasRecentVerifiedOtp(db, verifiedEmail, orgId)
    if (!hasVerifiedOtp) {
      return apiError('Please verify your email again before submitting.', 403)
    }

    const rateLimitMessage = await getSubmissionRateLimitMessage(db, verifiedEmail, orgId)
    if (rateLimitMessage) {
      return apiError(rateLimitMessage, 429)
    }

    // If a staff ID was sent, look up their supervisor server-side
    // The client never sends supervisor emails — we retrieve them from the DB
    let supervisorEmail: string | null = null
    let supervisorName: string | null = null
    let staffEmail: string | null = null
    let position: string | null = null
    let campus: string | null = null
    let ptoBalance: number | null = null
    let ptoUsedBefore = 0

    const staffId = sanitize(body.staff_id, 36)
    if (staffId) {
      const { data: member } = await db
        .from('staff_members')
        .select('email, position, campus, supervisor_email, supervisor_name, pto_balance')
        .eq('id', staffId)
        .eq('organization_id', orgId)
        .ilike('email', verifiedEmail)
        .single()

      if (member) {
        staffEmail = member.email ?? null
        position = member.position ?? null
        campus = member.campus ?? null
        supervisorEmail = member.supervisor_email ?? null
        supervisorName = member.supervisor_name ?? null
        ptoBalance = member.pto_balance ?? null

        const { data: priorPtoRows } = await db
          .from('submissions')
          .select('pto_hours_deducted')
          .eq('staff_id', staffId)
          .eq('organization_id', orgId)
          .not('pto_hours_deducted', 'is', null)

        ptoUsedBefore = (priorPtoRows ?? []).reduce(
          (sum, row) => sum + (row.pto_hours_deducted ?? 0),
          0
        )
      } else {
        return apiError('The verified email does not match that staff record.', 403)
      }
    }

    // Multi-day: validate end_date
    const endDate = sanitize(body.end_date, 10) || null
    if (endDate && !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) return apiError('Invalid end_date format')

    const submitterEmail = staffEmail ?? verifiedEmail

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

    // Calculate requested PTO hours. Actual deduction happens only after supervisor action.
    let ptoHoursRequested: number | null = null
    if (staffId) {
      if (status === 'late') {
        if (!expectedArrival) return apiError('Expected arrival time is required')

        const timedHours = calculateTimedPtoHours({ status: 'late', expectedArrival })
        if (timedHours === null) return apiError('Invalid expected arrival time')
        ptoHoursRequested = timedHours
      } else if (status === 'leaving_early') {
        if (!leaveTime) return apiError('Leave time is required')

        const timedHours = calculateTimedPtoHours({ status: 'leaving_early', leaveTime })
        if (timedHours === null) return apiError('Invalid leave time')
        ptoHoursRequested = timedHours
      } else {
        const { data: ptoSetting } = await db
          .from('pto_deduction_settings')
          .select('hours_per_day')
          .eq('organization_id', orgId)
          .eq('status', status)
          .single()

        const hoursPerDay = ptoSetting?.hours_per_day ?? 0
        if (hoursPerDay > 0) {
          ptoHoursRequested = hoursPerDay * numDays
        }
      }
    }

    const payResolution = resolveSubmissionPayType({
      requestedPayType: requestedPayType as 'pto' | 'unpaid',
      requestedHours: ptoHoursRequested,
      balance: ptoBalance,
      used: ptoUsedBefore,
    })
    const actionToken = supervisorEmail ? crypto.randomUUID() : null

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
        staff_email: submitterEmail,
        position,
        campus,
        supervisor_email: supervisorEmail,
        supervisor_name: supervisorName,
        status,
        date,
        end_date: endDate,
        expected_arrival: expectedArrival,
        leave_time: leaveTime,
        reason_category: reasonCategory || null,
        notes: sanitize(body.notes, 500) || null,
        requested_pay_type: requestedPayType,
        pay_type: payResolution.payType,
        approval_status: 'pending',
        pto_hours_requested: ptoHoursRequested,
        pto_hours_deducted: null,
        action_token: actionToken,
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

    const sub = {
      ...(submission as Submission),
      pto_balance_total: ptoBalance,
      pto_used_total: ptoUsedBefore,
      pto_remaining_after: payResolution.remainingAfter,
    } satisfies Submission

    const lessonPlanAccessUrl = await getLessonPlanAccessUrl(db, sub.lesson_plan_url)
    const emailSubmission = lessonPlanAccessUrl
      ? { ...sub, lesson_plan_url: lessonPlanAccessUrl }
      : sub

    // Always send confirmation back to the staff member who submitted
    if (submitterEmail) {
      const { subject, html, text } = buildConfirmationEmail(org.name, emailSubmission)
      await sendEmail({
        to: [submitterEmail],
        subject,
        html,
        text,
        replyTo: org.reply_to_email ?? undefined,
      })
    }

    // Supervisor always gets an instant alert — coverage cannot wait
    if (supervisorEmail) {
      const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'outofshift.com'
      const baseUrl = `https://${orgSlug}.${rootDomain}/supervisor-action?token=${encodeURIComponent(actionToken ?? '')}`
      const { subject, html, text } = buildSupervisorEmail(org.name, emailSubmission, {
        approveUrl: `${baseUrl}&action=approve`,
        unpaidUrl: `${baseUrl}&action=unpaid`,
        denyUrl: `${baseUrl}&action=deny`,
      })
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
        const { subject, html, text } = buildInstantEmail(org.name, emailSubmission)
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
        pto_hours_deducted: null,
        pay_type: payResolution.payType,
        approval_status: 'pending',
        auto_switched_to_unpaid: payResolution.autoSwitchedToUnpaid,
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
