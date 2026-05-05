import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email/resend'
import { buildSupervisorDecisionEmail } from '@/lib/email/templates'
import { resolveSubmissionPayType } from '@/lib/submission-pay'
import type { Submission, SubmissionDecisionActorRole } from '@/lib/types'

type AdminClient = ReturnType<typeof createAdminClient>

export type SubmissionDecisionAction = 'approve' | 'unpaid' | 'deny'

interface ApplySubmissionDecisionInput {
  db: AdminClient
  submission: Submission
  actorName: string
  actorRole: SubmissionDecisionActorRole
  action: SubmissionDecisionAction
  note?: string | null
  orgName: string
  replyTo?: string | null
}

export async function applySubmissionDecision(input: ApplySubmissionDecisionInput) {
  const { db, submission, actorName, actorRole, action, note, orgName, replyTo } = input

  let ptoBalance: number | null = null
  let ptoUsedBefore = 0

  if (submission.staff_id) {
    const [{ data: member }, { data: priorRows }] = await Promise.all([
      db
        .from('staff_members')
        .select('pto_balance')
        .eq('id', submission.staff_id)
        .eq('organization_id', submission.organization_id)
        .single(),
      db
        .from('submissions')
        .select('pto_hours_deducted')
        .eq('staff_id', submission.staff_id)
        .eq('organization_id', submission.organization_id)
        .neq('id', submission.id)
        .not('pto_hours_deducted', 'is', null),
    ])

    ptoBalance = member?.pto_balance ?? null
    ptoUsedBefore = (priorRows ?? []).reduce((sum, row) => sum + (row.pto_hours_deducted ?? 0), 0)
  }

  let nextApprovalStatus = submission.approval_status
  let nextPayType = submission.pay_type
  let nextDeductedHours = submission.pto_hours_deducted
  let message = 'No changes were needed.'

  if (action === 'approve') {
    const resolution = resolveSubmissionPayType({
      requestedPayType: 'pto',
      requestedHours: submission.pto_hours_requested ?? null,
      balance: ptoBalance,
      used: ptoUsedBefore,
    })

    nextApprovalStatus = 'approved'
    nextPayType = resolution.payType
    nextDeductedHours = resolution.payType === 'pto' ? (resolution.approvedHours ?? null) : null
    message = resolution.autoSwitchedToUnpaid
      ? 'PTO was not available, so this submission was approved as unpaid.'
      : 'This submission was approved for PTO.'
  } else if (action === 'unpaid') {
    nextApprovalStatus = 'approved'
    nextPayType = 'unpaid'
    nextDeductedHours = null
    message = 'This submission was approved as unpaid.'
  } else {
    nextApprovalStatus = 'denied'
    nextPayType = submission.pay_type
    nextDeductedHours = null
    message = 'This submission was denied.'
  }

  const changed =
    submission.approval_status !== nextApprovalStatus ||
    submission.pay_type !== nextPayType ||
    (submission.pto_hours_deducted ?? null) !== (nextDeductedHours ?? null) ||
    (submission.decision_note ?? null) !== (note ?? null) ||
    (submission.decision_last_updated_by_role ?? null) !== actorRole

  const updatedSubmission = {
    ...submission,
    approval_status: nextApprovalStatus,
    pay_type: nextPayType,
    pto_hours_deducted: nextDeductedHours,
    supervisor_action_at: new Date().toISOString(),
    supervisor_action_by: actorName,
    decision_note: note ?? null,
    decision_last_updated_by_role: actorRole,
    pto_balance_total: ptoBalance,
    pto_used_total: ptoUsedBefore + (nextDeductedHours ?? 0),
    pto_remaining_after:
      ptoBalance !== null
        ? ptoBalance - ptoUsedBefore - (nextDeductedHours ?? 0)
        : null,
  } satisfies Submission

  if (!changed) {
    return { changed: false, updatedSubmission, message }
  }

  await db
    .from('submissions')
    .update({
      approval_status: updatedSubmission.approval_status,
      pay_type: updatedSubmission.pay_type,
      pto_hours_deducted: updatedSubmission.pto_hours_deducted,
      supervisor_action_at: updatedSubmission.supervisor_action_at,
      supervisor_action_by: updatedSubmission.supervisor_action_by,
      decision_note: updatedSubmission.decision_note,
      decision_last_updated_by_role: updatedSubmission.decision_last_updated_by_role,
    })
    .eq('id', submission.id)

  await db.from('submission_decision_events').insert({
    submission_id: submission.id,
    organization_id: submission.organization_id,
    actor_name: actorName,
    actor_role: actorRole,
    action:
      action === 'approve'
        ? nextPayType === 'pto'
          ? 'approve_pto'
          : 'approve_unpaid'
        : action === 'unpaid'
        ? 'approve_unpaid'
        : 'deny',
    approval_status: updatedSubmission.approval_status,
    pay_type: updatedSubmission.pay_type,
    pto_hours_deducted: updatedSubmission.pto_hours_deducted,
    note: updatedSubmission.decision_note,
  })

  if (updatedSubmission.staff_email) {
    const { subject, html, text } = buildSupervisorDecisionEmail(orgName, updatedSubmission)
    await sendEmail({
      to: [updatedSubmission.staff_email],
      subject,
      html,
      text,
      replyTo: replyTo ?? undefined,
    })
  }

  return { changed: true, updatedSubmission, message }
}
