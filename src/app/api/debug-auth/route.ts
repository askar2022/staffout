import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL

  return Response.json({
    loggedIn: !!user,
    email: user?.email ?? null,
    superAdminEmail: superAdminEmail ?? null,
    match: user?.email === superAdminEmail,
  })
}
