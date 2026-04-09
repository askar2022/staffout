import { createAdminClient } from '@/lib/supabase/admin'
import { getOrgId } from '@/lib/get-org-id'
import { Users } from 'lucide-react'
import type { StaffMember } from '@/lib/types'
import StaffManager from './StaffManager'

export default async function StaffPage() {
  const orgId = await getOrgId()
  const db = createAdminClient()

  const [{ data: staffMembers }, { data: ptoRows }] = await Promise.all([
    db
      .from('staff_members')
      .select('*')
      .eq('organization_id', orgId)
      .order('full_name'),
    db
      .from('submissions')
      .select('staff_id, pto_hours_deducted')
      .eq('organization_id', orgId)
      .not('pto_hours_deducted', 'is', null),
  ])

  const ptoUsedByStaff = new Map<string, number>()
  for (const row of ptoRows ?? []) {
    if (!row.staff_id) continue
    ptoUsedByStaff.set(
      row.staff_id,
      (ptoUsedByStaff.get(row.staff_id) ?? 0) + (row.pto_hours_deducted ?? 0)
    )
  }

  const staffWithPto = ((staffMembers ?? []) as StaffMember[]).map((member) => {
    const used = ptoUsedByStaff.get(member.id) ?? 0
    return {
      ...member,
      pto_used: used,
      pto_remaining:
        member.pto_balance !== null && member.pto_balance !== undefined
          ? member.pto_balance - used
          : null,
    }
  })

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

      <StaffManager initialStaff={staffWithPto} orgId={orgId ?? ''} />
    </div>
  )
}
