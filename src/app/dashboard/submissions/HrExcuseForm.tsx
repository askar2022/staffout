'use client'

import { useState, useEffect } from 'react'
import { X, ShieldAlert, Check, AlertCircle } from 'lucide-react'
import type { StaffMember } from '@/lib/types'

const STATUS_OPTIONS = [
  { value: 'absent', label: 'Absent (Full Day)' },
  { value: 'late', label: 'Late Arrival' },
  { value: 'leaving_early', label: 'Leaving Early' },
  { value: 'appointment', label: 'Off-Campus Appointment' },
  { value: 'personal_day', label: 'Personal Day' },
]

const REASON_OPTIONS = [
  { value: 'sick', label: 'Sick / Not Feeling Well' },
  { value: 'personal', label: 'Personal Reason' },
  { value: 'family', label: 'Family Matter' },
  { value: 'medical', label: 'Medical Appointment' },
  { value: 'other', label: 'Other' },
]

interface Props {
  onClose: () => void
  onSuccess: () => void
}

export default function HrExcuseForm({ onClose, onSuccess }: Props) {
  const [staffList, setStaffList] = useState<StaffMember[]>([])
  const [loadingStaff, setLoadingStaff] = useState(true)

  const [staffId, setStaffId] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [status, setStatus] = useState('absent')
  const [reasonCategory, setReasonCategory] = useState('')
  const [notes, setNotes] = useState('')
  const [hrNote, setHrNote] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    fetch('/api/staff')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.staff) setStaffList(data.staff)
        setLoadingStaff(false)
      })
      .catch(() => setLoadingStaff(false))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!staffId) { setError('Please select a staff member'); return }
    setSubmitting(true)
    setError('')

    const res = await fetch('/api/submissions/hr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ staff_id: staffId, date, status, reason_category: reasonCategory || null, notes: notes || null, hr_note: hrNote || null }),
    })

    const data = await res.json()
    setSubmitting(false)

    if (!res.ok) {
      setError(data.error || 'Failed to submit')
    } else {
      setDone(true)
      setTimeout(() => { onSuccess(); onClose() }, 1800)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">

        {/* Header */}
        <div className="bg-purple-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-white" />
            <div>
              <p className="text-white font-bold text-base">Log HR Excuse</p>
              <p className="text-purple-200 text-xs">Submit absence on behalf of staff member</p>
            </div>
          </div>
          <button onClick={onClose} className="text-purple-200 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {done ? (
          <div className="p-10 text-center">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-7 h-7 text-green-600" />
            </div>
            <p className="text-lg font-bold text-slate-900">Excuse Logged</p>
            <p className="text-sm text-slate-500 mt-1">Emails sent to employee, supervisor, and staff.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="bg-purple-50 border border-purple-200 rounded-lg px-4 py-3 text-sm text-purple-800">
              The employee will receive an <strong>accountability email</strong>. Their supervisor and all staff will be notified as usual.
            </div>

            {/* Staff picker */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Staff Member *</label>
              <select
                value={staffId}
                onChange={(e) => setStaffId(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                disabled={loadingStaff}
              >
                <option value="">{loadingStaff ? 'Loading staff...' : '— Select staff member —'}</option>
                {staffList.map((s) => (
                  <option key={s.id} value={s.id}>{s.full_name}{s.position ? ` · ${s.position}` : ''}</option>
                ))}
              </select>
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Absence Date *</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* Status + Reason */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Status *</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Reason</label>
                <select
                  value={reasonCategory}
                  onChange={(e) => setReasonCategory(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                >
                  <option value="">— Optional —</option>
                  {REASON_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* HR internal note */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                HR Internal Note <span className="font-normal text-slate-400">(sent to employee)</span>
              </label>
              <input
                type="text"
                value={hrNote}
                onChange={(e) => setHrNote(e.target.value)}
                placeholder="e.g. Called HR at 8:15am, forgot to submit"
                maxLength={300}
                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* Optional notes */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Additional Notes <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any other details..."
                rows={2}
                maxLength={500}
                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              />
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 flex items-center justify-center gap-2 bg-purple-600 text-white font-semibold py-2.5 rounded-lg hover:bg-purple-700 disabled:opacity-60 transition-colors text-sm"
              >
                <ShieldAlert className="w-4 h-4" />
                {submitting ? 'Submitting...' : 'Log HR Excuse & Notify All'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 text-sm font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
