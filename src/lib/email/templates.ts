import { Submission, STATUS_LABELS } from '@/lib/types'
import { format } from 'date-fns'

// ── Staff Confirmation Email ──────────────────────────────────────────────────

export function buildConfirmationEmail(
  orgName: string,
  submission: Submission
): { subject: string; html: string; text: string } {
  const statusLabel = STATUS_LABELS[submission.status] ?? submission.status
  const dateStr = format(new Date(submission.date + 'T12:00:00'), 'EEEE, MMMM d, yyyy')
  const hasSupervisor = !!submission.supervisor_name

  const subject = `Your absence has been recorded — ${dateStr}`

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,sans-serif;">
  <div style="max-width:520px;margin:32px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

    <div style="background:#4f46e5;height:5px;"></div>

    <div style="padding:28px 32px 20px;">
      <div style="font-size:13px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#4f46e5;margin-bottom:6px;">
        ${orgName}
      </div>
      <div style="font-size:22px;font-weight:800;color:#0f172a;line-height:1.3;">
        Absence Recorded ✓
      </div>
      <div style="font-size:14px;color:#64748b;margin-top:4px;">${dateStr}</div>
    </div>

    <div style="padding:0 32px 24px;">
      <p style="margin:0 0 16px;font-size:15px;color:#1e293b;line-height:1.6;">
        Hi <strong>${submission.staff_name}</strong>, your absence submission has been received and recorded.
      </p>

      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px 20px;margin-bottom:16px;">
        <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#94a3b8;margin-bottom:10px;">Submission Details</div>
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="font-size:13px;color:#64748b;padding:4px 0;width:110px;">Status</td>
            <td style="font-size:13px;font-weight:600;color:#0f172a;padding:4px 0;">${statusLabel}</td>
          </tr>
          <tr>
            <td style="font-size:13px;color:#64748b;padding:4px 0;">Date</td>
            <td style="font-size:13px;font-weight:600;color:#0f172a;padding:4px 0;">${dateStr}</td>
          </tr>
          ${submission.notes ? `<tr>
            <td style="font-size:13px;color:#64748b;padding:4px 0;vertical-align:top;">Notes</td>
            <td style="font-size:13px;color:#0f172a;padding:4px 0;">${submission.notes}</td>
          </tr>` : ''}
        </table>
      </div>

      ${hasSupervisor ? `
      <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:12px 16px;font-size:13px;color:#1e40af;line-height:1.5;">
        <strong>${submission.supervisor_name}</strong> has been notified and is aware of your absence.
      </div>` : `
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:12px 16px;font-size:13px;color:#166534;line-height:1.5;">
        Your school has been notified and is aware of your absence.
      </div>`}
    </div>

    <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:14px 32px;">
      <p style="margin:0;font-size:12px;color:#94a3b8;">
        This is an automated confirmation from <strong style="color:#64748b;">${orgName}</strong>. Please do not reply.
      </p>
    </div>

  </div>
</body>
</html>`

  const text = [
    `Absence Recorded — ${orgName}`,
    ``,
    `Hi ${submission.staff_name},`,
    `Your absence has been recorded for ${dateStr}.`,
    `Status: ${statusLabel}`,
    submission.notes ? `Notes: ${submission.notes}` : '',
    ``,
    hasSupervisor
      ? `${submission.supervisor_name} has been notified.`
      : `Your school has been notified.`,
  ].filter(Boolean).join('\n')

  return { subject, html, text }
}

// ── HR Excuse Accountability Email (to the staff member) ─────────────────────

export function buildHrExcuseEmail(
  orgName: string,
  submission: Submission
): { subject: string; html: string; text: string } {
  const statusLabel = STATUS_LABELS[submission.status] ?? submission.status
  const dateStr = format(new Date(submission.date + 'T12:00:00'), 'EEEE, MMMM d, yyyy')

  const subject = `HR Notice — Your absence on ${dateStr} has been recorded`

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,sans-serif;">
  <div style="max-width:520px;margin:32px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

    <div style="background:#7c3aed;height:5px;"></div>

    <div style="padding:28px 32px 20px;">
      <div style="font-size:13px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#7c3aed;margin-bottom:6px;">
        ${orgName} — HR Notice
      </div>
      <div style="font-size:22px;font-weight:800;color:#0f172a;line-height:1.3;">
        Absence Recorded by HR
      </div>
      <div style="font-size:14px;color:#64748b;margin-top:4px;">${dateStr}</div>
    </div>

    <div style="padding:0 32px 24px;">
      <p style="margin:0 0 16px;font-size:15px;color:#1e293b;line-height:1.6;">
        Hi <strong>${submission.staff_name}</strong>,
      </p>
      <p style="margin:0 0 16px;font-size:15px;color:#1e293b;line-height:1.6;">
        Your absence on <strong>${dateStr}</strong> was logged by HR because a submission was not received from you.
        This record has been shared with your supervisor and the school team.
      </p>

      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px 20px;margin-bottom:20px;">
        <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#94a3b8;margin-bottom:10px;">Absence Details</div>
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="font-size:13px;color:#64748b;padding:4px 0;width:110px;">Status</td>
            <td style="font-size:13px;font-weight:600;color:#0f172a;padding:4px 0;">${statusLabel}</td>
          </tr>
          <tr>
            <td style="font-size:13px;color:#64748b;padding:4px 0;">Date</td>
            <td style="font-size:13px;font-weight:600;color:#0f172a;padding:4px 0;">${dateStr}</td>
          </tr>
          ${submission.hr_note ? `<tr>
            <td style="font-size:13px;color:#64748b;padding:4px 0;vertical-align:top;">HR Note</td>
            <td style="font-size:13px;color:#0f172a;padding:4px 0;">${submission.hr_note}</td>
          </tr>` : ''}
        </table>
      </div>

      <div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:10px;padding:14px 16px;font-size:14px;color:#92400e;line-height:1.6;">
        <strong>Reminder:</strong> In the future, please submit your own absence using the OutOfShift form before or when your absence begins. 
        This ensures your supervisor is notified promptly and coverage can be arranged.
      </div>
    </div>

    <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:14px 32px;">
      <p style="margin:0;font-size:12px;color:#94a3b8;">
        This notice was sent by <strong style="color:#64748b;">${orgName}</strong> HR. Please do not reply to this email.
      </p>
    </div>

  </div>
</body>
</html>`

  const text = [
    `HR Notice — ${orgName}`,
    ``,
    `Hi ${submission.staff_name},`,
    ``,
    `Your absence on ${dateStr} was logged by HR because a submission was not received from you.`,
    `Status: ${statusLabel}`,
    submission.hr_note ? `HR Note: ${submission.hr_note}` : '',
    ``,
    `Reminder: Please submit your own absence using the OutOfShift form next time.`,
  ].filter(Boolean).join('\n')

  return { subject, html, text }
}

function formatCentralTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/Chicago',
  }).format(d)
}

function statusLine(s: Submission): string {
  let detail = ''
  if (s.status === 'late' && s.expected_arrival) {
    detail = ` — Arriving at ${s.expected_arrival}`
  } else if (s.status === 'leaving_early' && s.leave_time) {
    detail = ` — Leaving at ${s.leave_time}`
  } else if (s.status === 'appointment' && s.leave_time) {
    detail = ` — Off campus at ${s.leave_time}`
  }
  const campus = s.campus ? ` (${s.campus})` : ''
  const position = s.position ? ` · ${s.position}` : ''
  return `${s.staff_name}${campus}${position}${detail}`
}

// ── 8:00 AM Morning Summary ──────────────────────────────────────────────────

export function buildSummaryEmail(
  orgName: string,
  submissions: Submission[],
  date: Date
): { subject: string; html: string; text: string } {
  const dayName = format(date, 'EEEE')       // e.g. "Tuesday"
  const dateStr = format(date, 'MMMM d, yyyy') // e.g. "March 24, 2025"

  const absent = submissions.filter((s) => s.status === 'absent' || s.status === 'personal_day')
  const late = submissions.filter((s) => s.status === 'late')
  const leavingEarly = submissions.filter((s) => s.status === 'leaving_early' || s.status === 'appointment')
  const hasAny = absent.length + late.length + leavingEarly.length > 0

  const subject = `Staff Attendance — ${dayName}, ${dateStr}`

  // Bullet list of names for each section
  const bulletList = (items: Submission[]) =>
    items
      .map((s) => {
        let detail = ''
        if (s.status === 'late' && s.expected_arrival) detail = ` (arriving ${s.expected_arrival})`
        else if (s.status === 'leaving_early' && s.leave_time) detail = ` (leaving ${s.leave_time})`
        else if (s.status === 'appointment' && s.leave_time) detail = ` (off campus ${s.leave_time})`
        return `<li style="margin:6px 0;font-size:15px;color:#1e293b;">${s.staff_name}${detail}</li>`
      })
      .join('')

  const section = (title: string, color: string, dot: string, items: Submission[]) => {
    if (!items.length) return ''
    return `
      <div style="margin-bottom:22px;">
        <div style="font-size:12px;font-weight:700;letter-spacing:0.07em;text-transform:uppercase;color:${color};margin-bottom:8px;">
          ${dot}&nbsp; ${title}
        </div>
        <ul style="margin:0;padding-left:20px;">
          ${bulletList(items)}
        </ul>
      </div>`
  }

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,sans-serif;">
  <div style="max-width:540px;margin:32px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

    <!-- Colored top accent bar -->
    <div style="background:#4f46e5;height:5px;"></div>

    <!-- Header — white, clean, readable -->
    <div style="background:#ffffff;padding:24px 32px 16px;border-bottom:1px solid #e2e8f0;">
      <div style="font-size:13px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#4f46e5;margin-bottom:4px;">
        StaffOut &middot; ${orgName}
      </div>
      <div style="font-size:20px;font-weight:800;color:#0f172a;line-height:1.3;">
        Good morning everyone!
      </div>
      <div style="font-size:14px;color:#64748b;margin-top:3px;">
        Happy ${dayName}, ${dateStr}
      </div>
    </div>

    <!-- Body -->
    <div style="padding:28px 32px;">
      ${
        !hasAny
          ? `
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px 20px;">
          <p style="margin:0;color:#15803d;font-size:15px;font-weight:600;">
            ✓ All staff present today — no absences reported.
          </p>
        </div>`
          : `
        <p style="margin:0 0 20px;color:#475569;font-size:15px;">
          Here is today's attendance update:
        </p>
        <div style="background:#fafafa;border:1px solid #e2e8f0;border-radius:12px;padding:20px 24px;">
          ${section('Staff Out', '#dc2626', '●', absent)}
          ${section('Late Today', '#d97706', '●', late)}
          ${section('Leaving Early / Off Campus', '#7c3aed', '●', leavingEarly)}
        </div>
        <p style="margin:20px 0 0;color:#64748b;font-size:13px;line-height:1.6;">
          The supervisors of all staff listed above have already been notified directly.
        </p>`
      }
    </div>

    <!-- Footer -->
    <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:14px 32px;">
      <p style="margin:0;font-size:12px;color:#94a3b8;">
        Sent automatically by <strong style="color:#64748b;">StaffOut</strong> · ${dateStr} · Do not reply to this email.
      </p>
    </div>

  </div>
</body>
</html>`

  // Plain text version
  const textLines = [
    `Good morning everyone,`,
    `Happy ${dayName}! Here is today's attendance update for ${orgName}.`,
    ``,
  ]

  if (!hasAny) {
    textLines.push('All staff present today — no absences reported.')
  } else {
    if (absent.length) {
      textLines.push('STAFF OUT:')
      absent.forEach((s) => textLines.push(`  • ${statusLine(s)}`))
      textLines.push('')
    }
    if (late.length) {
      textLines.push('LATE TODAY:')
      late.forEach((s) => textLines.push(`  • ${statusLine(s)}`))
      textLines.push('')
    }
    if (leavingEarly.length) {
      textLines.push('LEAVING EARLY / OFF CAMPUS:')
      leavingEarly.forEach((s) => textLines.push(`  • ${statusLine(s)}`))
      textLines.push('')
    }
    textLines.push('The supervisors of all staff listed above have already been notified directly.')
  }

  textLines.push(``, `— StaffOut · ${orgName}`)

  return { subject, html, text: textLines.join('\n') }
}

