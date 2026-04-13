import { createAdminClient } from '@/lib/supabase/admin'
import { headers } from 'next/headers'

export interface OrgInfo {
  id: string
  name: string
  slug: string
  status: string
}

/** Look up an organization by its subdomain slug. */
export async function getOrgBySlug(slug: string): Promise<OrgInfo | null> {
  const db = createAdminClient()
  const { data } = await db
    .from('organizations')
    .select('id, name, slug, status')
    .eq('slug', slug)
    .single()
  return data ?? null
}

/**
 * Read the org slug injected by middleware into the request headers.
 * Returns null on the root domain (no subdomain).
 * Server-only — uses next/headers.
 */
export async function getOrgSlugFromRequest(): Promise<string | null> {
  const headersList = await headers()
  return headersList.get('x-org-slug')
}

export async function getIsPlatformAdminHostFromRequest(): Promise<boolean> {
  const headersList = await headers()
  return headersList.get('x-platform-admin-host') === '1'
}
