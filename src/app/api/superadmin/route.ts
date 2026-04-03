import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { apiError, apiOk } from '@/lib/auth'
import { sendEmail } from '@/lib/email/resend'

async function requireSuperAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL
  if (!superAdminEmail || user.email !== superAdminEmail) {
    throw new Error('Forbidden')
  }
  return user
}

// GET — list all organizations
export async function GET() {
  try {
    await requireSuperAdmin()
    const db = createAdminClient()

    const { data, error } = await db
      .from('organizations')
      .select('id, name, slug, contact_email, status, created_at')
      .order('created_at', { ascending: false })

    if (error) return apiError('Failed to load organizations', 500)
    return apiOk({ organizations: data ?? [] })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error'
    return apiError(msg, msg === 'Forbidden' ? 403 : 401)
  }
}

// POST — create an organization directly (super admin only, auto-approved)
export async function POST(request: NextRequest) {
  try {
    await requireSuperAdmin()
    const body = await request.json()
    const { name, slug, contact_email } = body

    if (!name || !slug) return apiError('name and slug are required')

    const clean = slug.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '')
    if (!clean) return apiError('Invalid slug')

    const RESERVED = ['www', 'api', 'mail', 'admin', 'support']
    if (RESERVED.includes(clean)) return apiError(`"${clean}" is a reserved subdomain`)

    const db = createAdminClient()

    const { data: existing } = await db
      .from('organizations')
      .select('id')
      .eq('slug', clean)
      .single()

    if (existing) return apiError(`The subdomain "${clean}" is already taken`)

    const { data: org, error } = await db
      .from('organizations')
      .insert({
        name: name.trim(),
        slug: clean,
        contact_email: contact_email || null,
        reply_to_email: contact_email || null,
        status: 'approved',
      })
      .select('id, name, slug, contact_email, status, created_at')
      .single()

    if (error || !org) return apiError('Failed to create organization', 500)

    return apiOk({ org }, 201)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error'
    return apiError(msg, msg === 'Forbidden' ? 403 : 401)
  }
}

// PATCH — approve or reject an organization
export async function PATCH(request: NextRequest) {
  try {
    await requireSuperAdmin()
    const body = await request.json()
    const { org_id, action } = body

    if (!org_id || !['approved', 'rejected'].includes(action)) {
      return apiError('Invalid request')
    }

    const db = createAdminClient()

    const { data: org, error } = await db
      .from('organizations')
      .update({ status: action })
      .eq('id', org_id)
      .select('name, slug, contact_email')
      .single()

    if (error || !org) return apiError('Failed to update organization', 500)

    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'outofshift.com'
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${rootDomain}`
    const schoolUrl = org.slug ? `https://${org.slug}.${rootDomain}` : appUrl

    if (org.contact_email) {
      if (action === 'approved') {
        await sendEmail({
          to: [org.contact_email],
          subject: 'Your StaffOut account has been approved',
          html: `
            <div style="font-family:sans-serif;max-width:500px;margin:32px auto;background:#fff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">
              <div style="background:#16a34a;padding:24px 32px;">
                <div style="color:#fff;font-size:20px;font-weight:700;">You're approved!</div>
                <div style="color:#bbf7d0;font-size:14px;margin-top:4px;">Your StaffOut account is now active</div>
              </div>
              <div style="padding:28px 32px;">
                <p style="color:#374151;font-size:15px;margin:0 0 12px;">
                  Hi! Your account for <strong>${org.name}</strong> has been approved.
                </p>
                ${org.slug ? `
                <p style="color:#374151;font-size:15px;margin:0 0 20px;">
                  Your school's URL is:<br>
                  <a href="${schoolUrl}" style="color:#4f46e5;font-weight:600;">${schoolUrl}</a>
                </p>` : ''}
                <a href="${schoolUrl}/login" style="display:inline-block;background:#4f46e5;color:#fff;font-weight:600;font-size:14px;padding:12px 24px;border-radius:8px;text-decoration:none;">
                  Sign in to your dashboard →
                </a>
              </div>
            </div>`,
          text: `Your StaffOut account for ${org.name} has been approved.\n\nSign in at: ${schoolUrl}/login`,
        })
      } else {
        await sendEmail({
          to: [org.contact_email],
          subject: 'Update on your StaffOut application',
          html: `
            <div style="font-family:sans-serif;max-width:500px;margin:32px auto;padding:32px;">
              <p>Your application for <strong>${org.name}</strong> was not approved at this time.</p>
              <p>Please contact <a href="mailto:support@outofshift.com">support@outofshift.com</a> for more information.</p>
            </div>`,
          text: `Your StaffOut application for ${org.name} was not approved. Contact support@outofshift.com for help.`,
        })
      }
    }

    return apiOk({ success: true, org_id, action })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error'
    return apiError(msg, msg === 'Forbidden' ? 403 : 401)
  }
}

// PUT — update an organization's subdomain slug
export async function PUT(request: NextRequest) {
  try {
    await requireSuperAdmin()
    const body = await request.json()
    const { org_id, slug } = body

    if (!org_id || !slug) return apiError('org_id and slug are required')

    const clean = slug.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '')
    if (!clean) return apiError('Invalid slug')

    const RESERVED = ['www', 'api', 'mail', 'admin', 'support', 'demo']
    if (RESERVED.includes(clean)) return apiError(`"${clean}" is a reserved subdomain`)

    const db = createAdminClient()

    // Check for conflicts
    const { data: existing } = await db
      .from('organizations')
      .select('id')
      .eq('slug', clean)
      .neq('id', org_id)
      .single()

    if (existing) return apiError(`The subdomain "${clean}" is already taken`)

    const { error } = await db
      .from('organizations')
      .update({ slug: clean })
      .eq('id', org_id)

    if (error) return apiError('Failed to update slug', 500)

    return apiOk({ success: true, slug: clean })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error'
    return apiError(msg, msg === 'Forbidden' ? 403 : 401)
  }
}
