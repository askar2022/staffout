import { NextRequest } from 'next/server'
import crypto from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth, sanitize, apiError, apiOk, AuthError } from '@/lib/auth'
import { sendEmail } from '@/lib/email/resend'
import { calculateTimedPtoHours } from '@/lib/pto'
import { resolveSubmissionPayType } from '@/lib/submission-pay'
import {
  buildInstantEmail,
  buildSupervisorEmail,
  buildHrExcuseEmail,
} from '@/lib/email/templates'
import type { Submission } from '@/lib/types'

const ALLOWED_STATUSES = ['absent', 'late', 'leaving_early', 'appointment', 'personal_day']
const ALLOWED_REASONS = ['sick', 'personal', 'family', 'medical', 'other']
const SCHOOL_START_HOUR = 8
const SCHOOL_END_HOUR = 15
const SCHOOL_END_MINUTE = 30

function getCentralHourMinute(): { hour: number; minute: number } {
  const now = new Date()
  const utcMonth = now.getUTCMonth()
  const isDST = utcMonth >= 2 && utcMonth <= 10
  const offset = isDST ? 5 : 6
  const totalMinutes = now.getUTCHours() * 60 + now.getUTCMinutes() - offset * 60
  const adjusted = ((totalMinutes % 1440) + 1440) % 1440
  return { hour: Math.floor(adjusted / 60), minute: adjusted % 60 }
}

function isDuringSchoolHours(): boolean {
  const { hour, minute } = getCentralHourMinute()
  const afterStart = hour >= SCHOOL_START_HOUR
  const beforeEnd = hour < SCHOOL_END_HOUR || (hour === SCHOOL_END_HOUR && minute < SCHOOL_END_MINUTE)
  return afterStart && beforeEnd
}

// ── POST /api/submissions/hr (admin only — HR logs excuse on behalf of staff) ─

export async function POST(request: NextRequest) {
  try {
    const { orgId } = await requireAuth()
    const db = createAdminClient()
    const body = await request.json()

    const staffId = sanitize(body.staff_id, 36)
    if (!staffId) return apiError('Staff member is required')

    const status = sanitize(body.status, 50)
    if (!ALLOWED_STATUSES.includes(status)) return apiError('Invalid status')

    const date = sanitize(body.date, 10)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return apiError('Invalid date format')

    const reasonCategory = sanitize(body.reason_category, 50) || null
    if (reasonCategory && !ALLOWED_REASONS.includes(reasonCategory)) return apiError('Invalid reason')
    const expectedArrival = sanitize(body.expected_arrival, 10) || null
    const leaveTime = sanitize(body.leave_time, 10) || null

    const hrNote = sanitize(body.hr_note, 500) || null

    // Look up the staff member
    const { data: member } = await db
      .from('staff_members')
      .select('full_name, email, position, campus, supervisor_email, supervisor_name, pto_balance')
      .eq('id', staffId)
      .eq('organization_id', orgId)
      .single()

    if (!member) return apiError('Staff member not found', 404)

    // Look up org
    const { data: org } = await db
      .from('organizations')
      .select('id, name, slug, reply_to_email')
      .eq('id', orgId)
      .single()

    if (!org) return apiError('Organization not found', 404)

    const ptoBalance = member.pto_balance ?? null
    let ptoUsedBefore = 0
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

    // Calculate requested PTO hours. Supervisor approval decides whether PTO is used.
    let ptoHoursRequested: number | null = null
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

      const hoursPerDay = ptoSetting?.hours_per_day
      if (hoursPerDay != null && hoursPerDay > 0) {
        ptoHoursRequested = hoursPerDay
      }
    }
    const payResolution = resolveSubmissionPayType({
      requestedPayType: 'unpaid',
      requestedHours: ptoHoursRequested,
      balance: ptoBalance,
      used: ptoUsedBefore,
    })
    const actionToken = member.supervisor_email ? crypto.randomUUID() : null

    // Insert submission
    const { data: submission, error } = await db
      .from('submissions')
      .insert({
        organization_id: orgId,
        staff_id: staffId,
        staff_name: member.full_name,
        staff_email: member.email ?? null,
        position: member.position ?? null,
        campus: member.campus ?? null,
        supervisor_email: member.supervisor_email ?? null,
        supervisor_name: member.supervisor_name ?? null,
        status,
        date,
        expected_arrival: expectedArrival,
        leave_time: leaveTime,
        reason_category: reasonCategory,
        notes: sanitize(body.notes, 500) || null,
        requested_pay_type: 'unpaid',
        pay_type: payResolution.payType,
        approval_status: 'pending',
        pto_hours_requested: ptoHoursRequested,
        pto_hours_deducted: null,
        action_token: actionToken,
        hr_excused: true,
        hr_note: hrNote,
        instant_sent: false,
        summary_included: false,
      })
      .select()
      .single()

    if (error || !submission) {
      console.error('HR submission insert error:', error)
      return apiError('Failed to save submission', 500)
    }

    const sub = {
      ...(submission as Submission),
      pto_balance_total: ptoBalance,
      pto_used_total: ptoUsedBefore,
      pto_remaining_after: payResolution.remainingAfter,
    } satisfies Submission

    // 1. Accountability email to the staff member
    if (member.email) {
      const { subject, html, text } = buildHrExcuseEmail(org.name, sub)
      await sendEmail({
        to: [member.email],
        subject,
        html,
        text,
        replyTo: org.reply_to_email ?? undefined,
      })
    }

    // 2. Supervisor alert (always instant)
    if (member.supervisor_email) {
      const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'outofshift.com'
      const baseUrl = `https://${org.slug}.${rootDomain}/supervisor-action?token=${encodeURIComponent(actionToken ?? '')}`
      const { subject, html, text } = buildSupervisorEmail(org.name, sub, {
        approveUrl: `${baseUrl}&action=approve`,
        unpaidUrl: `${baseUrl}&action=unpaid`,
        denyUrl: `${baseUrl}&action=deny`,
      })
      await sendEmail({
        to: [member.supervisor_email],
        subject,
        html,
        text,
        replyTo: org.reply_to_email ?? undefined,
      })
      await db.from('email_logs').insert({
        organization_id: orgId,
        type: 'supervisor',
        recipients: [member.supervisor_email],
        subject,
        submission_id: submission.id,
      })
    }

    // 3. All-staff alert — instant if during school hours, otherwise morning summary
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

    return apiOk({
      success: true,
      id: submission.id,
      pay_type: payResolution.payType,
      approval_status: 'pending',
    }, 201)
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.message, 401)
    return apiError('Server error', 500)
  }
}
