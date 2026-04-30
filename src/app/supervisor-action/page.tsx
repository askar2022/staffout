import Link from 'next/link'
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveSubmissionPayType } from '@/lib/submission-pay'
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
    .select('*, organizations(name)')
    .eq('action_token', token)
    .single()

  if (!submission) {
    return <ResultCard tone="error" title="This supervisor link is no longer valid." />
  }

  const sub = submission as Submission & { organizations?: { name?: string } | null }
  let updatedApprovalStatus = sub.approval_status
  let updatedPayType = sub.pay_type
  let message = 'No changes were needed.'

  const staffId = sub.staff_id
  const orgId = sub.organization_id

  let ptoBalance: number | null = null
  let ptoUsedBefore = 0

  if (staffId) {
    const [{ data: member }, { data: priorRows }] = await Promise.all([
      db
        .from('staff_members')
        .select('pto_balance')
        .eq('id', staffId)
        .eq('organization_id', orgId)
        .single(),
      db
        .from('submissions')
        .select('pto_hours_deducted')
        .eq('staff_id', staffId)
        .eq('organization_id', orgId)
        .neq('id', sub.id)
        .not('pto_hours_deducted', 'is', null),
    ])

    ptoBalance = member?.pto_balance ?? null
    ptoUsedBefore = (priorRows ?? []).reduce((sum, row) => sum + (row.pto_hours_deducted ?? 0), 0)
  }

  if (action === 'approve') {
    const resolution = resolveSubmissionPayType({
      requestedPayType: 'pto',
      requestedHours: sub.pto_hours_requested ?? null,
      balance: ptoBalance,
      used: ptoUsedBefore,
    })

    updatedApprovalStatus = 'approved'
    updatedPayType = resolution.payType

    await db
      .from('submissions')
      .update({
        approval_status: 'approved',
        pay_type: resolution.payType,
        pto_hours_deducted: resolution.payType === 'pto' ? resolution.approvedHours : null,
        supervisor_action_at: new Date().toISOString(),
        supervisor_action_by: sub.supervisor_email ?? sub.supervisor_name ?? 'Supervisor',
      })
      .eq('id', sub.id)

    message = resolution.autoSwitchedToUnpaid
      ? 'PTO was not available, so this submission was approved as unpaid.'
      : 'This submission was approved for PTO.'
  } else if (action === 'unpaid') {
    updatedApprovalStatus = 'approved'
    updatedPayType = 'unpaid'

    await db
      .from('submissions')
      .update({
        approval_status: 'approved',
        pay_type: 'unpaid',
        pto_hours_deducted: null,
        supervisor_action_at: new Date().toISOString(),
        supervisor_action_by: sub.supervisor_email ?? sub.supervisor_name ?? 'Supervisor',
      })
      .eq('id', sub.id)

    message = 'This submission was approved as unpaid.'
  } else {
    updatedApprovalStatus = 'denied'

    await db
      .from('submissions')
      .update({
        approval_status: 'denied',
        pto_hours_deducted: null,
        supervisor_action_at: new Date().toISOString(),
        supervisor_action_by: sub.supervisor_email ?? sub.supervisor_name ?? 'Supervisor',
      })
      .eq('id', sub.id)

    message = 'This submission was denied.'
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
