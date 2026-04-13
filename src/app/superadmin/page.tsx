import { redirect } from 'next/navigation'

export default function SuperAdminRedirectPage() {
  redirect('/dashboard')
}
