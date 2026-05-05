import Link from 'next/link'
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/admin'
import { applySubmissionDecision } from '@/lib/submission-decision'
import { APPROVAL_STATUS_LABELS, PAY_TYPE_LABELS, type Submission } from '@/lib/types'

type Action = 'approve' | 'unpaid' | 'deny'

export default async function SupervisorActionPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; action?: string }>
}) {
  const params = await searchParams
  const token = params.token ?? ''
  const action = params.action as Action | undefined

  if (!token || !action || !['approve', 'unpaid', 'deny'].includes(action)) {
    return <ResultCard tone="error" title="Invalid supervisor link." />
  }

  const db = createAdminClient()
  const { data: submission } = await db
    .from('submissions')
    .select('*, organizations(name, reply_to_email)')
    .eq('action_token', token)
    .single()

  if (!submission) {
    return <ResultCard tone="error" title="This supervisor link is no longer valid." />
  }

  const sub = submission as Submission & {
    organizations?: {
      name?: string
      reply_to_email?: string | null
    } | null
  }
  let updatedApprovalStatus = sub.approval_status
  let updatedPayType = sub.pay_type
  let message = 'No changes were needed.'
  const result = await applySubmissionDecision({
    db,
    submission: sub,
    actorName: sub.supervisor_email ?? sub.supervisor_name ?? 'Supervisor',
    actorRole: 'supervisor',
    action,
    orgName: sub.organizations?.name ?? 'StaffOut',
    replyTo: sub.organizations?.reply_to_email ?? undefined,
  })

  updatedApprovalStatus = result.updatedSubmission.approval_status
  updatedPayType = result.updatedSubmission.pay_type
  message = result.message

  if (!result.changed) {
    message = `${message} The employee was already notified previously.`
  }

  return (
    <ResultCard
      tone={updatedApprovalStatus === 'denied' ? 'error' : 'success'}
      title={`${sub.staff_name} updated`}
      body={`${message} Current status: ${APPROVAL_STATUS_LABELS[updatedApprovalStatus]}${updatedPayType ? ` · ${PAY_TYPE_LABELS[updatedPayType]}` : ''}.`}
      orgName={sub.organizations?.name ?? 'StaffOut'}
    />
  )
}

function ResultCard({
  tone,
  title,
  body,
  orgName,
}: {
  tone: 'success' | 'error'
  title: string
  body?: string
  orgName?: string
}) {
  const icon = tone === 'success'
    ? <CheckCircle2 className="w-7 h-7 text-green-600" />
    : <XCircle className="w-7 h-7 text-red-600" />

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-sm p-8">
        <div className="flex items-center gap-3 mb-4">
          {icon}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{orgName}</p>
            <h1 className="text-xl font-bold text-slate-900">{title}</h1>
          </div>
        </div>
        <div className={`rounded-xl px-4 py-3 text-sm ${tone === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {body ?? 'Unable to complete this action.'}
        </div>
        <p className="mt-4 text-sm text-slate-500 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          HR can review this action in the attendance reports table and calendar.
        </p>
        <Link href="/" className="inline-block mt-5 text-sm text-indigo-600 hover:underline">
          Return to StaffOut
        </Link>
      </div>
    </div>
  )
}
