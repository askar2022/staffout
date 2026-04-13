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

  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'outofshift.com'
  const isPlatformAdmin = user.email === process.env.SUPER_ADMIN_EMAIL
  const cookieStore = await cookies()
  const headersList = await headers()
  const currentSlug = headersList.get('x-org-slug')
  const isPlatformAdminHost = headersList.get('x-platform-admin-host') === '1'
  const isRootDomain = !currentSlug && !isPlatformAdminHost
  const impersonateOrgId = isPlatformAdmin
    ? cookieStore.get('sa_impersonate_org')?.value ?? null
    : null

  const db = createAdminClient()

  let orgName: string
  let orgSlug: string
  let orgStatus: string

  if (impersonateOrgId) {
    const { data: org } = await db
      .from('organizations')
      .select('id, name, slug, status')
      .eq('id', impersonateOrgId)
      .single()

    if (!org) redirect('/dashboard')

    orgName = org.name
    orgSlug = org.slug
    orgStatus = org.status

    if (currentSlug !== orgSlug) {
      redirect(`https://${orgSlug}.${rootDomain}/dashboard`)
    }
  } else {
    const { data: profile } = await db
      .from('profiles')
      .select('organization_id, organizations(name, slug, status)')
      .eq('id', user.id)
      .single()

    if (isPlatformAdmin && isPlatformAdminHost) {
      return (
        <div className="min-h-screen bg-slate-50">
          {children}
        </div>
      )
    }

    if (!profile?.organization_id) redirect('/setup')

    const org = (profile?.organizations as unknown) as { name: string; slug: string; status: string } | null

    if (org?.status === 'pending') redirect('/pending')
    if (org?.status === 'rejected') redirect('/rejected')

    orgName = org?.name ?? 'My School'
    orgSlug = org?.slug ?? ''
    orgStatus = org?.status ?? 'approved'

    if ((isRootDomain || isPlatformAdminHost) && orgSlug) {
      redirect(`https://${orgSlug}.${rootDomain}/dashboard`)
    }
  }

  if (orgStatus === 'pending') redirect('/pending')
  if (orgStatus === 'rejected') redirect('/rejected')

  if (orgSlug && currentSlug !== orgSlug) {
    redirect(`https://${orgSlug}.${rootDomain}/dashboard`)
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <DashboardSidebar orgName={orgName} userEmail={user.email ?? ''} />
      <main className="flex-1 overflow-y-auto dashboard-main">
        {impersonateOrgId && (
          <SchoolSwitcherBanner orgName={orgName} />
        )}
        {children}
      </main>
    </div>
  )
}
