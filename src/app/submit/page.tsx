'use client'

import { useState, useEffect } from 'react'
import { CheckCircle, Zap, ChevronDown } from 'lucide-react'
import type { SubmissionStatus } from '@/lib/types'
import { REASON_LABELS } from '@/lib/types'
import Link from 'next/link'

interface StaffOption {
  id: string
  full_name: string
  campus: string | null
  position: string | null
}

interface OrgInfo {
  id: string
  name: string
}

const statusOptions: { value: SubmissionStatus; label: string; color: string; desc: string }[] = [
  { value: 'absent', label: 'Absent', color: 'border-red-300 bg-red-50 text-red-800', desc: 'Not coming in today' },
  { value: 'late', label: 'Late Arrival', color: 'border-amber-300 bg-amber-50 text-amber-800', desc: 'Coming in later than usual' },
  { value: 'leaving_early', label: 'Leaving Early', color: 'border-orange-300 bg-orange-50 text-orange-800', desc: 'Leaving before the end of day' },
  { value: 'appointment', label: 'Off-Campus Appointment', color: 'border-blue-300 bg-blue-50 text-blue-800', desc: 'Stepping out for an appointment' },
  { value: 'personal_day', label: 'Personal Day', color: 'border-purple-300 bg-purple-50 text-purple-800', desc: 'Using a personal day' },
]

