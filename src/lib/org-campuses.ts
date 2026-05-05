import { createAdminClient } from '@/lib/supabase/admin'

type AdminClient = ReturnType<typeof createAdminClient>

/** Distinct non-null campus values for active staff (sorted); labels must match `staff_members.campus` exactly. */
export async function getActiveOrgCampuses(db: AdminClient, organizationId: string): Promise<string[]> {
  const { data } = await db
    .from('staff_members')
    .select('campus')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .not('campus', 'is', null)

  const set = new Set<string>()
  for (const row of data ?? []) {
    const c = row.campus
    if (typeof c === 'string' && c.trim()) set.add(c.trim())
  }
  return [...set].sort((a, b) => a.localeCompare(b))
}
