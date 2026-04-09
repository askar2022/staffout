import Script from 'next/script'
import { getOrgBySlug, getOrgSlugFromRequest } from '@/lib/get-org'
import LoginForm from './LoginForm'

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
      <LoginForm orgName={orgName} orgSlug={orgSlug} />
    </>
  )
}
