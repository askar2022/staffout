import Script from 'next/script'
import { redirect } from 'next/navigation'
import { getIsPlatformAdminHostFromRequest, getOrgBySlug, getOrgSlugFromRequest } from '@/lib/get-org'
import LoginForm from './LoginForm'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/** Runs before React / Supabase client — stops refresh-token 429 storms from stale sb-* cookies */
const CLEAR_STALE_SUPABASE_AUTH = `
(function(){
  try {
    if (typeof localStorage !== 'undefined') {
      Object.keys(localStorage).forEach(function(k){
        if (k.indexOf('sb-') === 0) localStorage.removeItem(k);
      });
    }
    if (typeof sessionStorage !== 'undefined') {
      Object.keys(sessionStorage).forEach(function(k){
        if (k.indexOf('sb-') === 0) sessionStorage.removeItem(k);
      });
    }
    var hostname = typeof location !== 'undefined' ? location.hostname : '';
    var parts = hostname.split('.');
    var rootDomain = parts.length >= 3 ? '.' + parts.slice(-2).join('.') : '';
    document.cookie.split(';').forEach(function(c){
      c = c.trim();
      if (c.indexOf('sb-') !== 0) return;
      var eq = c.indexOf('=');
      var name = eq === -1 ? c : c.substring(0, eq);
      document.cookie = name + '=;Max-Age=0;path=/;SameSite=Lax';
      if (rootDomain) {
        document.cookie = name + '=;Max-Age=0;path=/;domain=' + rootDomain + ';SameSite=Lax';
      }
    });
  } catch (e) {}
})();
`

export default async function LoginPage() {
  const orgSlug = await getOrgSlugFromRequest()
  const isPlatformAdminHost = await getIsPlatformAdminHostFromRequest()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'outofshift.com'
  const platformAdminUrl = `https://admin.${rootDomain}`

  if (!orgSlug && !isPlatformAdminHost) {
    redirect(platformAdminUrl)
  }

  if (user?.email === process.env.SUPER_ADMIN_EMAIL && isPlatformAdminHost) {
    redirect('/dashboard')
  }

  if (user && isPlatformAdminHost) {
    const db = createAdminClient()
    const { data: profile } = await db
      .from('profiles')
      .select('organizations(slug)')
      .eq('id', user.id)
      .single()

    const org = profile?.organizations as unknown as { slug: string } | null
    if (org?.slug) {
      redirect(`https://${org.slug}.${rootDomain}/dashboard`)
    }
  }

  let orgName: string | null = null
  if (orgSlug) {
    const org = await getOrgBySlug(orgSlug)
    orgName = org?.name ?? null
  }

  return (
    <>
      <Script id="clear-stale-supabase-auth" strategy="beforeInteractive">
        {CLEAR_STALE_SUPABASE_AUTH}
      </Script>
      <LoginForm orgName={orgName} orgSlug={orgSlug} isPlatformAdminHost={isPlatformAdminHost} />
    </>
  )
}
