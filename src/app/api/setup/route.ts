import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sanitize, isValidEmail, apiError, apiOk } from '@/lib/auth'
import { sendEmail } from '@/lib/email/resend'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) return apiError('Unauthorized', 401)

    const body = await request.json()

    const name = sanitize(body.name, 150)
    if (!name) return apiError('School name is required')

    const adminName = sanitize(body.admin_name, 100)
    const contactEmail = sanitize(body.contact_email, 200)
    if (contactEmail && !isValidEmail(contactEmail)) return apiError('Invalid contact email')

    const db = createAdminClient()

    // Prevent double setup
    const { data: existingProfile } = await db
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (existingProfile?.organization_id) {
      return apiError('This account already has a school set up', 400)
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')

    const { data: org, error: orgError } = await db
      .from('organizations')
      .insert({
        name,
        slug: `${slug}-${Date.now()}`,
        contact_email: contactEmail || user.email,
        reply_to_email: contactEmail || user.email,
        status: 'pending',
      })
      .select()
      .single()

    if (orgError || !org) return apiError('Failed to create organization', 500)

    await db
      .from('profiles')
      .update({ organization_id: org.id, full_name: adminName || null })
      .eq('id', user.id)

    await db.from('notification_recipients').insert({
      organization_id: org.id,
      name: adminName || 'Administrator',
      email: user.email!,
      type: 'admin',
      receives_summary: true,
      receives_instant: true,
    })

    // Notify super admin about new signup
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://outofshift.com'
    if (superAdminEmail) {
      await sendEmail({
        to: [superAdminEmail],
        subject: `New signup — ${name} is waiting for approval`,
        html: `
          <div style="font-family:sans-serif;max-width:500px;margin:32px auto;background:#fff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">
            <div style="background:#4f46e5;padding:24px 32px;">
              <div style="color:#fff;font-size:20px;font-weight:700;">New School Signup</div>
              <div style="color:#c7d2fe;font-size:14px;margin-top:4px;">Waiting for your approval</div>
            </div>
            <div style="padding:28px 32px;">
              <table style="width:100%;border-collapse:collapse;">
                <tr><td style="padding:8px 0;color:#6b7280;font-size:14px;width:120px;">School</td><td style="padding:8px 0;color:#111827;font-size:14px;font-weight:600;">${name}</td></tr>
                <tr><td style="padding:8px 0;color:#6b7280;font-size:14px;">Admin</td><td style="padding:8px 0;color:#111827;font-size:14px;">${adminName || 'Not provided'}</td></tr>
                <tr><td style="padding:8px 0;color:#6b7280;font-size:14px;">Email</td><td style="padding:8px 0;color:#111827;font-size:14px;">${user.email}</td></tr>
              </table>
              <div style="margin-top:24px;display:flex;gap:12px;">
                <a href="${appUrl}/superadmin" style="display:inline-block;background:#4f46e5;color:#fff;font-weight:600;font-size:14px;padding:10px 20px;border-radius:8px;text-decoration:none;">
                  Review in Super Admin →
                </a>
              </div>
            </div>
          </div>`,
        text: `New signup: ${name} (${user.email}) is waiting for approval.\n\nReview at: ${appUrl}/superadmin`,
      })
    }

    return apiOk({ success: true, org_id: org.id, status: 'pending' }, 201)
  } catch {
    return apiError('Server error', 500)
  }
}
