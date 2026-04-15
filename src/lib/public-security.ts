import { createAdminClient } from '@/lib/supabase/admin'

const OTP_TTL_MS = 10 * 60 * 1000
const OTP_RESEND_INTERVAL_MS = 60 * 1000
const OTP_MAX_ACTIVE_CODES = 5
const SUBMISSION_WINDOW_MS = 5 * 60 * 1000
const SUBMISSION_MAX_PER_WINDOW = 3
export const LESSON_PLAN_BUCKET = 'lesson-plans'

type AdminClient = ReturnType<typeof createAdminClient>

export async function hasRecentVerifiedOtp(db: AdminClient, email: string, orgId: string | null): Promise<boolean> {
  const baseQuery = db
    .from('otp_codes')
    .select('id')
    .eq('email', email)
    .eq('used', true)
    .gt('expires_at', new Date().toISOString())
    .limit(1)

  const query = orgId ? baseQuery.eq('organization_id', orgId) : baseQuery.is('organization_id', null)
  const { data } = await query
  return !!data?.length
}

export async function getOtpSendRateLimitMessage(
  db: AdminClient,
  email: string,
  orgId: string | null,
): Promise<string | null> {
  const resendThreshold = new Date(Date.now() + OTP_TTL_MS - OTP_RESEND_INTERVAL_MS).toISOString()
  const resendBaseQuery = db
    .from('otp_codes')
    .select('id', { count: 'exact', head: true })
    .eq('email', email)
    .gte('expires_at', resendThreshold)

  const resendQuery = orgId
    ? resendBaseQuery.eq('organization_id', orgId)
    : resendBaseQuery.is('organization_id', null)
  const { count: resendCount } = await resendQuery
  if ((resendCount ?? 0) > 0) {
    return 'Please wait about a minute before requesting another verification code.'
  }

  const activeBaseQuery = db
    .from('otp_codes')
    .select('id', { count: 'exact', head: true })
    .eq('email', email)
    .gt('expires_at', new Date().toISOString())

  const activeQuery = orgId
    ? activeBaseQuery.eq('organization_id', orgId)
    : activeBaseQuery.is('organization_id', null)
  const { count: activeCount } = await activeQuery
  if ((activeCount ?? 0) >= OTP_MAX_ACTIVE_CODES) {
    return 'Too many verification codes were requested. Please wait 10 minutes and try again.'
  }

  return null
}

export async function getSubmissionRateLimitMessage(
  db: AdminClient,
  email: string,
  orgId: string,
): Promise<string | null> {
  const { count } = await db
    .from('submissions')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', orgId)
    .ilike('staff_email', email)
    .gte('submitted_at', new Date(Date.now() - SUBMISSION_WINDOW_MS).toISOString())

  if ((count ?? 0) >= SUBMISSION_MAX_PER_WINDOW) {
    return 'Too many submissions were sent from this email. Please wait a few minutes and try again.'
  }

  return null
}

export async function getLessonPlanAccessUrl(
  db: AdminClient,
  lessonPlanValue: string | null | undefined,
  expiresInSeconds = 60 * 60 * 24 * 3,
): Promise<string | null> {
  if (!lessonPlanValue) return null
  if (/^https?:\/\//i.test(lessonPlanValue)) return lessonPlanValue

  const path = lessonPlanValue.replace(/^\/+/, '')
  const { data, error } = await db.storage
    .from(LESSON_PLAN_BUCKET)
    .createSignedUrl(path, expiresInSeconds)

  if (error) {
    console.error('Failed to create signed lesson plan URL', { path, error })
    return null
  }

  return data.signedUrl
}
