import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email/resend'
import { buildSummaryEmail, buildSupervisorEmail } from '@/lib/email/templates'
import { apiError, apiOk } from '@/lib/auth'
import type { Submission } from '@/lib/types'

export async function GET(request: Request) {
  // Verify cron secret — Vercel sets this header automatically
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return apiError('Unauthorized', 401)
  }

  try {
    const db = createAdminClient()
    const today = new Date().toISOString().split('T')[0]

    const { data: orgs } = await db.from('organizations').select('*')
    if (!orgs?.length) return apiOk({ message: 'No organizations' })

    const results = []

    for (const org of orgs) {
      const { data: rawTodaySubs } = await db
        .from('submissions')
        .select('*')
        .eq('organization_id', org.id)
        .eq('date', today)
        .eq('summary_included', false)
        .eq('instant_sent', false)

      const { data: rawOngoingSubs } = await db
        .from('submissions')
        .select('*')
        .eq('organization_id', org.id)
        .lt('date', today)
        .gte('end_date', today)

      const todaySubmissions = (rawTodaySubs ?? []) as Submission[]
      const ongoingSubmissions = (rawOngoingSubs ?? []) as Submission[]
      const submissions = [...todaySubmissions]

      for (const sub of ongoingSubmissions) {
        if (!submissions.some((s) => s.id === sub.id)) {
          submissions.push(sub)
        }
      }

      const { data: rawRecipients } = await db
        .from('notification_recipients')
        .select('email')
        .eq('organization_id', org.id)
        .eq('receives_summary', true)

      const summaryEmails = (rawRecipients ?? []).map((r: { email: string }) => r.email)

      if (!summaryEmails.length) {
        results.push({ org: org.name, skipped: 'no recipients configured' })
        continue
      }

      const { subject, html, text } = buildSummaryEmail(org.name, submissions, new Date())

      const emailResult = await sendEmail({
        to: summaryEmails,
        subject,
        html,
        text,
        replyTo: org.reply_to_email ?? undefined,
      })

      await db.from('email_logs').insert({
        organization_id: org.id,
        type: 'summary',
        recipients: summaryEmails,
        subject,
        success: emailResult.success,
        error_message: emailResult.success ? null : (emailResult as { error?: string }).error ?? null,
      })

      // Supervisor notices only for today's new absent staff
      const absentStaff = todaySubmissions.filter(
        (s) => (s.status === 'absent' || s.status === 'personal_day') && s.supervisor_email
      )

      for (const sub of absentStaff) {
        if (!sub.supervisor_email) continue
        const { subject: supSubject, html: supHtml, text: supText } = buildSupervisorEmail(org.name, sub)
        await sendEmail({ to: [sub.supervisor_email], subject: supSubject, html: supHtml, text: supText })
        await db.from('email_logs').insert({
          organization_id: org.id,
          type: 'supervisor',
          recipients: [sub.supervisor_email],
          subject: supSubject,
          submission_id: sub.id,
        })
      }

      if (todaySubmissions.length > 0) {
        await db
          .from('submissions')
          .update({ summary_included: true })
          .in('id', todaySubmissions.map((s) => s.id))
      }

      results.push({
        org: org.name,
        submissions: submissions.length,
        emailsSent: summaryEmails.length,
        carriedForwardMultiDay: ongoingSubmissions.length,
        supervisorAlerts: absentStaff.length,
      })
    }

    return apiOk({ success: true, results })
  } catch (err) {
    console.error('Morning summary cron error:', err)
    return apiError('Server error', 500)
  }
}
