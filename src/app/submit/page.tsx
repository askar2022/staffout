'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { CheckCircle, Zap, Mail, ArrowRight, RefreshCw, ShieldCheck } from 'lucide-react'
import type { SubmissionStatus } from '@/lib/types'
import { REASON_LABELS, STATUS_LABELS } from '@/lib/types'
import Link from 'next/link'
import { getClientOrgSlug } from '@/lib/org-slug'

type Step = 'email' | 'code' | 'pick' | 'form' | 'done'

const statusOptions: {
  value: SubmissionStatus
  label: string
  color: string
  desc: string
}[] = [
  { value: 'absent', label: 'Absent', color: 'border-red-300 bg-red-50 text-red-800', desc: 'Not coming in today' },
  { value: 'late', label: 'Late Arrival', color: 'border-amber-300 bg-amber-50 text-amber-800', desc: 'Coming in later than usual' },
  { value: 'leaving_early', label: 'Leaving Early', color: 'border-orange-300 bg-orange-50 text-orange-800', desc: 'Leaving before end of day' },
  { value: 'appointment', label: 'Off-Campus Appointment', color: 'border-blue-300 bg-blue-50 text-blue-800', desc: 'Stepping out for an appointment' },
  { value: 'personal_day', label: 'Personal Day', color: 'border-purple-300 bg-purple-50 text-purple-800', desc: 'Using a personal day' },
]

interface VerifiedStaff {
  id: string
  full_name: string
  position: string | null
  campus: string | null
  supervisor_email: string | null
  supervisor_name: string | null
}

interface OrgInfo {
  id: string
  name: string
}

export default function SubmitPage() {
  return (
    <Suspense>
      <SubmitForm />
    </Suspense>
  )
}

