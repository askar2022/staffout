import { getOrgBySlug, getOrgSlugFromRequest } from '@/lib/get-org'
import SetupForm from './SetupForm'

export default async function SetupPage() {
  const orgSlug = await getOrgSlugFromRequest()

  let orgName: string | null = null
  if (orgSlug) {
    const org = await getOrgBySlug(orgSlug)
    orgName = org?.name ?? null
  }

  return <SetupForm orgName={orgName} />
}
