import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email/resend'
import { buildWeeklyReportEmail, DaySummary } from '@/lib/email/templates'
import { apiError, apiOk } from '@/lib/auth'
import type { Submission } from '@/lib/types'
import { filterSubmissionsForCampusScope, normalizeCampusScope } from '@/lib/notification-scope'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return apiError('Unauthorized', 401)
  }

  try {
    const db = createAdminClient()

    // Calculate Mon–Fri of the current week in Central Time
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' }))
    const day = now.getDay() // 0=Sun, 5=Fri
    const monday = new Date(now)
    monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1))
    monday.setHours(0, 0, 0, 0)

    const weekDays = Array.from({ length: 5 }, (_, i) => {
      const d = new Date(monday)
      d.setDate(monday.getDate() + i)
      return d
    })

    const weekLabel = `${weekDays[0].toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} – ${weekDays[4].toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`

    const { data: orgs } = await db
      .from('organizations')
      .select('*')
      .eq('status', 'approved')

    if (!orgs?.length) return apiOk({ message: 'No organizations' })

    const results = []

    for (const org of orgs) {
      // Get all submissions for Mon–Fri of this week
      const startDate = weekDays[0].toISOString().split('T')[0]
      const endDate = weekDays[4].toISOString().split('T')[0]

      const { data: rawSubs } = await db
        .from('submissions')
        .select('*')
        .eq('organization_id', org.id)
        .gte('date', startDate)
        .lte('date', endDate)

      const submissions = (rawSubs ?? []) as Submission[]

      // Weekly report goes to admin + leadership only
      const { data: rawRecipients } = await db
        .from('notification_recipients')
        .select('email, type, campus_scope')
        .eq('organization_id', org.id)
        .in('type', ['admin', 'leadership'])

      const recipients = (rawRecipients ?? []) as {
        email: string
        type: string
        campus_scope: string | null
      }[]

      if (!recipients.length) {
        results.push({ org: org.name, skipped: 'no recipients configured' })
        continue
      }

      let emailsSent = 0

      const scopes = [...new Set(recipients.map((r) => normalizeCampusScope(r.campus_scope) ?? '__ALL__'))]

      for (const scopeKey of scopes) {
        const campusScope = scopeKey === '__ALL__' ? null : scopeKey
        const scopedSubs = filterSubmissionsForCampusScope(submissions, campusScope)

        const summaryEmails = recipients
          .filter((r) => normalizeCampusScope(r.campus_scope) === campusScope)
          .map((r) => r.email)

        if (!summaryEmails.length) continue

        // Build per-day summary (scoped)
        const days: DaySummary[] = weekDays.map((d) => {
          const dateStr = d.toISOString().split('T')[0]
          const daySubs = scopedSubs.filter((s) => s.date === dateStr)
          return {
            label: d.toLocaleDateString('en-US', { weekday: 'long' }),
            date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            absent: daySubs.filter((s) => s.status === 'absent').length,
            late: daySubs.filter((s) => s.status === 'late').length,
            leaving: daySubs.filter((s) => s.status === 'leaving_early' || s.status === 'appointment').length,
            personal: daySubs.filter((s) => s.status === 'personal_day').length,
            total: daySubs.length,
          }
        })

        const subjectSuffix = campusScope ? ` (${campusScope})` : ''
        const { subject, html, text } = buildWeeklyReportEmail(`${org.name}${subjectSuffix}`, days, weekLabel)

        const emailResult = await sendEmail({
          to: summaryEmails,
          subject,
          html,
          text,
          replyTo: org.reply_to_email ?? undefined,
        })

        emailsSent += summaryEmails.length

        await db.from('email_logs').insert({
          organization_id: org.id,
          type: 'summary',
          recipients: summaryEmails,
          subject,
          success: emailResult.success,
          error_message: emailResult.success ? null : (emailResult as { error?: string }).error ?? null,
        })
      }

      results.push({ org: org.name, weekLabel, recipientEmailsSent: emailsSent })
    }

    return apiOk({ success: true, results })
  } catch (err) {
    console.error('Weekly report cron error:', err)
    return apiError('Server error', 500)
  }
}
