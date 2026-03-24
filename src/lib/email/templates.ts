import { Submission, STATUS_LABELS } from '@/lib/types'
import { format } from 'date-fns'

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
  const dateStr = format(date, 'EEEE, MMMM d, yyyy')

  const absent = submissions.filter((s) => s.status === 'absent' || s.status === 'personal_day')
  const late = submissions.filter((s) => s.status === 'late')
  const leavingEarly = submissions.filter((s) => s.status === 'leaving_early' || s.status === 'appointment')

  const subject = `Staff Attendance Alert — ${dateStr}`

  const rows = (items: Submission[], label: string) => {
    if (!items.length) return ''
    return `
      <tr>
        <td colspan="2" style="padding: 18px 0 6px; font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #6b7280; border-top: 1px solid #f3f4f6;">
          ${label}
        </td>
      </tr>
      ${items
        .map(
          (s) => `
        <tr>
          <td style="padding: 8px 0; font-size: 15px; color: #111827; font-weight: 500;">${s.staff_name}${s.campus ? ` <span style="color:#6b7280;font-size:13px;">(${s.campus})</span>` : ''}</td>
          <td style="padding: 8px 0; font-size: 14px; color: #6b7280; text-align: right;">${
            s.status === 'late' && s.expected_arrival
              ? `Arriving ${s.expected_arrival}`
              : s.status === 'leaving_early' && s.leave_time
              ? `Leaving ${s.leave_time}`
              : s.status === 'appointment' && s.leave_time
              ? `Off campus ${s.leave_time}`
              : STATUS_LABELS[s.status]
          }</td>
        </tr>`
        )
        .join('')}
    `
  }

  const hasAny = absent.length + late.length + leavingEarly.length > 0

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:32px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    
    <div style="background:#4f46e5;padding:28px 32px;">
      <div style="font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#c7d2fe;margin-bottom:4px;">Morning Attendance Summary</div>
      <div style="font-size:22px;font-weight:700;color:#ffffff;">${orgName}</div>
      <div style="font-size:14px;color:#a5b4fc;margin-top:4px;">${dateStr}</div>
    </div>

    <div style="padding:28px 32px;">
      ${
        !hasAny
          ? `<p style="color:#16a34a;font-size:16px;font-weight:500;margin:0;">✓ All staff present today. No absences reported.</p>`
          : `
        <p style="color:#374151;font-size:15px;margin:0 0 20px;">The following staff members have reported changes today:</p>
        <table style="width:100%;border-collapse:collapse;">
          ${rows(absent, 'Absent / Personal Day')}
          ${rows(late, 'Late Arrivals')}
          ${rows(leavingEarly, 'Leaving Early / Off Campus')}
        </table>
        `
      }
    </div>

    <div style="background:#f9fafb;padding:16px 32px;border-top:1px solid #f3f4f6;">
      <p style="margin:0;font-size:12px;color:#9ca3af;">
        Sent by <strong>StaffOut</strong> · ${orgName} · This is an automated message.
      </p>
    </div>
  </div>
