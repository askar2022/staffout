import type { SubmissionPayType } from '@/lib/types'

interface ResolveSubmissionPayInput {
  requestedPayType: SubmissionPayType
  requestedHours: number | null
  balance: number | null
  used: number
}

interface ResolveSubmissionPayResult {
  payType: SubmissionPayType
  approvedHours: number | null
  remainingAfter: number | null
  autoSwitchedToUnpaid: boolean
}

export function resolveSubmissionPayType(
  input: ResolveSubmissionPayInput
): ResolveSubmissionPayResult {
  const requestedHours = input.requestedHours ?? 0
  const remainingBefore = input.balance !== null ? input.balance - input.used : null

  if (input.requestedPayType === 'unpaid') {
    return {
      payType: 'unpaid',
      approvedHours: 0,
      remainingAfter: remainingBefore,
      autoSwitchedToUnpaid: false,
    }
  }

  if (input.balance === null || remainingBefore === null || remainingBefore < requestedHours) {
    return {
      payType: 'unpaid',
      approvedHours: 0,
      remainingAfter: remainingBefore,
      autoSwitchedToUnpaid: true,
    }
  }

  return {
    payType: 'pto',
    approvedHours: requestedHours,
    remainingAfter: remainingBefore - requestedHours,
    autoSwitchedToUnpaid: false,
  }
}
