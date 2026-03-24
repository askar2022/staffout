'use client'

import { useState } from 'react'
import { Plus, Pencil, Trash2, X, Check, Users } from 'lucide-react'
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

  async function handleDelete(id: string) {
    if (!confirm('Remove this staff member?')) return
    const res = await fetch(`/api/staff/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setStaff((prev) => prev.filter((s) => s.id !== id))
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={startAdd}
          className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-semibold px-4 py-2.5 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add staff member
        </button>
      </div>

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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { key: 'full_name', label: 'Full name *', placeholder: 'Ms. Johnson', type: 'text' },
              { key: 'email', label: 'Email', placeholder: 'name@school.org', type: 'email' },
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
            <p className="text-slate-400 text-sm mt-1">Add your team so they can select their name in the form.</p>
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
              {staff.map((member) => (
                <tr key={member.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-4">
                    <p className="text-sm font-semibold text-slate-900">{member.full_name}</p>
                    {member.email && <p className="text-xs text-slate-400">{member.email}</p>}
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
                      <button
                        onClick={() => startEdit(member)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(member.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
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
