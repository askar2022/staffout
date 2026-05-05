import { NextRequest } from 'next/server'
import { requireAuth, sanitize, apiError, apiOk, AuthError } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { applySubmissionDecision, type SubmissionDecisionAction } from '@/lib/submission-decision'
import type { Submission } from '@/lib/types'

const ALLOWED_ACTIONS: SubmissionDecisionAction[] = ['approve', 'unpaid', 'deny']

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId, userId } = await requireAuth()
    const params = await context.params
    const submissionId = sanitize(params.id, 36)
    const body = await request.json()
    const action = sanitize(body.action, 20) as SubmissionDecisionAction
    const note = sanitize(body.note, 500) || null

    if (!submissionId) return apiError('Missing submission id')
    if (!ALLOWED_ACTIONS.includes(action)) return apiError('Invalid decision action')

    const db = createAdminClient()

    const [{ data: profile }, { data: submission }, { data: org }] = await Promise.all([
      db
        .from('profiles')
        .select('full_name')
        .eq('id', userId)
        .single(),
      db
        .from('submissions')
        .select('*')
        .eq('id', submissionId)
        .eq('organization_id', orgId)
        .single(),
      db
        .from('organizations')
        .select('name, reply_to_email')
        .eq('id', orgId)
        .single(),
    ])

    if (!submission) return apiError('Submission not found', 404)
    if (!org) return apiError('Organization not found', 404)

    const result = await applySubmissionDecision({
      db,
      submission: submission as Submission,
      actorName: profile?.full_name ?? 'HR Admin',
      actorRole: 'hr_admin',
      action,
      note,
      orgName: org.name ?? 'StaffOut',
      replyTo: org.reply_to_email ?? undefined,
    })

    return apiOk({
      success: true,
      changed: result.changed,
      message: result.message,
      submission: {
        id: result.updatedSubmission.id,
        approval_status: result.updatedSubmission.approval_status,
        pay_type: result.updatedSubmission.pay_type,
        pto_hours_deducted: result.updatedSubmission.pto_hours_deducted,
        supervisor_action_at: result.updatedSubmission.supervisor_action_at,
        supervisor_action_by: result.updatedSubmission.supervisor_action_by,
        decision_note: result.updatedSubmission.decision_note,
        decision_last_updated_by_role: result.updatedSubmission.decision_last_updated_by_role,
      },
    })
  } catch (error) {
    if (error instanceof AuthError) return apiError(error.message, 401)
    console.error('HR decision override failed', error)
    return apiError('Server error', 500)
  }
}
