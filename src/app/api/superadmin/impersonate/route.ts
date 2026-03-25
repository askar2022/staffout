import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { apiError } from '@/lib/auth'

// POST — set which org the super admin is managing
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.email !== process.env.SUPER_ADMIN_EMAIL) {
    return apiError('Forbidden', 403)
  }

  const { org_id } = await request.json()

  // Validate org exists
  const db = createAdminClient()
  const { data: org } = await db
    .from('organizations')
    .select('id, name')
    .eq('id', org_id)
    .single()

  if (!org) return apiError('Organization not found', 404)

  const response = NextResponse.json({ success: true, org })
  response.cookies.set('sa_impersonate_org', org_id, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 8, // 8 hours
    path: '/',
  })
  return response
}

// DELETE — clear impersonation (go back to super admin view)
export async function DELETE() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.email !== process.env.SUPER_ADMIN_EMAIL) {
    return apiError('Forbidden', 403)
  }

  const response = NextResponse.json({ success: true })
  response.cookies.delete('sa_impersonate_org')
  return response
}
