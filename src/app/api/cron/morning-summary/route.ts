import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email/resend'
import { buildSummaryEmail, buildSupervisorEmail } from '@/lib/email/templates'
import type { Submission, NotificationRecipient } from '@/lib/types'

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = await createClient()
    const today = new Date().toISOString().split('T')[0]

    // Get all organizations
    const { data: orgs } = await supabase.from('organizations').select('*')
    if (!orgs?.length) {
      return NextResponse.json({ message: 'No organizations found' })
    }

    const results = []

    for (const org of orgs) {
      // Get today's submissions not yet in summary
      const { data: rawSubmissions } = await supabase
        .from('submissions')
        .select('*')
        .eq('organization_id', org.id)
        .eq('date', today)
        .eq('summary_included', false)

      const submissions = (rawSubmissions ?? []) as Submission[]

      // Get notification recipients for summary
      const { data: rawRecipients } = await supabase
        .from('notification_recipients')
        .select('*')
        .eq('organization_id', org.id)
        .eq('receives_summary', true)

      const recipients = (rawRecipients ?? []) as NotificationRecipient[]
      const summaryEmails = recipients.map((r) => r.email)

      if (summaryEmails.length === 0) {
        results.push({ org: org.name, skipped: 'no recipients' })
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

      // Log the email
      await supabase.from('email_logs').insert({
        organization_id: org.id,
        type: 'summary',
        recipients: summaryEmails,
        subject,
        success: emailResult.success,
        error_message: emailResult.success ? null : emailResult.error,
      })

      // Send supervisor alerts for absent/personal_day
      const absentStaff = submissions.filter(
        (s) => (s.status === 'absent' || s.status === 'personal_day') && s.supervisor_email
      )

      for (const sub of absentStaff) {
        if (!sub.supervisor_email) continue
        const { subject: supSubject, html: supHtml, text: supText } = buildSupervisorEmail(org.name, sub)
        await sendEmail({
          to: [sub.supervisor_email],
          subject: supSubject,
          html: supHtml,
          text: supText,
          replyTo: org.reply_to_email ?? undefined,
        })

        await supabase.from('email_logs').insert({
          organization_id: org.id,
          type: 'supervisor',
          recipients: [sub.supervisor_email],
          subject: supSubject,
          submission_id: sub.id,
        })
      }

      // Mark submissions as included in summary
      if (submissions.length > 0) {
        await supabase
          .from('submissions')
          .update({ summary_included: true })
          .in('id', submissions.map((s) => s.id))
      }

      results.push({
        org: org.name,
        submissions: submissions.length,
        emailsSent: summaryEmails.length,
        supervisorAlerts: absentStaff.length,
      })
    }

    return NextResponse.json({ success: true, results })
  } catch (err) {
    console.error('Morning summary cron error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
