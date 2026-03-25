import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Get the correct organization ID for the current user.
 * If the super admin is impersonating a school, returns that school's org ID.
 * Otherwise returns the logged-in user's own org ID.
 */
export async function getOrgId(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Super admin impersonation
  if (user.email === process.env.SUPER_ADMIN_EMAIL) {
    const cookieStore = await cookies()
    const impersonateOrgId = cookieStore.get('sa_impersonate_org')?.value
    if (impersonateOrgId) return impersonateOrgId
  }

  // Normal user — get from profile
  const db = createAdminClient()
  const { data: profile } = await db
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  return profile?.organization_id ?? null
}
