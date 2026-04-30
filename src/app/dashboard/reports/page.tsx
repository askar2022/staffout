'use client'

import { Fragment, useCallback, useMemo, useState } from 'react'
import { BarChart2, CalendarDays, ChevronDown, ChevronUp, Clock, Download, FileText, Printer, Search } from 'lucide-react'
import { APPROVAL_STATUS_LABELS, PAY_TYPE_LABELS } from '@/lib/types'
import { formatPtoHours } from '@/lib/pto'

const STATUS_LABELS: Record<string, string> = {
  absent: 'Absent',
  late: 'Late',
  leaving_early: 'Left Early',
  appointment: 'Appointment',
  personal_day: 'Personal Day',
}

const STATUS_COLORS: Record<string, string> = {
  absent: 'bg-red-100 text-red-700',
  late: 'bg-amber-100 text-amber-700',
  leaving_early: 'bg-purple-100 text-purple-700',
  appointment: 'bg-blue-100 text-blue-700',
  personal_day: 'bg-teal-100 text-teal-700',
}

const APPROVAL_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  denied: 'bg-red-100 text-red-700',
}

interface StaffReport {
  name: string
  staff_id: string | null
  employee_id: string | null
  absent: number
  late: number
  leaving_early: number
  appointment: number
  personal_day: number
  total: number
  pto_used_period: number
  pto_balance: number | null
  pto_remaining: number | null
  dates: { date: string; status: string; pto_hours?: number | null }[]
}

interface SubmissionEntry {
  id: string
  staff_name: string
  employee_id: string | null
  supervisor_name: string | null
  status: string
  date: string
  pay_type: 'pto' | 'unpaid' | null
  approval_status: 'pending' | 'approved' | 'denied'
  pto_hours_requested?: number | null
  pto_hours_deducted?: number | null
  supervisor_action_at?: string | null
  supervisor_action_by?: string | null
  notes?: string | null
  hr_excused?: boolean
}

type ViewMode = 'summary' | 'log' | 'calendar'

function getDefaultRange() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  }
}