// ── Instant Alert ─────────────────────────────────────────────────────────────

// Natural-language phrase for "Name IS ___" in the all-staff alert
const STATUS_PHRASE: Record<string, string> = {
  absent: 'is Absent today',
  late: 'will Arrive Late',
  leaving_early: 'is Leaving Early',
  appointment: 'has an Off-Campus Appointment',
  personal_day: 'is Out — Personal Day',
}

export function buildInstantEmail(
  orgName: string,
  submission: Submission
): { subject: string; html: string; text: string } {
  const timeStr = formatCentralTime(submission.submitted_at)
  const statusLabel = STATUS_LABELS[submission.status]
  const statusPhrase = STATUS_PHRASE[submission.status] ?? `is ${statusLabel}`

  const subject = `Staff Update — ${orgName}`

  // Time detail (late/leaving only — no private notes)
  let timeNote = ''
  if (submission.status === 'late' && submission.expected_arrival) {
    timeNote = `Arriving at ${submission.expected_arrival}`
  } else if ((submission.status === 'leaving_early' || submission.status === 'appointment') && submission.leave_time) {
    timeNote = `${submission.status === 'leaving_early' ? 'Leaving at' : 'Off campus at'} ${submission.leave_time}`
  }

  const statusColor =
    submission.status === 'absent' || submission.status === 'personal_day' ? '#dc2626' :
    submission.status === 'late' ? '#d97706' : '#7c3aed'

  const dateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', timeZone: 'America/Chicago',
  })

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,sans-serif;">
  <div style="max-width:540px;margin:32px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

    <!-- Colored top accent bar -->
    <div style="background:${statusColor};height:5px;"></div>

    <!-- Header — light background, easy to read -->
    <div style="background:#ffffff;padding:24px 32px 16px;border-bottom:1px solid #e2e8f0;">
      <div style="font-size:13px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:${statusColor};">
        StaffOut &middot; ${orgName}
      </div>
      <div style="margin-top:4px;font-size:13px;color:#64748b;">${dateStr} &middot; ${timeStr}</div>
    </div>

    <!-- Body -->
    <div style="padding:28px 32px;">
      <div style="background:#f8fafc;border-left:4px solid ${statusColor};border-radius:0 10px 10px 0;padding:18px 22px;">
        <div style="font-size:18px;font-weight:800;color:#0f172a;">
          ${submission.staff_name}
        </div>
        <div style="margin-top:4px;font-size:16px;font-weight:500;color:${statusColor};">
          ${statusPhrase}
        </div>
        ${timeNote ? `<div style="margin-top:8px;font-size:14px;color:#475569;font-weight:500;">${timeNote}</div>` : ''}
        ${submission.hr_excused ? `<div style="margin-top:10px;display:inline-block;background:#ede9fe;color:#5b21b6;font-size:12px;font-weight:700;padding:3px 10px;border-radius:20px;letter-spacing:0.04em;">🔖 HR EXCUSED</div>` : ''}
      </div>
    </div>

    <!-- Footer -->
    <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:14px 32px;">
      <p style="margin:0;font-size:12px;color:#94a3b8;">
        Sent automatically by <strong style="color:#64748b;">StaffOut</strong> &middot; Do not reply to this email.
      </p>
    </div>

  </div>
