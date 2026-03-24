export type SubmissionStatus =
  | 'absent'
  | 'late'
  | 'leaving_early'
  | 'appointment'
  | 'personal_day'

export type ReasonCategory =
  | 'sick'
  | 'personal'
  | 'family'
  | 'medical'
  | 'other'

export type EmailType = 'summary' | 'instant' | 'supervisor'

export interface Organization {
  id: string
  name: string
  slug: string
  contact_email: string | null
  reply_to_email: string | null
  summary_send_time: string
  timezone: string
  created_at: string
}

export interface Profile {
  id: string
  organization_id: string | null
  full_name: string | null
  role: string
  created_at: string
}

export interface StaffMember {
  id: string
  organization_id: string
  full_name: string
  email: string | null
  position: string | null
  campus: string | null
  supervisor_name: string | null
  supervisor_email: string | null
  is_active: boolean
  created_at: string
}

export interface Submission {
  id: string
  organization_id: string
  staff_name: string
  staff_email: string | null
  position: string | null
  campus: string | null
  supervisor_email: string | null
  supervisor_name: string | null
  status: SubmissionStatus
  date: string
  expected_arrival: string | null
  leave_time: string | null
  reason_category: ReasonCategory | null
  notes: string | null
  submitted_at: string
  summary_included: boolean
  instant_sent: boolean
}

export interface NotificationRecipient {
  id: string
  organization_id: string
  name: string
  email: string
  type: 'all_staff' | 'admin' | 'reception' | 'hr'
  receives_summary: boolean
  receives_instant: boolean
}

export interface EmailLog {
  id: string
  organization_id: string
  type: EmailType
  sent_at: string
  recipients: string[]
  subject: string
  submission_id: string | null
  success: boolean
  error_message: string | null
}

export const STATUS_LABELS: Record<SubmissionStatus, string> = {
  absent: 'Absent',
  late: 'Late Arrival',
  leaving_early: 'Leaving Early',
  appointment: 'Off-Campus Appointment',
  personal_day: 'Personal Day',
}

export const STATUS_COLORS: Record<SubmissionStatus, string> = {
  absent: 'bg-red-100 text-red-800 border-red-200',
  late: 'bg-amber-100 text-amber-800 border-amber-200',
  leaving_early: 'bg-orange-100 text-orange-800 border-orange-200',
  appointment: 'bg-blue-100 text-blue-800 border-blue-200',
  personal_day: 'bg-purple-100 text-purple-800 border-purple-200',
}

export const REASON_LABELS: Record<ReasonCategory, string> = {
  sick: 'Sick / Not Feeling Well',
  personal: 'Personal Reason',
  family: 'Family Matter',
  medical: 'Medical Appointment',
  other: 'Other',
}
