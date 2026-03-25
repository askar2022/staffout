import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import { STATUS_LABELS, STATUS_COLORS } from '@/lib/types'
import type { Submission } from '@/lib/types'
import { ClipboardList } from 'lucide-react'
import TestSummaryButton from './TestSummaryButton'

export default async function SubmissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user!.id)
    .single()

  const orgId = profile?.organization_id
  const selectedDate = params.date || new Date().toISOString().split('T')[0]

  const { data: submissions } = await supabase
    .from('submissions')
    .select('*')
    .eq('organization_id', orgId)
    .eq('date', selectedDate)
    .order('submitted_at', { ascending: false })

  const subs = (submissions ?? []) as Submission[]

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-slate-500" />
            Submissions
          </h1>
          <p className="text-slate-500 text-sm mt-1">All staff absence reports</p>
        </div>
        <div className="flex flex-col sm:flex-row items-end gap-3">
          <TestSummaryButton />
          <form className="flex items-center gap-2">
            <input
              type="date"
              name="date"
              defaultValue={selectedDate}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="submit"
              className="bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Filter
            </button>
          </form>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {subs.length === 0 ? (
          <div className="p-12 text-center">
            <ClipboardList className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No submissions for {format(new Date(selectedDate + 'T12:00:00'), 'MMMM d, yyyy')}</p>
            <p className="text-slate-400 text-sm mt-1">Staff will appear here once they submit.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Staff</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Time / Detail</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Supervisor</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Submitted</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Alert</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {subs.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-4">
                    <p className="text-sm font-semibold text-slate-900">{s.staff_name}</p>
                    {s.position && <p className="text-xs text-slate-400">{s.position}</p>}
                    {s.campus && <p className="text-xs text-slate-400">{s.campus}</p>}
                  </td>
                  <td className="px-5 py-4">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${STATUS_COLORS[s.status]}`}>
                      {STATUS_LABELS[s.status]}
                    </span>
                  </td>
                  <td className="px-5 py-4 hidden md:table-cell">
                    <p className="text-sm text-slate-600">
                      {s.status === 'late' && s.expected_arrival && `Arriving ${s.expected_arrival}`}
                      {(s.status === 'leaving_early' || s.status === 'appointment') && s.leave_time && `Leaving ${s.leave_time}`}
                      {s.reason_category && <span className="text-slate-400 text-xs ml-1">({s.reason_category})</span>}
                    </p>
                    {s.notes && <p className="text-xs text-slate-400 italic mt-0.5 max-w-xs truncate">"{s.notes}"</p>}
                  </td>
                  <td className="px-5 py-4 hidden lg:table-cell">
                    {s.supervisor_name ? (
                      <div>
                        <p className="text-sm text-slate-700">{s.supervisor_name}</p>
                        <p className="text-xs text-slate-400">{s.supervisor_email}</p>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-500">
                    {format(new Date(s.submitted_at), 'h:mm a')}
                  </td>
                  <td className="px-5 py-4 hidden md:table-cell">
                    {s.instant_sent ? (
                      <span className="text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">Sent</span>
                    ) : s.summary_included ? (
                      <span className="text-xs font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">In summary</span>
                    ) : (
                      <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">Pending</span>
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
