import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email/resend'
import { buildInstantEmail, buildSupervisorEmail } from '@/lib/email/templates'
import type { Submission, NotificationRecipient } from '@/lib/types'

const SUMMARY_HOUR = 8 // 8 AM

function isAfterSummaryTime(): boolean {
  const now = new Date()
  return now.getHours() >= SUMMARY_HOUR
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const supabase = await createClient()

    // Validate required fields
    if (!body.staff_name || !body.status || !body.organization_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Save submission
    const { data: submission, error } = await supabase
      .from('submissions')
      .insert({
        organization_id: body.organization_id,
        staff_name: body.staff_name,
        staff_email: body.staff_email || null,
        position: body.position || null,
        campus: body.campus || null,
        supervisor_email: body.supervisor_email || null,
        supervisor_name: body.supervisor_name || null,
        status: body.status,
        date: body.date || new Date().toISOString().split('T')[0],
        expected_arrival: body.expected_arrival || null,
        leave_time: body.leave_time || null,
        reason_category: body.reason_category || null,
        notes: body.notes || null,
        instant_sent: false,
        summary_included: false,
      })
      .select()
      .single()

    if (error || !submission) {
      console.error('Submission insert error:', error)
      return NextResponse.json({ error: 'Failed to save submission' }, { status: 500 })
    }

    // Fetch org info for emails
    const { data: org } = await supabase
      .from('organizations')
      .select('name, reply_to_email')
      .eq('id', body.organization_id)
      .single()

    // If after 8 AM → send instant + supervisor emails
    if (isAfterSummaryTime() && org) {
      const sub = submission as Submission

      // Get notification recipients
      const { data: recipients } = await supabase
        .from('notification_recipients')
        .select('*')
        .eq('organization_id', body.organization_id)
        .eq('receives_instant', true)

      const instantEmails =
        (recipients as NotificationRecipient[])?.map((r) => r.email) ?? []

      if (instantEmails.length > 0) {
        const { subject, html, text } = buildInstantEmail(org.name, sub)
        await sendEmail({ to: instantEmails, subject, html, text, replyTo: org.reply_to_email ?? undefined })

        // Log
        await supabase.from('email_logs').insert({
          organization_id: body.organization_id,
          type: 'instant',
          recipients: instantEmails,
          subject,
          submission_id: submission.id,
        })
      }

      // Supervisor alert
      if (sub.supervisor_email) {
        const { subject, html, text } = buildSupervisorEmail(org.name, sub)
        await sendEmail({
          to: [sub.supervisor_email],
          subject,
          html,
          text,
          replyTo: org.reply_to_email ?? undefined,
        })

        await supabase.from('email_logs').insert({
          organization_id: body.organization_id,
          type: 'supervisor',
          recipients: [sub.supervisor_email],
          subject,
          submission_id: submission.id,
        })
      }

      // Mark instant as sent
      await supabase
        .from('submissions')
        .update({ instant_sent: true })
        .eq('id', submission.id)
    }

    return NextResponse.json({ success: true, id: submission.id })
  } catch (err) {
    console.error('Submissions API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) {
      return NextResponse.json({ submissions: [] })
    }

    const url = new URL(request.url)
    const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0]

    const { data: submissions } = await supabase
      .from('submissions')
      .select('*')
      .eq('organization_id', profile.organization_id)
      .eq('date', date)
      .order('submitted_at', { ascending: false })

    return NextResponse.json({ submissions: submissions ?? [] })
  } catch (err) {
    console.error('GET submissions error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
