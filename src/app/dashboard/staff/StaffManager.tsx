'use client'

import { useState, useRef } from 'react'
import { Plus, Pencil, Trash2, X, Check, Users, Upload, Download, CheckCircle, AlertCircle, Archive, RotateCcw } from 'lucide-react'
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

  function downloadTemplate() {
    const csv = [
      'Full Name,Email,Position,Campus,Supervisor Name,Supervisor Email',
      'Ms. Johnson,mjohnson@school.org,Math Teacher,Main Campus,Mr. Ahmed,mahmed@school.org',
      'Mr. Hassan,mhassan@school.org,Science Teacher,Main Campus,Mr. Ahmed,mahmed@school.org',
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'staff-import-template.csv'
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
      body: JSON.stringify(form),
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

  async function handleDelete(id: string) {
    if (!confirm('Permanently delete this staff member? This cannot be undone.')) return
    const res = await fetch(`/api/staff/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setStaff((prev) => prev.filter((s) => s.id !== id))
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* CSV import controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={downloadTemplate}
            className="flex items-center gap-2 text-sm font-medium text-slate-600 border border-slate-300 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            Download CSV Template
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
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowArchived(!showArchived)}
            className={`flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-lg border transition-colors ${
              showArchived
                ? 'bg-amber-50 border-amber-300 text-amber-700'
                : 'border-slate-300 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Archive className="w-4 h-4" />
            {showArchived ? `Archived (${archivedStaff.length})` : `Show Archived${archivedStaff.length > 0 ? ` (${archivedStaff.length})` : ''}`}
          </button>
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

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
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
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleStaff.map((member) => (
                <tr key={member.id} className={`hover:bg-slate-50 transition-colors ${showArchived ? 'opacity-70' : ''}`}>
                  <td className="px-5 py-4">
                    <p className="text-sm font-semibold text-slate-900">{member.full_name}</p>
                    {member.email && <p className="text-xs text-slate-400">{member.email}</p>}
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
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1 justify-end">
                      {showArchived ? (
                        <>
                          <button
                            onClick={() => handleRestore(member.id)}
                            title="Restore"
                            className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(member.id)}
                            title="Delete permanently"
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
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
