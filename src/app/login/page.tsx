import { getOrgBySlug, getOrgSlugFromRequest } from '@/lib/get-org'
import LoginForm from './LoginForm'

export default async function LoginPage() {
  const orgSlug = await getOrgSlugFromRequest()

  let orgName: string | null = null
  if (orgSlug) {
    const org = await getOrgBySlug(orgSlug)
    orgName = org?.name ?? null
  }

  return <LoginForm orgName={orgName} orgSlug={orgSlug} />
}
