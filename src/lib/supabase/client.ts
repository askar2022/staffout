import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: rootDomain
        ? { domain: `.${rootDomain}` }
        : undefined,
    }
  )
}
