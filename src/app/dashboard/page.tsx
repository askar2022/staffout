import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import { Users, ClipboardList, Mail, AlertTriangle, CheckCircle, Clock, Calendar } from 'lucide-react'
import Link from 'next/link'
import { STATUS_LABELS, STATUS_COLORS } from '@/lib/types'
import type { Submission } from '@/lib/types'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user!.id)
    .single()

  const orgId = profile?.organization_id
  const today = new Date().toISOString().split('T')[0]

  const [{ data: todaySubmissions }, { data: staffCount }, { data: recentLogs }, { data: weekSubmissions }] =
    await Promise.all([
      supabase
        .from('submissions')
        .select('*')
        .eq('organization_id', orgId)
        .eq('date', today)
        .order('submitted_at', { ascending: false }),
      supabase
        .from('staff_members')
        .select('id', { count: 'exact' })
        .eq('organization_id', orgId)
        .eq('is_active', true),
      supabase
        .from('email_logs')
        .select('*')
        .eq('organization_id', orgId)
        .order('sent_at', { ascending: false })
        .limit(5),
      supabase
        .from('submissions')
        .select('*')
        .eq('organization_id', orgId)
        .gte('date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('submitted_at', { ascending: false }),
    ])

  const subs = (todaySubmissions ?? []) as Submission[]
  const absent = subs.filter((s) => s.status === 'absent' || s.status === 'personal_day')
  const late = subs.filter((s) => s.status === 'late')
  const leaving = subs.filter((s) => s.status === 'leaving_early' || s.status === 'appointment')

  return (
    <div className="p-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Overview</h1>
        <p className="text-slate-500 text-sm mt-1">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={AlertTriangle}
          label="Absent today"
          value={absent.length}
          color="text-red-600"
          bg="bg-red-50"
        />
        <StatCard
          icon={Clock}
          label="Late / Early"
          value={late.length + leaving.length}
          color="text-amber-600"
          bg="bg-amber-50"
        />
        <StatCard
          icon={Users}
          label="Active staff"
          value={staffCount?.length ?? 0}
          color="text-indigo-600"
          bg="bg-indigo-50"
        />
        <StatCard
          icon={Calendar}
          label="This week"
          value={(weekSubmissions ?? []).length}
          color="text-slate-600"
          bg="bg-slate-100"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's submissions */}
        <div className="bg-white rounded-2xl border border-slate-200">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-slate-500" />
              Today's submissions
            </h2>
            <Link href="/dashboard/submissions" className="text-xs text-indigo-600 hover:underline font-medium">
              View all
            </Link>
          </div>

          {subs.length === 0 ? (
            <div className="p-8 text-center">
              <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No absences reported today.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {subs.slice(0, 8).map((s) => (
                <div key={s.id} className="px-5 py-3.5 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{s.staff_name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {s.campus && `${s.campus} · `}
                      {format(new Date(s.submitted_at), 'h:mm a')}
                    </p>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${STATUS_COLORS[s.status]}`}>
                    {STATUS_LABELS[s.status]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent email logs */}
        <div className="bg-white rounded-2xl border border-slate-200">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <Mail className="w-4 h-4 text-slate-500" />
              Recent emails sent
            </h2>
            <Link href="/dashboard/email-logs" className="text-xs text-indigo-600 hover:underline font-medium">
              View all
            </Link>
          </div>

          {!recentLogs?.length ? (
            <div className="p-8 text-center">
              <p className="text-sm text-slate-500">No emails sent yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentLogs.map((log) => (
                <div key={log.id} className="px-5 py-3.5">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className={`text-xs font-semibold uppercase tracking-wide ${
                      log.type === 'summary' ? 'text-indigo-600' :
                      log.type === 'supervisor' ? 'text-red-600' : 'text-amber-600'
                    }`}>
                      {log.type}
                    </span>
                    <span className="text-xs text-slate-400">
                      {format(new Date(log.sent_at), 'MMM d, h:mm a')}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 truncate">{log.subject}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{log.recipients?.length ?? 0} recipient(s)</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  bg,
}: {
  icon: React.ElementType
  label: string
  value: number
  color: string
  bg: string
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <div className={`w-9 h-9 ${bg} rounded-xl flex items-center justify-center mb-3`}>
        <Icon className={`w-4.5 h-4.5 ${color}`} />
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-sm text-slate-500 mt-0.5">{label}</p>
    </div>
  )
}
