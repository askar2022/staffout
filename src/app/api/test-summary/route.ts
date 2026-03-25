import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth, apiError, apiOk } from '@/lib/auth'
import { sendEmail } from '@/lib/email/resend'
import { buildSummaryEmail } from '@/lib/email/templates'
import type { Submission } from '@/lib/types'

export async function POST(request: NextRequest) {
  try {
    const { orgId } = await requireAuth(request)
    const db = createAdminClient()

    const today = new Date().toISOString().split('T')[0]

    // Get org info
    const { data: org } = await db
      .from('organizations')
      .select('*')
      .eq('id', orgId)
      .single()

    if (!org) return apiError('Organization not found', 404)

    // Get today's submissions (all of them — don't filter summary_included for test)
    const { data: rawSubs } = await db
      .from('submissions')
      .select('*')
      .eq('organization_id', orgId)
      .eq('date', today)

    const submissions = (rawSubs ?? []) as Submission[]

    // Get summary recipients
    const { data: rawRecipients } = await db
      .from('notification_recipients')
      .select('email')
      .eq('organization_id', orgId)
      .eq('receives_summary', true)

    const summaryEmails = (rawRecipients ?? []).map((r: { email: string }) => r.email)

    if (!summaryEmails.length) {
      return apiError('No summary recipients configured. Go to Settings → Notification Recipients and add someone with Summary enabled.', 400)
    }

    const { subject, html, text } = buildSummaryEmail(org.name, submissions, new Date())

    // Add [TEST] prefix so it's clear this is a test
    const testSubject = `[TEST] ${subject}`

    const result = await sendEmail({
      to: summaryEmails,
      subject: testSubject,
      html,
      text,
      replyTo: org.reply_to_email ?? undefined,
    })

    if (!result.success) {
      return apiError('Failed to send test email. Check your Resend configuration.', 500)
    }

    return apiOk({
      success: true,
      sentTo: summaryEmails,
      submissionsIncluded: submissions.length,
    })
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return apiError('Unauthorized', 401)
    }
    return apiError('Server error', 500)
  }
}
