import { createAdminClient } from '@/lib/supabase/admin'

type AdminClient = ReturnType<typeof createAdminClient>

/** Optional umbrella sites always offered on submit (must match `staff_members.campus` for that site). */
export const SUBMIT_CAMPUS_EXTRAS_BY_ORG_SLUG: Record<string, readonly string[]> = {
  hba: ['HBA', 'SPA', 'WVA'],
}

/** Union of directory campuses and canonical extras for an org slug (sorted, deduped). */
export function mergeSubmitCampusOptions(orgSlug: string | null, fromStaff: string[]): string[] {
  const extras = orgSlug ? (SUBMIT_CAMPUS_EXTRAS_BY_ORG_SLUG[orgSlug] ?? []) : []
  const set = new Set<string>()
  for (const c of [...extras, ...fromStaff]) {
    const t = typeof c === 'string' ? c.trim() : ''
    if (t) set.add(t)
  }
  return [...set].sort((a, b) => a.localeCompare(b))
}

export async function getSubmitCampusOptions(
  db: AdminClient,
  organizationId: string,
  orgSlug: string | null
): Promise<string[]> {
  const fromStaff = await getActiveOrgCampuses(db, organizationId)
  return mergeSubmitCampusOptions(orgSlug, fromStaff)
}

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
