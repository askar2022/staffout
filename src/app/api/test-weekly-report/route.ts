import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth, apiError, apiOk, AuthError } from '@/lib/auth'
import { sendEmail } from '@/lib/email/resend'
import { buildWeeklyReportEmail, DaySummary } from '@/lib/email/templates'
import type { Submission } from '@/lib/types'

export async function POST() {
  try {
    const { orgId } = await requireAuth()
    const db = createAdminClient()

    const { data: org } = await db
      .from('organizations')
      .select('*')
      .eq('id', orgId)
      .single()

    if (!org) return apiError('Organization not found', 404)

    // Use current week Mon–Fri
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' }))
    const day = now.getDay()
    const monday = new Date(now)
    monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1))
    monday.setHours(0, 0, 0, 0)

    const weekDays = Array.from({ length: 5 }, (_, i) => {
      const d = new Date(monday)
      d.setDate(monday.getDate() + i)
      return d
    })

    const weekLabel = `${weekDays[0].toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} – ${weekDays[4].toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`

    const startDate = weekDays[0].toISOString().split('T')[0]
    const endDate = weekDays[4].toISOString().split('T')[0]

    const { data: rawSubs } = await db
      .from('submissions')
      .select('*')
      .eq('organization_id', orgId)
      .gte('date', startDate)
      .lte('date', endDate)

    const submissions = (rawSubs ?? []) as Submission[]

    // Weekly report goes to admin + leadership
    const { data: rawRecipients } = await db
      .from('notification_recipients')
      .select('email, type')
      .eq('organization_id', orgId)
      .in('type', ['admin', 'leadership'])

    const reportEmails = (rawRecipients ?? []).map((r: { email: string }) => r.email)

    if (!reportEmails.length) {
      return apiError('No leadership or admin recipients configured. Go to Settings and add someone with Admin or Leadership role.', 400)
    }

    const days: DaySummary[] = weekDays.map((d) => {
      const dateStr = d.toISOString().split('T')[0]
      const daySubs = submissions.filter((s) => s.date === dateStr)
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

    const { subject, html, text } = buildWeeklyReportEmail(org.name, days, weekLabel)

    const result = await sendEmail({
      to: reportEmails,
      subject: `[TEST] ${subject}`,
      html,
      text,
      replyTo: org.reply_to_email ?? undefined,
    })

    if (!result.success) return apiError('Failed to send test email.', 500)

    return apiOk({ success: true, sentTo: reportEmails, weekLabel })
  } catch (err) {
    if (err instanceof AuthError) return apiError('Unauthorized', 401)
    return apiError('Server error', 500)
  }
}
