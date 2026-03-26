'use client'

import { useState, useCallback, Fragment } from 'react'
import { FileText, Search, Download, Printer, ChevronDown, ChevronUp, BarChart2 } from 'lucide-react'

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

interface StaffReport {
  name: string
  absent: number
  late: number
  leaving_early: number
  appointment: number
  personal_day: number
  total: number
  dates: { date: string; status: string }[]
}

function getDefaultRange() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  }
}

export default function ReportsPage() {
  const defaults = getDefaultRange()
  const [startDate, setStartDate] = useState(defaults.start)
  const [endDate, setEndDate] = useState(defaults.end)
  const [nameFilter, setNameFilter] = useState('')
  const [loading, setLoading] = useState(false)
  const [staff, setStaff] = useState<StaffReport[]>([])
  const [searched, setSearched] = useState(false)
  const [expandedName, setExpandedName] = useState<string | null>(null)
  const [totalSubmissions, setTotalSubmissions] = useState(0)

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
      setTotalSubmissions(data.totalSubmissions ?? 0)
    }
  }, [startDate, endDate, nameFilter])

  function exportCSV() {
    const rows = [
      ['Staff Name', 'Absent', 'Late', 'Left Early', 'Appointment', 'Personal Day', 'Total'],
      ...staff.map((s) => [
        s.name, s.absent, s.late, s.leaving_early, s.appointment, s.personal_day, s.total,
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
    const rows = [['Staff Name', 'Date', 'Status']]
    for (const s of staff) {
      for (const d of s.dates) {
        rows.push([s.name, d.date, STATUS_LABELS[d.status] ?? d.status])
      }
    }
    const csv = rows.map((r) => r.map((v) => `"${v}"`).join(',')).join('\n')
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
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <BarChart2 className="w-6 h-6 text-slate-500" />
          Attendance Reports
        </h1>
        <p className="text-slate-500 text-sm mt-1">Search and export staff attendance records by date range.</p>
      </div>

      {/* Filters */}
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

        {/* Quick range shortcuts */}
        <div className="flex flex-wrap gap-2 mt-3">
          {[
            { label: 'This month', fn: () => { const d = getDefaultRange(); setStartDate(d.start); setEndDate(d.end) } },
            { label: 'Last month', fn: () => {
              const now = new Date()
              const s = new Date(now.getFullYear(), now.getMonth() - 1, 1)
              const e = new Date(now.getFullYear(), now.getMonth(), 0)
              setStartDate(s.toISOString().split('T')[0])
              setEndDate(e.toISOString().split('T')[0])
            }},
            { label: 'This year', fn: () => {
              const y = new Date().getFullYear()
              setStartDate(`${y}-01-01`)
              setEndDate(`${y}-12-31`)
            }},
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

      {/* Results */}
      {searched && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          {/* Result header */}
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {staff.length} staff member{staff.length !== 1 ? 's' : ''} · {totalSubmissions} total submission{totalSubmissions !== 1 ? 's' : ''}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">{dateLabel}</p>
            </div>
            {staff.length > 0 && (
              <div className="flex gap-2">
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
              </div>
            )}
          </div>

          {staff.length === 0 ? (
            <div className="p-12 text-center">
              <BarChart2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">No submissions found</p>
              <p className="text-slate-400 text-sm mt-1">Try a different date range or name.</p>
            </div>
          ) : (
            <div>
              {/* Summary table */}
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
                            {expandedName === s.name
                              ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                              : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
                            <span className="text-sm font-semibold text-slate-900">{s.name}</span>
                          </div>
                        </td>
                        <td className="px-3 py-3.5 text-center">
                          <span className={`text-sm font-bold ${s.absent > 0 ? 'text-red-600' : 'text-slate-300'}`}>{s.absent || '—'}</span>
                        </td>
                        <td className="px-3 py-3.5 text-center">
                          <span className={`text-sm font-bold ${s.late > 0 ? 'text-amber-600' : 'text-slate-300'}`}>{s.late || '—'}</span>
                        </td>
                        <td className="px-3 py-3.5 text-center">
                          <span className={`text-sm font-bold ${s.leaving_early > 0 ? 'text-purple-600' : 'text-slate-300'}`}>{s.leaving_early || '—'}</span>
                        </td>
                        <td className="px-3 py-3.5 text-center">
                          <span className={`text-sm font-bold ${s.appointment > 0 ? 'text-blue-600' : 'text-slate-300'}`}>{s.appointment || '—'}</span>
                        </td>
                        <td className="px-3 py-3.5 text-center">
                          <span className={`text-sm font-bold ${s.personal_day > 0 ? 'text-teal-600' : 'text-slate-300'}`}>{s.personal_day || '—'}</span>
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <span className="text-sm font-black text-slate-900">{s.total}</span>
                        </td>
                      </tr>

                      {/* Expanded detail rows */}
                      {expandedName === s.name && (
                        <tr>
                          <td colSpan={7} className="px-5 py-3 bg-slate-50 border-b border-slate-200">
                            <div className="flex flex-wrap gap-2">
                              {s.dates.map((d, i) => (
                                <span
                                  key={i}
                                  className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[d.status] ?? 'bg-slate-100 text-slate-600'}`}
                                >
                                  {new Date(d.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                  · {STATUS_LABELS[d.status] ?? d.status}
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