function SubmitForm() {
  const searchParams = useSearchParams()
  const [step, setStep] = useState<Step>('email')

  // Step 1 — email
  const [email, setEmail] = useState('')
  const [sendingCode, setSendingCode] = useState(false)
  const [sendError, setSendError] = useState('')

  // If arriving from homepage with email already sent, skip to code step
  useEffect(() => {
    const prefilledEmail = searchParams.get('email')
    if (prefilledEmail) {
      setEmail(prefilledEmail)
      setStep('code')
    }
  }, [searchParams])

  // Step 2 — OTP
  const [code, setCode] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [verifyError, setVerifyError] = useState('')

  // Step 2.5 — pick (when multiple staff share the same email)
  const [staffList, setStaffList] = useState<VerifiedStaff[]>([])

  // Step 3 — form
  const [verifiedStaff, setVerifiedStaff] = useState<VerifiedStaff | null>(null)
  const [org, setOrg] = useState<OrgInfo | null>(null)
  const [status, setStatus] = useState<SubmissionStatus | ''>('')
  const [expectedArrival, setExpectedArrival] = useState('')
  const [leaveTime, setLeaveTime] = useState('')
  const [reasonCategory, setReasonCategory] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const isAfter8AM = new Date().getHours() >= 8

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault()
    setSendingCode(true)
    setSendError('')

    const res = await fetch('/api/otp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, org_slug: getClientOrgSlug() }),
    })

    const data = await res.json()
    setSendingCode(false)

    if (!res.ok) {
      setSendError(data.error || 'Failed to send code. Try again.')
    } else {
      setStep('code')
    }
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault()
    setVerifying(true)
    setVerifyError('')

    const res = await fetch('/api/otp/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code }),
    })

    const data = await res.json()
    setVerifying(false)

    if (!res.ok) {
      setVerifyError(data.error || 'Invalid code. Try again.')
    } else {
      setOrg(data.org)
      if (data.staffList && data.staffList.length > 1) {
        setStaffList(data.staffList)
        setStep('pick')
      } else {
        setVerifiedStaff(data.staff ?? (data.staffList?.[0] ?? null))
        setStep('form')
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!status) return

    setSubmitting(true)
    setSubmitError('')

    const res = await fetch('/api/submissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        organization_id: org?.id ?? null,
        staff_id: verifiedStaff?.id ?? null,
        staff_name: verifiedStaff?.full_name ?? email,
        staff_email: email,
        campus: verifiedStaff?.campus ?? null,
        supervisor_email: verifiedStaff?.supervisor_email ?? null,
        supervisor_name: verifiedStaff?.supervisor_name ?? null,
        status,
        date: new Date().toISOString().split('T')[0],
        expected_arrival: status === 'late' ? expectedArrival : null,
        leave_time: (status === 'leaving_early' || status === 'appointment') ? leaveTime : null,
        reason_category: reasonCategory || null,
        notes: notes || null,
      }),
    })

    const data = await res.json()
    setSubmitting(false)

    if (!res.ok) {
      setSubmitError(data.error || 'Something went wrong. Please try again.')
    } else {
      setStep('done')
    }
  }

  // ── Step: Done ──────────────────────────────────────────────────────────────
  if (step === 'done') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 safe-area-top pb-safe">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Submitted successfully</h2>
          <p className="text-slate-500 text-sm leading-relaxed">
            {isAfter8AM
              ? 'Your absence has been recorded. An instant alert has been sent to the relevant staff.'
              : 'Your absence has been recorded and will be included in the 8:00 AM morning summary.'}
          </p>
          <div className="mt-4 py-3 px-4 bg-slate-50 rounded-xl text-sm text-slate-600">
            <span className="font-medium">{verifiedStaff?.full_name ?? email}</span>
            {status && <> · <span className="text-indigo-600">{STATUS_LABELS[status as SubmissionStatus]}</span></>}
          </div>
          <button
            onClick={() => {
              setStep('email')
              setEmail('')
              setCode('')
              setStatus('')
              setVerifiedStaff(null)
              setOrg(null)
              setNotes('')
              setReasonCategory('')
              setExpectedArrival('')
              setLeaveTime('')
            }}
            className="mt-5 text-sm text-indigo-600 font-medium hover:underline"
          >
            Submit another
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-10 pb-safe">
      {/* Header */}
      <div className="bg-indigo-600 px-4 pb-20 text-center" style={{ paddingTop: 'calc(2rem + env(safe-area-inset-top, 0px))' }}>
        <div className="max-w-lg mx-auto">
          {/* Logo + app name */}
          <div className="flex flex-col items-center mb-5">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-3 shadow-lg">
              <Zap className="w-9 h-9 text-white" />
            </div>
            <span className="text-white font-extrabold text-2xl tracking-wide">StaffOut</span>
            {org?.name && (
              <span className="text-indigo-200 text-sm font-medium mt-1">{org.name}</span>
            )}
          </div>
          {/* Step context */}
          <h1 className="text-xl font-bold text-white mb-1">Report your absence</h1>
          <p className="text-indigo-200 text-sm">
            {step === 'email' && 'Enter your work email to get started'}
            {step === 'code' && 'Enter the code sent to your email'}
            {step === 'pick' && 'Select your name to continue'}
            {step === 'form' && (isAfter8AM ? 'After 8:00 AM — instant alert will be sent' : 'Before 8:00 AM — included in morning summary')}
          </p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 -mt-10">

        {/* ── Step 1: Email ── */}
        {step === 'email' && (
          <form onSubmit={handleSendCode} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6">
              <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mb-4">
                <Mail className="w-6 h-6 text-indigo-600" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 mb-1">Enter your work email</h2>
              <p className="text-slate-500 text-sm mb-5">
                We will send a 6-digit verification code to confirm your identity.
              </p>

              {sendError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg mb-4">
                  {sendError}
                </div>
              )}

              <input
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="yourname@school.org"
                className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4"
              />

              <button
                type="submit"
                disabled={sendingCode || !email}
                className="w-full bg-indigo-600 text-white font-semibold py-3 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {sendingCode ? 'Sending code...' : <>Send verification code <ArrowRight className="w-4 h-4" /></>}
              </button>
            </div>
            <div className="px-6 pb-5">
              <p className="text-xs text-slate-400 text-center">
                Admin?{' '}
                <Link href="/login" className="text-indigo-500 hover:underline">Sign in to dashboard</Link>
              </p>
            </div>
          </form>
        )}

        {/* ── Step 2: OTP Code ── */}
        {step === 'code' && (
          <form onSubmit={handleVerifyCode} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4">
                <ShieldCheck className="w-6 h-6 text-green-600" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 mb-1">Check your email</h2>
              <p className="text-slate-500 text-sm mb-1">
                We sent a 6-digit code to:
              </p>
              <p className="font-semibold text-slate-800 text-sm mb-5">{email}</p>

              {verifyError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg mb-4">
                  {verifyError}
                </div>
              )}

              <input
                type="text"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                required
                autoFocus
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="w-full border border-slate-300 rounded-xl px-4 py-4 text-3xl font-bold text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4 font-mono"
              />

              <button
                type="submit"
                disabled={verifying || code.length !== 6}
                className="w-full bg-indigo-600 text-white font-semibold py-3 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {verifying ? 'Verifying...' : <>Verify code <ShieldCheck className="w-4 h-4" /></>}
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep('email')
                  setCode('')
                  setVerifyError('')
                }}
                className="w-full mt-3 text-sm text-slate-500 hover:text-slate-700 flex items-center justify-center gap-1"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Use a different email or resend code
              </button>
            </div>
            <div className="px-6 pb-4 bg-slate-50 border-t border-slate-100">
              <p className="text-xs text-slate-400 text-center pt-3">
                Code expires in 10 minutes · Check your spam folder if you don't see it
              </p>
            </div>
          </form>
        )}

        {/* ── Step 2.5: Who are you? ── */}
        {step === 'pick' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6">
              <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mb-4">
                <ShieldCheck className="w-6 h-6 text-indigo-600" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 mb-1">Who are you submitting for?</h2>
              <p className="text-slate-500 text-sm mb-5">
                Multiple staff members share this email. Select your name.
              </p>
              <div className="grid grid-cols-1 gap-2">
                {staffList.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setVerifiedStaff(s)
                      setStep('form')
                    }}
                    className="flex items-start gap-3 p-4 rounded-xl border-2 border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 transition-all text-left"
                  >
                    <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 text-indigo-700 font-bold text-sm">
                      {s.full_name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{s.full_name}</p>
                      {s.position && <p className="text-xs text-slate-500">{s.position}{s.campus ? ` · ${s.campus}` : ''}</p>}
                      {s.supervisor_name && <p className="text-xs text-slate-400 mt-0.5">Supervisor: {s.supervisor_name}</p>}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Step 3: Absence Form ── */}
        {step === 'form' && (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">

            {/* Verified identity banner */}
            <div className="bg-green-50 border-b border-green-100 px-5 py-3 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-green-600 shrink-0" />
              <div>
                <span className="text-sm font-semibold text-green-800">
                  {verifiedStaff?.full_name ?? email}
                </span>
                {verifiedStaff?.position && (
                  <span className="text-xs text-green-600 ml-2">· {verifiedStaff.position}</span>
                )}
              </div>
            </div>

            {submitError && (
              <div className="bg-red-50 border-b border-red-200 text-red-700 text-sm px-5 py-3">
                {submitError}
              </div>
            )}

            <div className="p-6 space-y-5">
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
                <select
                  value={reasonCategory}
                  onChange={(e) => setReasonCategory(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="">Select a reason...</option>
                  {Object.entries(REASON_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
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
                disabled={submitting || !status}
                className="w-full bg-indigo-600 text-white font-semibold py-3.5 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 text-base"
              >
                {submitting
                  ? 'Submitting...'
                  : isAfter8AM
                  ? 'Submit — instant alert will be sent'
                  : 'Submit — included in 8:00 AM summary'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
