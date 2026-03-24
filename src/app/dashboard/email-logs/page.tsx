import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import { Mail, CheckCircle, XCircle } from 'lucide-react'

export default async function EmailLogsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user!.id)
    .single()

  const { data: logs } = await supabase
    .from('email_logs')
    .select('*')
    .eq('organization_id', profile?.organization_id)
    .order('sent_at', { ascending: false })
    .limit(100)

  const typeBadge: Record<string, string> = {
    summary: 'bg-indigo-100 text-indigo-700',
    instant: 'bg-amber-100 text-amber-700',
    supervisor: 'bg-red-100 text-red-700',
  }

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Mail className="w-6 h-6 text-slate-500" />
          Email Logs
        </h1>
        <p className="text-slate-500 text-sm mt-1">Every email sent by StaffOut — last 100 records.</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {!logs?.length ? (
          <div className="p-12 text-center">
            <Mail className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No emails sent yet.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Type</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Subject</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Recipients</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Sent</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="px-5 py-4">
                    <span className={`text-xs font-semibold uppercase px-2.5 py-1 rounded-full ${typeBadge[log.type] ?? 'bg-slate-100 text-slate-600'}`}>
                      {log.type}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-sm text-slate-700 max-w-xs truncate">{log.subject}</p>
                  </td>
                  <td className="px-5 py-4 hidden md:table-cell">
                    <p className="text-sm text-slate-500">{log.recipients?.length ?? 0} recipient(s)</p>
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-500 whitespace-nowrap">
                    {format(new Date(log.sent_at), 'MMM d, h:mm a')}
                  </td>
                  <td className="px-5 py-4">
                    {log.success ? (
                      <span className="flex items-center gap-1 text-xs font-medium text-green-700">
                        <CheckCircle className="w-3.5 h-3.5" /> Sent
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs font-medium text-red-600">
                        <XCircle className="w-3.5 h-3.5" /> Failed
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