function formatDateLabel(date: string) {
  return new Date(date + 'T12:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function buildCalendarDays(startDate: string, endDate: string) {
  const days: string[] = []
  const current = new Date(startDate + 'T12:00:00')
  const last = new Date(endDate + 'T12:00:00')
  while (current <= last) {
    days.push(current.toISOString().split('T')[0])
    current.setDate(current.getDate() + 1)
  }
  return days
}

export default function ReportsPage() {
  const defaults = getDefaultRange()
  const [startDate, setStartDate] = useState(defaults.start)
  const [endDate, setEndDate] = useState(defaults.end)
  const [nameFilter, setNameFilter] = useState('')
  const [loading, setLoading] = useState(false)
  const [staff, setStaff] = useState<StaffReport[]>([])
  const [entries, setEntries] = useState<SubmissionEntry[]>([])
  const [searched, setSearched] = useState(false)
  const [expandedName, setExpandedName] = useState<string | null>(null)
  const [totalSubmissions, setTotalSubmissions] = useState(0)
  const [viewMode, setViewMode] = useState<ViewMode>('log')

  const handleSearch = useCallback(async () => {
    setLoading(true)
    setSearched(true)
    const params = new URLSearchParams({ start: startDate, end: endDate })
    if (nameFilter) params.set('name', nameFilter)
    const res = await fetch(`/api/reports/attendance?${params}`)
    const data = await res.json()
    setLoading(false)
    if (res.ok) {
      setStaff(data.staff ?? [])
      setEntries(data.entries ?? [])
      setTotalSubmissions(data.totalSubmissions ?? 0)
    }
  }, [startDate, endDate, nameFilter])

  const hasPto = staff.some((s) => s.pto_balance !== null)
  const hasEmployeeId = staff.some((s) => s.employee_id)
  const calendarDays = useMemo(() => buildCalendarDays(startDate, endDate), [startDate, endDate])
  const entriesByDay = useMemo(() => {
    const grouped = new Map<string, SubmissionEntry[]>()
    for (const day of calendarDays) grouped.set(day, [])
    for (const entry of entries) {
      const dayEntries = grouped.get(entry.date) ?? []
      dayEntries.push(entry)
      grouped.set(entry.date, dayEntries)
    }
    for (const day of calendarDays) {
      grouped.set(day, (grouped.get(day) ?? []).sort((a, b) => a.staff_name.localeCompare(b.staff_name)))
    }
    return grouped
  }, [calendarDays, entries])

  function exportCSV() {
    const headers = [
      ...(hasEmployeeId ? ['Employee ID'] : []),
      'Staff Name',
      'Absent', 'Late', 'Left Early', 'Appointment', 'Personal Day', 'Total',
      ...(hasPto ? ['PTO Used (Period)', 'PTO Bank', 'PTO Remaining'] : []),
    ]
    const rows = [
      headers,
      ...staff.map((s) => [
        ...(hasEmployeeId ? [s.employee_id ?? ''] : []),
        s.name,
        s.absent, s.late, s.leaving_early, s.appointment, s.personal_day, s.total,
        ...(hasPto ? [
          s.pto_used_period > 0 ? formatPtoHours(s.pto_used_period, { suffix: false }) : '',
          s.pto_balance !== null ? formatPtoHours(s.pto_balance, { suffix: false }) : '',
          s.pto_remaining !== null ? formatPtoHours(s.pto_remaining, { suffix: false }) : '',
        ] : []),
      ]),
    ]
    const csv = rows.map((r) => r.map((v) => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `attendance-report-${startDate}-to-${endDate}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function exportDetailedCSV() {
    const headers = [
      ...(hasEmployeeId ? ['Employee ID'] : []),
      'Staff Name',
      'Date',
      'Status',
      'Pay Type',
      'Supervisor Action',
      'Action Time',
      'Requested PTO Hours',
      'Approved PTO Hours',
      'Supervisor',
      'Notes',
    ]
    const rows = [
      headers,
      ...entries.map((entry) => [
        ...(hasEmployeeId ? [entry.employee_id ?? ''] : []),
        entry.staff_name,
        entry.date,
        STATUS_LABELS[entry.status] ?? entry.status,
        entry.pay_type ? PAY_TYPE_LABELS[entry.pay_type] : '',
        APPROVAL_STATUS_LABELS[entry.approval_status] ?? entry.approval_status,
        entry.supervisor_action_at
          ? new Date(entry.supervisor_action_at).toLocaleString('en-US')
          : '',
        entry.pto_hours_requested ? formatPtoHours(entry.pto_hours_requested, { suffix: false }) : '',
        entry.pto_hours_deducted ? formatPtoHours(entry.pto_hours_deducted, { suffix: false }) : '',
        entry.supervisor_action_by ?? entry.supervisor_name ?? '',
        entry.notes ?? '',
      ]),
    ]
    const csv = rows.map((r) => r.map((v) => `"${v ?? ''}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `attendance-detail-${startDate}-to-${endDate}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const dateLabel = `${new Date(startDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${new Date(endDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`

  return (
    <div className="p-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <BarChart2 className="w-6 h-6 text-slate-500" />
          Attendance Reports
        </h1>
        <p className="text-slate-500 text-sm mt-1">Search by employee and date range, then review supervisor actions in a table or calendar view.</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">From</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">To</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Staff Name</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={nameFilter}
                onChange={(e) => setNameFilter(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="All staff"
                className="w-full border border-slate-300 rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
          <div className="flex items-end">
            <button
              onClick={handleSearch}
              disabled={loading}
              className="w-full bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors text-sm flex items-center justify-center gap-2"
            >
              <Search className="w-4 h-4" />
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-3">
          {[
            { label: 'This month', fn: () => { const d = getDefaultRange(); setStartDate(d.start); setEndDate(d.end) } },
            { label: 'Last month', fn: () => {
              const now = new Date()
              const s = new Date(now.getFullYear(), now.getMonth() - 1, 1)
              const e = new Date(now.getFullYear(), now.getMonth(), 0)
              setStartDate(s.toISOString().split('T')[0])
              setEndDate(e.toISOString().split('T')[0])
            } },
            { label: 'This year', fn: () => {
              const y = new Date().getFullYear()
              setStartDate(`${y}-01-01`)
              setEndDate(`${y}-12-31`)
            } },
          ].map(({ label, fn }) => (
            <button
              key={label}
              onClick={fn}
              className="text-xs text-indigo-600 font-medium px-3 py-1 bg-indigo-50 rounded-full hover:bg-indigo-100 transition-colors"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {searched && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {staff.length} staff member{staff.length !== 1 ? 's' : ''} · {totalSubmissions} total submission{totalSubmissions !== 1 ? 's' : ''}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">{dateLabel}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setViewMode('log')}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${viewMode === 'log' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
              >
                HR Action Log
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${viewMode === 'calendar' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
              >
                <span className="inline-flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" />Calendar</span>
              </button>
              <button
                onClick={() => setViewMode('summary')}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${viewMode === 'summary' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
              >
                Summary
              </button>
              {staff.length > 0 && (
                <>
                  <button
                    onClick={exportCSV}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Summary CSV
                  </button>
                  <button
                    onClick={exportDetailedCSV}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Detail CSV
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-slate-50 text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Print / PDF
                  </button>
                </>
              )}
            </div>
          </div>

          {entries.length === 0 ? (
            <div className="p-12 text-center">
              <BarChart2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">No submissions found</p>
              <p className="text-slate-400 text-sm mt-1">Try a different date range or name.</p>
            </div>
          ) : viewMode === 'log' ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Employee</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Pay</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Supervisor Action</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Action Time</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Supervisor</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {entries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-50">
                      <td className="px-5 py-4 text-sm text-slate-700">{formatDateLabel(entry.date)}</td>
                      <td className="px-5 py-4">
                        <p className="text-sm font-semibold text-slate-900">{entry.staff_name}</p>
                        {entry.employee_id && <p className="text-xs text-slate-400 font-mono">ID: {entry.employee_id}</p>}
                        {entry.hr_excused && <p className="text-xs text-purple-600 mt-1">HR Excused</p>}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[entry.status] ?? 'bg-slate-100 text-slate-600'}`}>
                          {STATUS_LABELS[entry.status] ?? entry.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-700">
                        {entry.pay_type ? (
                          <>
                            <span className="font-semibold">{PAY_TYPE_LABELS[entry.pay_type]}</span>
                            {entry.pto_hours_requested ? <span className="text-slate-400"> · req {formatPtoHours(entry.pto_hours_requested)}</span> : null}
                            {entry.pto_hours_deducted ? <span className="text-slate-400"> · approved {formatPtoHours(entry.pto_hours_deducted)}</span> : null}
                          </>
                        ) : '—'}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${APPROVAL_COLORS[entry.approval_status] ?? 'bg-slate-100 text-slate-600'}`}>
                          {APPROVAL_STATUS_LABELS[entry.approval_status] ?? entry.approval_status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-600">
                        {entry.supervisor_action_at ? new Date(entry.supervisor_action_at).toLocaleString('en-US') : 'Pending'}
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-600">{entry.supervisor_action_by ?? entry.supervisor_name ?? '—'}</td>
                      <td className="px-5 py-4 text-sm text-slate-500 max-w-xs">{entry.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : viewMode === 'calendar' ? (
            <div className="p-5">
              <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
                {calendarDays.map((day) => {
                  const dayEntries = entriesByDay.get(day) ?? []
                  return (
                    <div key={day} className="border border-slate-200 rounded-xl bg-slate-50/60 min-h-[180px] p-3">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {new Date(day + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' })}
                          </p>
                          <p className="text-xs text-slate-500">{formatDateLabel(day)}</p>
                        </div>
                        <span className="text-xs font-semibold text-slate-500 bg-white border border-slate-200 rounded-full px-2 py-1">
                          {dayEntries.length}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {dayEntries.length === 0 ? (
                          <p className="text-xs text-slate-400">No entries</p>
                        ) : dayEntries.map((entry) => (
                          <div key={entry.id} className="bg-white border border-slate-200 rounded-lg p-2.5 shadow-sm">
                            <p className="text-xs font-semibold text-slate-900">{entry.staff_name}</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_COLORS[entry.status] ?? 'bg-slate-100 text-slate-600'}`}>
                                {STATUS_LABELS[entry.status] ?? entry.status}
                              </span>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${APPROVAL_COLORS[entry.approval_status] ?? 'bg-slate-100 text-slate-600'}`}>
                                {APPROVAL_STATUS_LABELS[entry.approval_status] ?? entry.approval_status}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-1">
                              {entry.pay_type ? PAY_TYPE_LABELS[entry.pay_type] : 'No pay type'}{entry.supervisor_action_by ? ` · ${entry.supervisor_action_by}` : ''}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Staff Name</th>
                    <th className="text-center px-3 py-3 text-xs font-semibold text-red-500 uppercase tracking-wide">Absent</th>
                    <th className="text-center px-3 py-3 text-xs font-semibold text-amber-500 uppercase tracking-wide">Late</th>
                    <th className="text-center px-3 py-3 text-xs font-semibold text-purple-500 uppercase tracking-wide">Left Early</th>
                    <th className="text-center px-3 py-3 text-xs font-semibold text-blue-500 uppercase tracking-wide">Appt</th>
                    <th className="text-center px-3 py-3 text-xs font-semibold text-teal-500 uppercase tracking-wide">Personal</th>
                    <th className="text-center px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Total</th>
                    {hasPto && (
                      <>
                        <th className="text-center px-3 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide hidden lg:table-cell">PTO Bank</th>
                        <th className="text-center px-3 py-3 text-xs font-semibold text-indigo-500 uppercase tracking-wide hidden lg:table-cell">
                          <span className="flex items-center justify-center gap-1"><Clock className="w-3 h-3" />PTO Used</span>
                        </th>
                        <th className="text-center px-3 py-3 text-xs font-semibold text-green-600 uppercase tracking-wide hidden lg:table-cell">PTO Left</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {staff.map((s) => (
                    <Fragment key={s.name}>
                      <tr
                        className="hover:bg-slate-50 cursor-pointer transition-colors"
                        onClick={() => setExpandedName(expandedName === s.name ? null : s.name)}
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            {expandedName === s.name ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
                            <div>
                              <span className="text-sm font-semibold text-slate-900">{s.name}</span>
                              {s.employee_id && <p className="text-xs text-slate-400 font-mono">ID: {s.employee_id}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3.5 text-center"><span className={`text-sm font-bold ${s.absent > 0 ? 'text-red-600' : 'text-slate-300'}`}>{s.absent || '—'}</span></td>
                        <td className="px-3 py-3.5 text-center"><span className={`text-sm font-bold ${s.late > 0 ? 'text-amber-600' : 'text-slate-300'}`}>{s.late || '—'}</span></td>
                        <td className="px-3 py-3.5 text-center"><span className={`text-sm font-bold ${s.leaving_early > 0 ? 'text-purple-600' : 'text-slate-300'}`}>{s.leaving_early || '—'}</span></td>
                        <td className="px-3 py-3.5 text-center"><span className={`text-sm font-bold ${s.appointment > 0 ? 'text-blue-600' : 'text-slate-300'}`}>{s.appointment || '—'}</span></td>
                        <td className="px-3 py-3.5 text-center"><span className={`text-sm font-bold ${s.personal_day > 0 ? 'text-teal-600' : 'text-slate-300'}`}>{s.personal_day || '—'}</span></td>
                        <td className="px-5 py-3.5 text-center"><span className="text-sm font-black text-slate-900">{s.total}</span></td>
                        {hasPto && (
                          <>
                            <td className="px-3 py-3.5 text-center hidden lg:table-cell">{s.pto_balance !== null ? <span className="text-sm font-semibold text-slate-700">{formatPtoHours(s.pto_balance)}</span> : <span className="text-sm text-slate-300">—</span>}</td>
                            <td className="px-3 py-3.5 text-center hidden lg:table-cell">{s.pto_used_period > 0 ? <span className="text-sm font-semibold text-indigo-600">{formatPtoHours(s.pto_used_period)}</span> : <span className="text-sm text-slate-300">—</span>}</td>
                            <td className="px-3 py-3.5 text-center hidden lg:table-cell">
                              {s.pto_remaining !== null ? (
                                <span className={`text-sm font-semibold ${s.pto_remaining <= 0 ? 'text-red-600' : s.pto_remaining <= 16 ? 'text-amber-600' : 'text-green-600'}`}>{formatPtoHours(s.pto_remaining)}</span>
                              ) : (
                                <span className="text-sm text-slate-300">—</span>
                              )}
                            </td>
                          </>
                        )}
                      </tr>
                      {expandedName === s.name && (
                        <tr>
                          <td colSpan={hasPto ? 10 : 7} className="px-5 py-3 bg-slate-50 border-b border-slate-200">
                            <div className="flex flex-wrap gap-2">
                              {s.dates.map((d, i) => (
                                <span key={i} className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[d.status] ?? 'bg-slate-100 text-slate-600'}`}>
                                  {new Date(d.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {STATUS_LABELS[d.status] ?? d.status}
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
