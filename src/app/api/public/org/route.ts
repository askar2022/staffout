import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { apiError, apiOk } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug')
  if (!slug) return apiError('slug is required', 400)

  const db = createAdminClient()
  const { data: org } = await db
    .from('organizations')
    .select('id, name, slug, status')
    .eq('slug', slug)
    .single()

  if (!org || org.status !== 'approved') {
    return apiError('Organization not found', 404)
  }

  return apiOk({ id: org.id, name: org.name, slug: org.slug })
}
