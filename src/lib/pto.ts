import type { SubmissionStatus } from '@/lib/types'

const PTO_WORKDAY_START_MINUTES = 8 * 60
const PTO_WORKDAY_END_MINUTES = 16 * 60

function roundHours(hours: number): number {
  return Math.round(hours * 100) / 100
}

export function parseTimeInputToMinutes(time: string | null | undefined): number | null {
  if (!time) return null

  const match = /^(\d{2}):(\d{2})$/.exec(time)
  if (!match) return null

  const hours = Number(match[1])
  const minutes = Number(match[2])

  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null
  }

  return hours * 60 + minutes
}

export function calculateTimedPtoHours(input: {
  status: SubmissionStatus
  expectedArrival?: string | null
  leaveTime?: string | null
}): number | null {
  if (input.status === 'late') {
    const arrivalMinutes = parseTimeInputToMinutes(input.expectedArrival)
    if (arrivalMinutes === null) return null

    const deductedMinutes = Math.max(
      0,
      Math.min(PTO_WORKDAY_END_MINUTES, arrivalMinutes) - PTO_WORKDAY_START_MINUTES
    )
    return roundHours(deductedMinutes / 60)
  }

  if (input.status === 'leaving_early') {
    const leaveMinutes = parseTimeInputToMinutes(input.leaveTime)
    if (leaveMinutes === null) return null

    const deductedMinutes = Math.max(
      0,
      PTO_WORKDAY_END_MINUTES - Math.max(PTO_WORKDAY_START_MINUTES, leaveMinutes)
    )
    return roundHours(deductedMinutes / 60)
  }

  return null
}

export const PTO_WORKDAY_LABEL = '8:00 AM to 4:00 PM'
