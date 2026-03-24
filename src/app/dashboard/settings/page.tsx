import { createClient } from '@/lib/supabase/server'
import { Settings } from 'lucide-react'
import type { NotificationRecipient, Organization } from '@/lib/types'
import SettingsForm from './SettingsForm'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user!.id)
    .single()

  const orgId = profile?.organization_id

  const db = await import('@/lib/supabase/admin').then(m => m.createAdminClient())

  const [{ data: org }, { data: recipients }] = await Promise.all([
    db.from('organizations').select('*').eq('id', orgId).single(),
    db.from('notification_recipients').select('*').eq('organization_id', orgId).order('created_at'),
  ])

  const submitToken = (org as Organization & { submit_token?: string })?.submit_token ?? ''

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Settings className="w-6 h-6 text-slate-500" />
          Settings
        </h1>
        <p className="text-slate-500 text-sm mt-1">Configure your school's notification preferences.</p>
      </div>

      <SettingsForm
        org={org as Organization}
        initialRecipients={(recipients ?? []) as NotificationRecipient[]}
        orgId={orgId ?? ''}
        submitToken={submitToken}
      />
    </div>
  )
}
