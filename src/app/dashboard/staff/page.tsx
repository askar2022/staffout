import { createAdminClient } from '@/lib/supabase/admin'
import { getOrgId } from '@/lib/get-org-id'
import { Users } from 'lucide-react'
import type { StaffMember } from '@/lib/types'
import StaffManager from './StaffManager'

export default async function StaffPage() {
  const orgId = await getOrgId()
  const db = createAdminClient()

  const { data: staffMembers } = await db
    .from('staff_members')
    .select('*')
    .eq('organization_id', orgId)
    .order('full_name')

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-slate-500" />
            Staff Directory
          </h1>
          <p className="text-slate-500 text-sm mt-1">Manage your team. Add supervisor links for auto-routing.</p>
        </div>
      </div>

      <StaffManager initialStaff={(staffMembers ?? []) as StaffMember[]} orgId={orgId ?? ''} />
    </div>
  )
}
