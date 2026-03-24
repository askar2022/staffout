// This route is no longer used by the submission form.
// Staff identity is now verified via email OTP (/api/otp/send + /api/otp/verify).
// Kept as a stub to avoid 404s if any old links still reference it.

import { apiOk } from '@/lib/auth'

export async function GET() {
  return apiOk({ deprecated: true, staff: [], org: null })
}
