import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import DashboardSidebar from './DashboardSidebar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const db = createAdminClient()
  const { data: profile } = await db
    .from('profiles')
    .select('organization_id, organizations(name, status)')
    .eq('id', user.id)
    .single()

  if (!profile?.organization_id) redirect('/setup')

  const org = (profile?.organizations as unknown) as { name: string; status: string } | null

  // Block pending/rejected orgs from accessing the dashboard
  if (org?.status === 'pending') redirect('/pending')
  if (org?.status === 'rejected') redirect('/rejected')

  const orgName = org?.name ?? 'My School'

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <DashboardSidebar orgName={orgName} userEmail={user.email ?? ''} />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
