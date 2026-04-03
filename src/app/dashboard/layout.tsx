import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { cookies, headers } from 'next/headers'
import DashboardSidebar from './DashboardSidebar'
import SchoolSwitcherBanner from './SchoolSwitcherBanner'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const isSuperAdmin = user.email === process.env.SUPER_ADMIN_EMAIL
  const cookieStore = await cookies()
  const impersonateOrgId = isSuperAdmin
    ? cookieStore.get('sa_impersonate_org')?.value ?? null
    : null

  const db = createAdminClient()

  let orgId: string
  let orgName: string
  let orgSlug: string
  let orgStatus: string

  if (impersonateOrgId) {
    const { data: org } = await db
      .from('organizations')
      .select('id, name, slug, status')
      .eq('id', impersonateOrgId)
      .single()

    if (!org) redirect('/superadmin')

    orgId = org.id
    orgName = org.name
    orgSlug = org.slug
    orgStatus = org.status
  } else {
    const { data: profile } = await db
      .from('profiles')
      .select('organization_id, organizations(name, slug, status)')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) redirect('/setup')

    const org = (profile?.organizations as unknown) as { name: string; slug: string; status: string } | null

    if (org?.status === 'pending') redirect('/pending')
    if (org?.status === 'rejected') redirect('/rejected')

    orgId = profile.organization_id
    orgName = org?.name ?? 'My School'
    orgSlug = org?.slug ?? ''
    orgStatus = org?.status ?? 'approved'
  }

  if (orgStatus === 'pending') redirect('/pending')
  if (orgStatus === 'rejected') redirect('/rejected')

  // Validate the user is on the correct subdomain.
  // If they're on hba.outofshift.com but they belong to spa, redirect them.
  if (!isSuperAdmin && orgSlug) {
    const headersList = await headers()
    const currentSlug = headersList.get('x-org-slug')

    if (currentSlug && currentSlug !== orgSlug) {
      const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'outofshift.com'
      redirect(`https://${orgSlug}.${rootDomain}/dashboard`)
    }
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <DashboardSidebar orgName={orgName} userEmail={user.email ?? ''} />
      <main className="flex-1 overflow-y-auto dashboard-main">
        {impersonateOrgId && (
          <SchoolSwitcherBanner orgName={orgName} orgId={orgId} />
        )}
        {children}
      </main>
    </div>
  )
}
