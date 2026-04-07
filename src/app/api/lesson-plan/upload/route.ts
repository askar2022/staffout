import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { apiError, apiOk } from '@/lib/auth'

const MAX_SIZE = 10 * 1024 * 1024 // 10 MB
const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
]

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const orgId = formData.get('org_id') as string | null

    if (!file) return apiError('No file provided')
    if (!orgId) return apiError('Missing org_id')
    if (file.size > MAX_SIZE) return apiError('File too large (max 10 MB)')
    if (!ALLOWED_TYPES.includes(file.type)) return apiError('Invalid file type. Use PDF, Word, or image.')

    const db = createAdminClient()
    const ext = file.name.split('.').pop() ?? 'pdf'
    const path = `${orgId}/${crypto.randomUUID()}.${ext}`

    const { error } = await db.storage
      .from('lesson-plans')
      .upload(path, await file.arrayBuffer(), {
        contentType: file.type,
        upsert: false,
      })

    if (error) return apiError('Upload failed: ' + error.message, 500)

    const { data: { publicUrl } } = db.storage
      .from('lesson-plans')
      .getPublicUrl(path)

    return apiOk({ url: publicUrl })
  } catch {
    return apiError('Server error', 500)
  }
}
