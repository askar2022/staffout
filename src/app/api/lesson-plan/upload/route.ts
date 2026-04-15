import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { apiError, apiOk, isValidEmail, normalizeWorkEmail, sanitize } from '@/lib/auth'

const MAX_SIZE = 10 * 1024 * 1024 // 10 MB
const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
]
const FILE_EXTENSIONS: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'image/jpeg': 'jpg',
  'image/png': 'png',
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const email = normalizeWorkEmail(sanitize(formData.get('email'), 200))
    const orgSlug = request.headers.get('x-org-slug')

    if (!file) return apiError('No file provided')
    if (!email || !isValidEmail(email)) return apiError('Valid email is required', 400)
    if (!orgSlug) return apiError('Lesson plan uploads must come from a school submit page.', 403)
    if (file.size > MAX_SIZE) return apiError('File too large (max 10 MB)')
    if (!ALLOWED_TYPES.includes(file.type)) return apiError('Invalid file type. Use PDF, Word, or image.')

    const db = createAdminClient()
    const { data: org } = await db
      .from('organizations')
      .select('id')
      .eq('slug', orgSlug)
      .eq('status', 'approved')
      .single()

    if (!org) return apiError('School not found or inactive.', 404)

    const { data: otpRows } = await db
      .from('otp_codes')
      .select('id')
      .eq('email', email)
      .eq('organization_id', org.id)
      .eq('used', true)
      .gt('expires_at', new Date().toISOString())
      .limit(1)

    if (!otpRows?.length) {
      return apiError('Please verify your email again before uploading a lesson plan.', 403)
    }

    const ext = FILE_EXTENSIONS[file.type] ?? 'bin'
    const path = `${org.id}/${crypto.randomUUID()}.${ext}`

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