export default function SubmitPage() {
  const [org, setOrg] = useState<OrgInfo | null>(null)
  const [staffList, setStaffList] = useState<StaffOption[]>([])
  const [loading, setLoading] = useState(true)

  const [selectedStaffId, setSelectedStaffId] = useState<string>('')
  const [manualName, setManualName] = useState('')
  const [status, setStatus] = useState<SubmissionStatus | ''>('')
  const [expectedArrival, setExpectedArrival] = useState('')
  const [leaveTime, setLeaveTime] = useState('')
  const [reasonCategory, setReasonCategory] = useState('')
  const [notes, setNotes] = useState('')
  const [campus, setCampus] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    // Read the secret token from the URL: /submit?token=abc123
    const token = new URLSearchParams(window.location.search).get('token') || ''
    const url = token ? `/api/public/form-data?token=${encodeURIComponent(token)}` : '/api/public/form-data'

    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (data.org) setOrg(data.org)
        if (data.staff) setStaffList(data.staff)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function handleStaffSelect(value: string) {
    setSelectedStaffId(value)
    if (value && value !== '__manual') {
      const member = staffList.find((s) => s.id === value)
      if (member) setCampus(member.campus ?? '')
    } else {
      setCampus('')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!status || !org) return

    setSubmitting(true)
    setError('')

    const isListed = selectedStaffId && selectedStaffId !== '__manual'
    const staffName = isListed
      ? staffList.find((s) => s.id === selectedStaffId)?.full_name ?? manualName
      : manualName

    const res = await fetch('/api/submissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        organization_id: org.id,
        staff_id: isListed ? selectedStaffId : null,
        staff_name: staffName,
        campus: campus || null,
        status,
        date: new Date().toISOString().split('T')[0],
        expected_arrival: status === 'late' ? expectedArrival : null,
        leave_time: (status === 'leaving_early' || status === 'appointment') ? leaveTime : null,
        reason_category: reasonCategory || null,
        notes: notes || null,
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      setError(data.error || 'Something went wrong. Please try again.')
      setSubmitting(false)
    } else {
      setSubmitted(true)
    }
  }

  const isAfter8AM = new Date().getHours() >= 8
  const showManualName = !staffList.length || selectedStaffId === '__manual'

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-pulse text-slate-400 text-sm">Loading...</div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Submitted successfully</h2>
          <p className="text-slate-500 text-sm leading-relaxed">
            {isAfter8AM
              ? 'Your submission has been received. An alert has been sent to the relevant staff.'
              : 'Your submission has been recorded and will be included in the 8:00 AM morning summary email.'}
          </p>
          <button
            onClick={() => {
              setSubmitted(false)
              setStatus('')
              setSelectedStaffId('')
              setManualName('')
              setNotes('')
              setReasonCategory('')
              setExpectedArrival('')
              setLeaveTime('')
              setCampus('')
            }}
            className="mt-6 text-sm text-indigo-600 font-medium hover:underline"
          >
            Submit another
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      {/* Header */}
      <div className="bg-indigo-600 px-4 pt-10 pb-16">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="text-white/80 text-sm font-medium">{org?.name || 'StaffOut'}</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Report your absence</h1>
          <p className="text-indigo-200 text-sm mt-1">
            {isAfter8AM
              ? 'After 8:00 AM — an instant alert will be sent right away.'
              : 'Before 8:00 AM — your report will be included in the morning summary.'}
          </p>
        </div>
      </div>

      {/* Form card */}
      <div className="max-w-lg mx-auto px-4 -mt-8">
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">

          {error && (
            <div className="bg-red-50 border-b border-red-200 text-red-700 text-sm px-6 py-3">
              {error}
            </div>
          )}

          <div className="p-6 space-y-5">
            {/* Staff name */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Your name</label>
              {staffList.length > 0 && (
                <div className="relative mb-2">
                  <select
                    required={!showManualName}
                    value={selectedStaffId}
                    onChange={(e) => handleStaffSelect(e.target.value)}
                    className="w-full appearance-none border border-slate-300 rounded-lg px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white pr-8"
                  >
                    <option value="">Select your name...</option>
                    {staffList.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.full_name}{s.position ? ` — ${s.position}` : ''}
                      </option>
                    ))}
                    <option value="__manual">My name is not listed</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              )}

              {showManualName && (
                <input
                  type="text"
                  required
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              )}
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Status today</label>
              <div className="grid grid-cols-1 gap-2">
                {statusOptions.map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                      status === opt.value
                        ? opt.color + ' border-current'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="status"
                      value={opt.value}
                      required
                      checked={status === opt.value}
                      onChange={() => setStatus(opt.value)}
                      className="hidden"
                    />
                    <div className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${
                      status === opt.value ? 'border-current bg-current' : 'border-slate-300'
                    }`}>
                      {status === opt.value && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    <div>
                      <div className="text-sm font-semibold">{opt.label}</div>
                      <div className="text-xs opacity-70">{opt.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Time fields */}
            {status === 'late' && (
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Expected arrival time</label>
                <input
                  type="time"
                  value={expectedArrival}
                  onChange={(e) => setExpectedArrival(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            )}

            {(status === 'leaving_early' || status === 'appointment') && (
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  {status === 'leaving_early' ? 'Time leaving' : 'Time stepping out'}
                </label>
                <input
                  type="time"
                  value={leaveTime}
                  onChange={(e) => setLeaveTime(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            )}

            {/* Reason */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Reason <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <div className="relative">
                <select
                  value={reasonCategory}
                  onChange={(e) => setReasonCategory(e.target.value)}
                  className="w-full appearance-none border border-slate-300 rounded-lg px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white pr-8"
                >
                  <option value="">Select a reason...</option>
                  {Object.entries(REASON_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
              <p className="text-xs text-slate-400 mt-1">Only visible to your supervisor and admin.</p>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Notes <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional details for your supervisor..."
                rows={3}
                maxLength={500}
                className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
              <p className="text-xs text-slate-400 mt-1">Private — shared only with your supervisor and admin.</p>
            </div>
          </div>

          <div className="px-6 pb-6">
            <button
              type="submit"
              disabled={submitting || !status || (!selectedStaffId && !manualName)}
              className="w-full bg-indigo-600 text-white font-semibold py-3.5 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-base"
            >
              {submitting
                ? 'Submitting...'
                : isAfter8AM
                ? 'Submit — instant alert will be sent'
                : 'Submit — included in 8:00 AM summary'}
            </button>
          </div>
        </form>

        <p className="text-center text-xs text-slate-400 mt-4">
          Admin?{' '}
          <Link href="/login" className="text-indigo-500 hover:underline">
            Sign in to dashboard
          </Link>
        </p>
      </div>
    </div>
  )
}