</body>
</html>`

  const text = [
    `StaffOut · ${orgName}`,
    ``,
    `${submission.staff_name} ${statusPhrase}.`,
    timeNote || '',
    ``,
    `Submitted at ${timeStr}`,
  ]
    .filter(Boolean)
    .join('\n')

  return { subject, html, text }
}

// ── Supervisor Alert ──────────────────────────────────────────────────────────

export function buildSupervisorEmail(
  orgName: string,
  submission: Submission
): { subject: string; html: string; text: string } {
  const statusLabel = STATUS_LABELS[submission.status]
  const needsCoverage = submission.status === 'absent' || submission.status === 'personal_day'
  const isHrExcused = submission.hr_excused === true

  let timeDetail = ''
  if (submission.status === 'late' && submission.expected_arrival) {
    timeDetail = submission.expected_arrival
  } else if ((submission.status === 'leaving_early' || submission.status === 'appointment') && submission.leave_time) {
    timeDetail = submission.leave_time
  }

  const subject = isHrExcused
    ? `HR Excused — ${submission.staff_name} · ${statusLabel}`
    : needsCoverage
    ? `Action Needed — Coverage Required for ${submission.staff_name}`
    : `Staff Notice — ${submission.staff_name} · ${statusLabel}`

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:32px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    
    <div style="background:${needsCoverage ? '#dc2626' : '#d97706'};padding:36px 32px 28px;">
      <div style="font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:rgba(255,255,255,0.7);margin-bottom:4px;">
        ${needsCoverage ? 'Action Required — Supervisor Notice' : 'Supervisor Notice'}
      </div>
      <div style="font-size:22px;font-weight:700;color:#ffffff;">${submission.staff_name}</div>
      <div style="font-size:15px;color:rgba(255,255,255,0.85);margin-top:4px;">${statusLabel}${timeDetail ? ` · ${timeDetail}` : ''}</div>
    </div>

    <div style="padding:28px 32px;">
      ${isHrExcused ? `
        <div style="background:#f5f3ff;border:1px solid #ddd6fe;border-radius:8px;padding:16px;margin-bottom:20px;">
          <p style="margin:0;color:#5b21b6;font-weight:600;font-size:14px;">🔖 HR Excused — Logged by HR</p>
          <p style="margin:8px 0 0;color:#6d28d9;font-size:14px;">This absence was submitted by HR on behalf of the employee who did not call in.</p>
          ${submission.hr_note ? `<p style="margin:8px 0 0;color:#4c1d95;font-size:13px;font-style:italic;">Note: ${submission.hr_note}</p>` : ''}
        </div>
      ` : needsCoverage ? `
        <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin-bottom:20px;">
          <p style="margin:0;color:#991b1b;font-weight:600;font-size:14px;">⚠ Coverage may be needed for today.</p>
          <p style="margin:8px 0 0;color:#b91c1c;font-size:14px;">Please review your team's schedule and arrange coverage as needed.</p>
        </div>
      ` : ''}
      
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:8px 0;color:#6b7280;font-size:14px;width:140px;">Staff Member</td><td style="padding:8px 0;color:#111827;font-size:15px;font-weight:600;">${submission.staff_name}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;font-size:14px;">Status</td><td style="padding:8px 0;color:#111827;font-size:14px;font-weight:500;">${statusLabel}</td></tr>
        ${submission.position ? `<tr><td style="padding:8px 0;color:#6b7280;font-size:14px;">Position</td><td style="padding:8px 0;color:#111827;font-size:14px;">${submission.position}</td></tr>` : ''}
        ${submission.campus ? `<tr><td style="padding:8px 0;color:#6b7280;font-size:14px;">Campus</td><td style="padding:8px 0;color:#111827;font-size:14px;">${submission.campus}</td></tr>` : ''}
        ${timeDetail ? `<tr><td style="padding:8px 0;color:#6b7280;font-size:14px;">Time</td><td style="padding:8px 0;color:#111827;font-size:14px;font-weight:500;">${timeDetail}</td></tr>` : ''}
        ${submission.reason_category ? `<tr><td style="padding:8px 0;color:#6b7280;font-size:14px;">Reason</td><td style="padding:8px 0;color:#111827;font-size:14px;">${submission.reason_category.charAt(0).toUpperCase() + submission.reason_category.slice(1)}</td></tr>` : ''}
        ${submission.pto_remaining_after !== null && submission.pto_remaining_after !== undefined ? `<tr><td style="padding:8px 0;color:#6b7280;font-size:14px;">PTO Remaining</td><td style="padding:8px 0;color:#111827;font-size:14px;font-weight:600;">${submission.pto_remaining_after} hours</td></tr>` : ''}
        ${submission.notes ? `<tr><td style="padding:8px 0;color:#6b7280;font-size:14px;vertical-align:top;">Notes</td><td style="padding:8px 0;color:#374151;font-size:14px;font-style:italic;">"${submission.notes}"</td></tr>` : ''}
        ${submission.end_date ? `<tr><td style="padding:8px 0;color:#6b7280;font-size:14px;">Through</td><td style="padding:8px 0;color:#111827;font-size:14px;font-weight:500;">${submission.end_date}</td></tr>` : ''}
      </table>
      ${submission.lesson_plan_url ? `
        <div style="margin-top:20px;padding:16px;background:#eef2ff;border:1px solid #c7d2fe;border-radius:8px;">
          <p style="margin:0 0 8px;font-size:14px;font-weight:600;color:#3730a3;">📎 Lesson Plan Attached</p>
          <a href="${submission.lesson_plan_url}" style="display:inline-block;background:#4f46e5;color:#ffffff;font-size:14px;font-weight:600;padding:10px 20px;border-radius:6px;text-decoration:none;">Download Lesson Plan</a>
        </div>
      ` : ''}
    </div>

    <div style="background:#f9fafb;padding:16px 32px;border-top:1px solid #f3f4f6;">
      <p style="margin:0;font-size:12px;color:#9ca3af;">
        Sent by <strong>StaffOut</strong> · ${orgName} · Supervisor notification
      </p>
    </div>
  </div>
</body>
</html>`

  const text = [
    `SUPERVISOR NOTICE — ${orgName}`,
    ``,
    needsCoverage ? `⚠ ACTION NEEDED: Coverage may be required.` : '',
    ``,
    `Staff Member: ${submission.staff_name}`,
    `Status: ${statusLabel}`,
    submission.position ? `Position: ${submission.position}` : '',
    submission.campus ? `Campus: ${submission.campus}` : '',
    timeDetail ? `Time: ${timeDetail}` : '',
    submission.reason_category ? `Reason: ${submission.reason_category}` : '',
    submission.pto_remaining_after !== null && submission.pto_remaining_after !== undefined
      ? `PTO Remaining: ${submission.pto_remaining_after} hours`
      : '',
    submission.notes ? `Notes: "${submission.notes}"` : '',
  ]
    .filter(Boolean)
    .join('\n')

  return { subject, html, text }
}

