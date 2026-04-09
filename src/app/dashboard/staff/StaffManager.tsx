'use client'

import { useState, useRef } from 'react'
import { Plus, Pencil, X, Check, Users, Upload, Download, CheckCircle, AlertCircle, Archive, RotateCcw, RefreshCw, Clock } from 'lucide-react'
import type { StaffMember } from '@/lib/types'

interface Props {
  initialStaff: StaffMember[]
  orgId: string
}

const EMPTY_FORM = {
  full_name: '',
  email: '',
  position: '',
  campus: '',
  supervisor_name: '',
  supervisor_email: '',
  pto_balance: '',
  employee_id: '',
}

export default function StaffManager({ initialStaff }: Props) {
  const [staff, setStaff] = useState<StaffMember[]>(initialStaff)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Archive toggle
  const [showArchived, setShowArchived] = useState(false)

  const activeStaff   = staff.filter((s) => s.is_active !== false)
  const archivedStaff = staff.filter((s) => s.is_active === false)
  const visibleStaff  = showArchived ? archivedStaff : activeStaff

  // CSV import state
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ success: boolean; message: string } | null>(null)

  // Sync to recipients state
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<{ success: boolean; message: string } | null>(null)

  async function handleSyncToRecipients() {
    setSyncing(true)
    setSyncResult(null)
    const res = await fetch('/api/recipients/sync-staff', { method: 'POST' })
    const data = await res.json()
    setSyncing(false)
    if (res.ok) {
      const msg = data.added === 0
        ? data.message
        : `Added ${data.added} staff member${data.added !== 1 ? 's' : ''} to notification recipients.${data.skipped > 0 ? ` (${data.skipped} already existed)` : ''}`
      setSyncResult({ success: true, message: msg })
    } else {
      setSyncResult({ success: false, message: data.error || 'Sync failed.' })
    }
  }

  function exportCurrentStaffCSV() {
    const rows = [
      [
        'Employee ID',
        'Full Name',
        'Email',
        'Position',
        'Campus',
        'Supervisor Name',
        'Supervisor Email',
        'PTO Bank',
        'PTO Used',
        'PTO Left',
        'Status',
      ],
      ...visibleStaff.map((member) => [
        member.employee_id ?? '',
        member.full_name,
        member.email ?? '',
        member.position ?? '',
        member.campus ?? '',
        member.supervisor_name ?? '',
        member.supervisor_email ?? '',
        member.pto_balance ?? '',
        member.pto_used ?? '',
        member.pto_remaining ?? '',
        member.is_active === false ? 'Archived' : 'Active',
      ]),
    ]
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = showArchived ? 'staff-directory-archived.csv' : 'staff-directory-active.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleCSVUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    setImporting(true)
    setImportResult(null)

    const text = await file.text()
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
    if (lines.length < 2) {
      setImporting(false)
      setImportResult({ success: false, message: 'File is empty or missing data rows.' })
      return
    }

    // Parse header to find column indexes
    const header = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/[^a-z ]/g, ''))
    const idx = (names: string[]) => names.map((n) => header.findIndex((h) => h.includes(n))).find((i) => i >= 0) ?? -1

    const nameIdx    = idx(['full name', 'name'])
    const emailIdx   = idx(['email'])
    const posIdx     = idx(['position', 'role', 'title'])
    const campusIdx  = idx(['campus', 'site', 'location'])
    const supNameIdx = idx(['supervisor name', 'supervisor'])
    const supEmailIdx= idx(['supervisor email'])

    if (nameIdx === -1 || emailIdx === -1) {
      setImporting(false)
      setImportResult({ success: false, message: 'CSV must have "Full Name" and "Email" columns.' })
      return
    }

    const rows = lines.slice(1).map((line) => {
      const cols = line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''))
      return {
        full_name:       cols[nameIdx]     ?? '',
        email:           cols[emailIdx]    ?? '',
        position:        posIdx     >= 0 ? cols[posIdx]     : '',
        campus:          campusIdx  >= 0 ? cols[campusIdx]  : '',
        supervisor_name: supNameIdx >= 0 ? cols[supNameIdx] : '',
        supervisor_email:supEmailIdx >= 0 ? cols[supEmailIdx]: '',
      }
    }).filter((r) => r.full_name && r.email)

    if (rows.length === 0) {
      setImporting(false)
      setImportResult({ success: false, message: 'No valid rows found in the file.' })
      return
    }

    const res = await fetch('/api/staff/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows }),
    })
    const data = await res.json()
    setImporting(false)

    if (res.ok) {
      setImportResult({ success: true, message: `Successfully imported ${data.imported} staff members.` })
      // Reload the page to show updated list
      window.location.reload()
    } else {
      setImportResult({ success: false, message: data.error || 'Import failed.' })
    }
  }

  function startAdd() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
    setError('')
  }

  function startEdit(member: StaffMember) {
    setEditingId(member.id)
    setForm({
      full_name: member.full_name,
      email: member.email ?? '',
      position: member.position ?? '',
      campus: member.campus ?? '',
      supervisor_name: member.supervisor_name ?? '',
      supervisor_email: member.supervisor_email ?? '',
      pto_balance: member.pto_balance !== null && member.pto_balance !== undefined ? String(member.pto_balance) : '',
      employee_id: member.employee_id ?? '',
    })
    setShowForm(true)
    setError('')
  }

  async function handleSave() {
    if (!form.full_name.trim()) {
      setError('Name is required')
      return
    }
    if (!form.email.trim()) {
      setError('Work email is required — staff use it to verify identity when submitting absences')
      return
    }

    setSaving(true)
    setError('')

    const method = editingId ? 'PATCH' : 'POST'
    const url = editingId ? `/api/staff/${editingId}` : '/api/staff'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        pto_balance: form.pto_balance !== '' ? Number(form.pto_balance) : null,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'Failed to save')
    } else {
      const saved = data.member as StaffMember
      if (editingId) {
        setStaff((prev) => prev.map((s) => (s.id === editingId ? saved : s)))
      } else {
        setStaff((prev) => [...prev, saved].sort((a, b) => a.full_name.localeCompare(b.full_name)))
      }
      setShowForm(false)
    }

    setSaving(false)
  }

  async function handleArchive(id: string) {
    const res = await fetch(`/api/staff/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: false }),
    })
    if (res.ok) {
      setStaff((prev) => prev.map((s) => s.id === id ? { ...s, is_active: false } : s))
    }
  }

  async function handleRestore(id: string) {
    const res = await fetch(`/api/staff/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: true }),
    })
    if (res.ok) {
      setStaff((prev) => prev.map((s) => s.id === id ? { ...s, is_active: true } : s))
    }
  }


  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* CSV import controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={exportCurrentStaffCSV}
            className="flex items-center gap-2 text-sm font-medium text-indigo-700 border border-indigo-200 bg-indigo-50 px-3 py-2 rounded-lg hover:bg-indigo-100 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export Current Table
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="flex items-center gap-2 text-sm font-semibold text-green-700 bg-green-50 border border-green-200 px-3 py-2 rounded-lg hover:bg-green-100 disabled:opacity-50 transition-colors"
          >
            <Upload className="w-4 h-4" />
            {importing ? 'Importing...' : 'Import CSV'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleCSVUpload}
          />
          <button
            onClick={handleSyncToRecipients}
            disabled={syncing}
            className="flex items-center gap-2 text-sm font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-2 rounded-lg hover:bg-indigo-100 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync Staff → Notifications'}
          </button>
        </div>

        <div className="flex items-center gap-2">
          {!showArchived && (
            <button
              onClick={startAdd}
              className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-semibold px-4 py-2.5 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add staff member
            </button>
          )}
        </div>
      </div>

      {/* Import result message */}
      {importResult && (
        <div className={`flex items-center gap-2 text-sm px-4 py-3 rounded-xl border ${
          importResult.success
            ? 'bg-green-50 border-green-200 text-green-800'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {importResult.success
            ? <CheckCircle className="w-4 h-4 shrink-0" />
            : <AlertCircle className="w-4 h-4 shrink-0" />}
          {importResult.message}
        </div>
      )}

      {/* Sync result message */}
      {syncResult && (
        <div className={`flex items-center gap-2 text-sm px-4 py-3 rounded-xl border ${
          syncResult.success
            ? 'bg-indigo-50 border-indigo-200 text-indigo-800'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {syncResult.success
            ? <CheckCircle className="w-4 h-4 shrink-0" />
            : <AlertCircle className="w-4 h-4 shrink-0" />}
          {syncResult.message}
          {syncResult.success && (
            <span className="ml-1 text-indigo-600">Go to Settings → Notification Recipients to adjust their roles.</span>
          )}
        </div>
      )}

      {showForm && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900">{editingId ? 'Edit staff member' : 'Add staff member'}</h3>
            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 text-blue-800 text-xs rounded-lg px-3 py-2 mb-3">
            Staff use their <strong>work email</strong> to verify identity when submitting absences — no password needed.
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { key: 'full_name', label: 'Full name *', placeholder: 'Ms. Johnson', type: 'text' },
              { key: 'email', label: 'Work email *', placeholder: 'name@school.org', type: 'email' },
              { key: 'employee_id', label: 'Employee ID', placeholder: 'e.g. EMP-1042', type: 'text' },
              { key: 'position', label: 'Position / Role', placeholder: 'Math Teacher', type: 'text' },
              { key: 'campus', label: 'Campus / Site', placeholder: 'Main Campus', type: 'text' },
              { key: 'supervisor_name', label: 'Supervisor name', placeholder: 'Mr. Ahmed', type: 'text' },
              { key: 'supervisor_email', label: 'Supervisor email', placeholder: 'supervisor@school.org', type: 'email' },
            ].map(({ key, label, placeholder, type }) => (
              <div key={key}>
                <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
                <input
                  type={type}
                  value={form[key as keyof typeof form]}
                  onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                />
              </div>
            ))}
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">
                PTO Balance (hours) <span className="text-slate-400 font-normal">— leave blank if not tracked</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={form.pto_balance}
                onChange={(e) => setForm((prev) => ({ ...prev, pto_balance: e.target.value }))}
                placeholder="e.g. 80"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              />
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors"
            >
              <Check className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="flex items-center gap-2 text-slate-600 text-sm font-medium px-4 py-2 rounded-lg hover:bg-slate-200 transition-colors"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-white rounded-t-2xl overflow-hidden border border-b-0">
        <button
          onClick={() => setShowArchived(false)}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
            !showArchived
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Users className="w-4 h-4" />
          Active Staff ({activeStaff.length})
        </button>
        <button
          onClick={() => setShowArchived(true)}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
            showArchived
              ? 'border-amber-500 text-amber-600 bg-amber-50'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Archive className="w-4 h-4" />
          Archived ({archivedStaff.length})
        </button>
      </div>

      <div className="bg-white rounded-b-2xl border border-slate-200 border-t-0 overflow-hidden">
        {staff.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No staff members yet</p>
            <p className="text-slate-400 text-sm mt-1">Add your team with their work emails so they can sign in to submit absences.</p>
          </div>
        ) : visibleStaff.length === 0 ? (
          <div className="p-12 text-center">
            <Archive className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">{showArchived ? 'No archived staff' : 'No active staff'}</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Name</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Position</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Supervisor</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Campus</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden xl:table-cell">
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />PTO Bank</span>
                </th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-indigo-500 uppercase tracking-wide hidden 2xl:table-cell">
                  PTO Used
                </th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-green-600 uppercase tracking-wide hidden 2xl:table-cell">
                  PTO Left
                </th>
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleStaff.map((member) => (
                <tr key={member.id} className={`hover:bg-slate-50 transition-colors ${showArchived ? 'opacity-70' : ''}`}>
                  <td className="px-5 py-4">
                    <p className="text-sm font-semibold text-slate-900">{member.full_name}</p>
                    {member.email && <p className="text-xs text-slate-400">{member.email}</p>}
                    {member.employee_id && (
                      <p className="text-xs text-slate-400 font-mono">ID: {member.employee_id}</p>
                    )}
                    {showArchived && <span className="text-xs text-amber-600 font-medium">Archived</span>}
                  </td>
                  <td className="px-5 py-4 hidden sm:table-cell">
                    <p className="text-sm text-slate-600">{member.position || '—'}</p>
                  </td>
                  <td className="px-5 py-4 hidden lg:table-cell">
                    {member.supervisor_name ? (
                      <div>
                        <p className="text-sm text-slate-700">{member.supervisor_name}</p>
                        <p className="text-xs text-slate-400">{member.supervisor_email}</p>
                      </div>
                    ) : (
                      <span className="text-sm text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4 hidden md:table-cell">
                    <p className="text-sm text-slate-600">{member.campus || '—'}</p>
                  </td>
                  <td className="px-5 py-4 hidden xl:table-cell">
                    {member.pto_balance !== null && member.pto_balance !== undefined ? (
                      <span className="inline-flex items-center gap-1 text-sm font-medium text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">
                        <Clock className="w-3 h-3" />
                        {member.pto_balance}h
                      </span>
                    ) : (
                      <span className="text-sm text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4 hidden 2xl:table-cell">
                    {member.pto_balance !== null && member.pto_balance !== undefined ? (
                      <span className="text-sm font-medium text-indigo-600">
                        {member.pto_used ?? 0}h
                      </span>
                    ) : (
                      <span className="text-sm text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4 hidden 2xl:table-cell">
                    {member.pto_remaining !== null && member.pto_remaining !== undefined ? (
                      <span className={`text-sm font-medium ${
                        member.pto_remaining <= 0
                          ? 'text-red-600'
                          : member.pto_remaining <= 16
                          ? 'text-amber-600'
                          : 'text-green-600'
                      }`}>
                        {member.pto_remaining}h
                      </span>
                    ) : (
                      <span className="text-sm text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1 justify-end">
                      {showArchived ? (
                        <button
                          onClick={() => handleRestore(member.id)}
                          title="Restore to active"
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
                        >
                          <RotateCcw className="w-3 h-3" />
                          Restore
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => startEdit(member)}
                            title="Edit"
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleArchive(member.id)}
                            title="Archive"
                            className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
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
