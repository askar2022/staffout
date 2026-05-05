import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { apiError, apiOk } from '@/lib/auth'
import { getSubmitCampusOptions } from '@/lib/org-campuses'

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug')
  if (!slug) return apiError('slug is required', 400)

  const db = createAdminClient()
  const { data: org } = await db.from('organizations').select('id, status').eq('slug', slug).single()

  if (!org || org.status !== 'approved') {
    return apiError('Organization not found', 404)
  }

  const campuses = await getSubmitCampusOptions(db, org.id, slug)
  return apiOk({ campuses })
}