// ── Weekly Attendance Report (Friday noon) ────────────────────────────────────

export interface DaySummary {
  label: string
  date: string
  absent: number
  late: number
  leaving: number
  personal: number
  total: number
}

export function buildWeeklyReportEmail(
  orgName: string,
  days: DaySummary[],
  weekLabel: string
): { subject: string; html: string; text: string } {
  const subject = `Weekly Attendance Report — ${orgName}`

  const totals = days.reduce(
    (acc, d) => ({
      absent: acc.absent + d.absent,
      late: acc.late + d.late,
      leaving: acc.leaving + d.leaving,
      personal: acc.personal + d.personal,
      total: acc.total + d.total,
    }),
    { absent: 0, late: 0, leaving: 0, personal: 0, total: 0 }
  )

  const tdH = `style="padding:10px 14px;font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#64748b;background:#f8fafc;border-bottom:2px solid #e2e8f0;text-align:center;"`
  const tdL = `style="padding:10px 14px;font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#64748b;background:#f8fafc;border-bottom:2px solid #e2e8f0;"`
  const tdCell = (val: number, color = '#0f172a') =>
    `<td style="padding:10px 14px;font-size:15px;font-weight:600;color:${val > 0 ? color : '#cbd5e1'};text-align:center;border-bottom:1px solid #f1f5f9;">${val > 0 ? val : '—'}</td>`
  const tdTot = (val: number) =>
    `<td style="padding:10px 14px;font-size:15px;font-weight:800;color:#0f172a;text-align:center;border-top:2px solid #e2e8f0;background:#f8fafc;">${val}</td>`

  const rows = days.map(d => `
    <tr>
      <td style="padding:10px 14px;font-size:14px;font-weight:600;color:#0f172a;border-bottom:1px solid #f1f5f9;">
        ${d.label}<br><span style="font-size:12px;font-weight:400;color:#94a3b8;">${d.date}</span>
      </td>
      ${tdCell(d.absent, '#dc2626')}
      ${tdCell(d.late, '#d97706')}
      ${tdCell(d.leaving, '#7c3aed')}
      ${tdCell(d.personal, '#0891b2')}
      ${tdCell(d.total)}
    </tr>`).join('')

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,sans-serif;">
  <div style="max-width:580px;margin:32px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

    <div style="background:#4f46e5;height:5px;"></div>

    <div style="background:#ffffff;padding:24px 32px 16px;border-bottom:1px solid #e2e8f0;">
      <div style="font-size:13px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#4f46e5;margin-bottom:4px;">
        StaffOut &middot; ${orgName}
      </div>
      <div style="font-size:20px;font-weight:800;color:#0f172a;line-height:1.3;">
        Weekly Attendance Report
      </div>
      <div style="font-size:14px;color:#64748b;margin-top:3px;">Week of ${weekLabel}</div>
    </div>

    <div style="padding:24px 32px;">
      <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
        <thead>
          <tr>
            <th ${tdL}>Day</th>
            <th ${tdH}>Absent</th>
            <th ${tdH}>Late</th>
            <th ${tdH}>Left Early</th>
            <th ${tdH}>Personal</th>
            <th ${tdH}>Total</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
          <tr>
            <td style="padding:10px 14px;font-size:14px;font-weight:800;color:#0f172a;border-top:2px solid #e2e8f0;background:#f8fafc;">Week Total</td>
            ${tdTot(totals.absent)}
            ${tdTot(totals.late)}
            ${tdTot(totals.leaving)}
            ${tdTot(totals.personal)}
            ${tdTot(totals.total)}
          </tr>
        </tbody>
      </table>
      <p style="margin:20px 0 0;font-size:13px;color:#64748b;line-height:1.6;">
        This report shows totals only. Individual details are available in your StaffOut dashboard.
      </p>
    </div>

    <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:14px 32px;">
      <p style="margin:0;font-size:12px;color:#94a3b8;">
        Sent automatically by <strong style="color:#64748b;">StaffOut</strong> every Friday &middot; Do not reply to this email.
      </p>
    </div>

  </div>
</body>
</html>`

  const textRows = days.map(d =>
    `${d.label.padEnd(12)} Absent:${String(d.absent).padStart(3)}  Late:${String(d.late).padStart(3)}  Early:${String(d.leaving).padStart(3)}  Personal:${String(d.personal).padStart(3)}  Total:${String(d.total).padStart(3)}`
  ).join('\n')

  const text = [
    `StaffOut · ${orgName} — Weekly Attendance Report`,
    `Week of ${weekLabel}`,
    ``,
    textRows,
    ``,
    `Week Total — Absent: ${totals.absent}  Late: ${totals.late}  Early: ${totals.leaving}  Personal: ${totals.personal}  Total: ${totals.total}`,
    ``,
    `Full details available in your StaffOut dashboard.`,
  ].join('\n')

  return { subject, html, text }
}
