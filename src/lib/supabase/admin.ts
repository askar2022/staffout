import { createClient } from '@supabase/supabase-js'

/**
 * Server-only admin client using the Service Role Key.
 * This bypasses Row Level Security and has full DB access.
 * NEVER import this file in any client component or expose it to the browser.
 * The SUPABASE_SERVICE_ROLE_KEY env var intentionally has no NEXT_PUBLIC_ prefix.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('Missing Supabase admin credentials. Check SUPABASE_SERVICE_ROLE_KEY in your environment.')
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
