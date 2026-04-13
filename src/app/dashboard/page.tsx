import { format } from 'date-fns'
import { Users, ClipboardList, Mail, AlertTriangle, CheckCircle, Clock, Calendar } from 'lucide-react'
import Link from 'next/link'
import { STATUS_LABELS, STATUS_COLORS } from '@/lib/types'
import type { Submission } from '@/lib/types'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { getOrgId } from '@/lib/get-org-id'
import { getIsPlatformAdminHostFromRequest, getOrgSlugFromRequest } from '@/lib/get-org'
import PlatformAdminDashboard from './PlatformAdminDashboard'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const currentSlug = await getOrgSlugFromRequest()
  const isPlatformAdminHost = await getIsPlatformAdminHostFromRequest()
  const isPlatformAdmin = user?.email === process.env.SUPER_ADMIN_EMAIL

  if (isPlatformAdmin && isPlatformAdminHost && !currentSlug) {
    return <PlatformAdminDashboard />
  }

  const orgId = await getOrgId()
  const db = createAdminClient()
  const today = new Date().toISOString().split('T')[0]
  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - 7)
  const weekStartDate = weekStart.toISOString().split('T')[0]

  const [{ data: todaySubmissions }, { data: staffMembers }, { data: recentLogs }, { data: weekSubmissions }] =
    await Promise.all([
      db.from('submissions').select('*').eq('organization_id', orgId).eq('date', today).order('submitted_at', { ascending: false }),
      db.from('staff_members').select('id').eq('organization_id', orgId).eq('is_active', true),
      db.from('email_logs').select('*').eq('organization_id', orgId).order('sent_at', { ascending: false }).limit(5),
      db.from('submissions').select('*').eq('organization_id', orgId)
        .gte('date', weekStartDate)
        .order('submitted_at', { ascending: false }),
    ])

  const subs = (todaySubmissions ?? []) as Submission[]
  const absent = subs.filter((s) => s.status === 'absent' || s.status === 'personal_day')
  const late = subs.filter((s) => s.status === 'late')
  const leaving = subs.filter((s) => s.status === 'leaving_early' || s.status === 'appointment')

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Overview</h1>
        <p className="text-slate-500 text-sm mt-1">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={AlertTriangle} label="Absent today" value={absent.length} color="text-red-600" bg="bg-red-50" />
        <StatCard icon={Clock} label="Late / Early" value={late.length + leaving.length} color="text-amber-600" bg="bg-amber-50" />
        <StatCard icon={Users} label="Active staff" value={staffMembers?.length ?? 0} color="text-indigo-600" bg="bg-indigo-50" />
        <StatCard icon={Calendar} label="This week" value={(weekSubmissions ?? []).length} color="text-slate-600" bg="bg-slate-100" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-slate-500" />
              Today&apos;s submissions
            </h2>
            <Link href="/dashboard/submissions" className="text-xs text-indigo-600 hover:underline font-medium">View all</Link>
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
                    <p className="text-xs text-slate-400 mt-0.5">{s.campus && `${s.campus} · `}{format(new Date(s.submitted_at), 'h:mm a')}</p>
                    {s.hr_excused && (
                      <span className="inline-flex items-center gap-1 mt-0.5 text-xs font-semibold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                        🔖 HR Excused
                      </span>
                    )}
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${STATUS_COLORS[s.status]}`}>
                    {STATUS_LABELS[s.status]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <Mail className="w-4 h-4 text-slate-500" />
              Recent emails sent
            </h2>
            <Link href="/dashboard/email-logs" className="text-xs text-indigo-600 hover:underline font-medium">View all</Link>
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
                      log.type === 'summary' ? 'text-indigo-600' : log.type === 'supervisor' ? 'text-red-600' : 'text-amber-600'
                    }`}>{log.type}</span>
                    <span className="text-xs text-slate-400">{format(new Date(log.sent_at), 'MMM d, h:mm a')}</span>
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

function StatCard({ icon: Icon, label, value, color, bg }: { icon: React.ElementType; label: string; value: number; color: string; bg: string }) {
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