</body>
</html>`

  const textLines = [`STAFF ATTENDANCE — ${dateStr}`, `${orgName}`, ``]
  if (!hasAny) {
    textLines.push('All staff present today.')
  } else {
    if (absent.length) {
      textLines.push('ABSENT / PERSONAL DAY:')
      absent.forEach((s) => textLines.push(`  - ${statusLine(s)}`))
      textLines.push('')
    }
    if (late.length) {
      textLines.push('LATE ARRIVALS:')
      late.forEach((s) => textLines.push(`  - ${statusLine(s)}`))
      textLines.push('')
    }
    if (leavingEarly.length) {
      textLines.push('LEAVING EARLY / OFF CAMPUS:')
      leavingEarly.forEach((s) => textLines.push(`  - ${statusLine(s)}`))
    }
  }

  return { subject, html, text: textLines.join('\n') }
}

// ── Instant Alert ─────────────────────────────────────────────────────────────

export function buildInstantEmail(
  orgName: string,
  submission: Submission
): { subject: string; html: string; text: string } {
  const timeStr = format(new Date(submission.submitted_at), 'h:mm a')
  const statusLabel = STATUS_LABELS[submission.status]

  let detail = ''
  if (submission.status === 'late' && submission.expected_arrival) {
    detail = `Expected arrival: <strong>${submission.expected_arrival}</strong>`
  } else if (submission.status === 'leaving_early' && submission.leave_time) {
    detail = `Leaving at: <strong>${submission.leave_time}</strong>`
  } else if (submission.status === 'appointment' && submission.leave_time) {
    detail = `Off campus at: <strong>${submission.leave_time}</strong>`
  }

  const subject = `Staff Update — ${submission.staff_name} · ${statusLabel}`

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:32px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    
    <div style="background:#0f172a;padding:28px 32px;">
      <div style="font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#64748b;margin-bottom:4px;">Live Update · ${timeStr}</div>
      <div style="font-size:22px;font-weight:700;color:#ffffff;">${submission.staff_name}</div>
      <div style="margin-top:8px;display:inline-block;background:#4f46e5;color:#fff;font-size:13px;font-weight:600;padding:4px 12px;border-radius:20px;">${statusLabel}</div>
    </div>

    <div style="padding:28px 32px;">
      <table style="width:100%;border-collapse:collapse;">
        ${submission.position ? `<tr><td style="padding:8px 0;color:#6b7280;font-size:14px;width:140px;">Position</td><td style="padding:8px 0;color:#111827;font-size:14px;font-weight:500;">${submission.position}</td></tr>` : ''}
        ${submission.campus ? `<tr><td style="padding:8px 0;color:#6b7280;font-size:14px;">Campus / Site</td><td style="padding:8px 0;color:#111827;font-size:14px;font-weight:500;">${submission.campus}</td></tr>` : ''}
        ${detail ? `<tr><td style="padding:8px 0;color:#6b7280;font-size:14px;">Time</td><td style="padding:8px 0;color:#111827;font-size:14px;font-weight:500;">${detail}</td></tr>` : ''}
      </table>
    </div>

    <div style="background:#f9fafb;padding:16px 32px;border-top:1px solid #f3f4f6;">
      <p style="margin:0;font-size:12px;color:#9ca3af;">
        Sent by <strong>StaffOut</strong> · ${orgName} · Submitted at ${timeStr}
      </p>
    </div>
  </div>
</body>
</html>`

  const text = [
    `STAFF UPDATE — ${orgName}`,
    ``,
    `${submission.staff_name} · ${statusLabel}`,
    detail ? detail.replace(/<[^>]+>/g, '') : '',
    submission.position ? `Position: ${submission.position}` : '',
    submission.campus ? `Campus: ${submission.campus}` : '',
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

  let timeDetail = ''
  if (submission.status === 'late' && submission.expected_arrival) {
    timeDetail = submission.expected_arrival
  } else if ((submission.status === 'leaving_early' || submission.status === 'appointment') && submission.leave_time) {
    timeDetail = submission.leave_time
  }

  const subject = needsCoverage
    ? `Action Needed — Coverage Required for ${submission.staff_name}`
    : `Staff Notice — ${submission.staff_name} · ${statusLabel}`

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:32px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    
    <div style="background:${needsCoverage ? '#dc2626' : '#d97706'};padding:28px 32px;">
      <div style="font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:rgba(255,255,255,0.7);margin-bottom:4px;">
        ${needsCoverage ? 'Action Required — Supervisor Notice' : 'Supervisor Notice'}
      </div>
      <div style="font-size:22px;font-weight:700;color:#ffffff;">${submission.staff_name}</div>
      <div style="font-size:15px;color:rgba(255,255,255,0.85);margin-top:4px;">${statusLabel}${timeDetail ? ` · ${timeDetail}` : ''}</div>
    </div>

    <div style="padding:28px 32px;">
      ${needsCoverage ? `
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
        ${submission.notes ? `<tr><td style="padding:8px 0;color:#6b7280;font-size:14px;vertical-align:top;">Notes</td><td style="padding:8px 0;color:#374151;font-size:14px;font-style:italic;">"${submission.notes}"</td></tr>` : ''}
      </table>
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
    submission.notes ? `Notes: "${submission.notes}"` : '',
  ]
    .filter(Boolean)
    .join('\n')

  return { subject, html, text }
}
