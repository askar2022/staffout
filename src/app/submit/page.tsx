'use client'

import { useState, useEffect, Suspense, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { CheckCircle, Zap, Mail, ArrowRight, RefreshCw, ShieldCheck, Clock, Paperclip, X, CalendarRange } from 'lucide-react'
import { REASON_LABELS, STATUS_LABELS } from '@/lib/types'
import Link from 'next/link'
import { getClientOrgSlug } from '@/lib/org-slug'
import { formatPtoHours } from '@/lib/pto'

type Step = 'email' | 'code' | 'pick' | 'form' | 'done'

/** Staff-facing form — Off-Campus & Personal Day removed per school request; HR can still log those in dashboard */
const statusOptions: {
  value: 'absent' | 'late' | 'leaving_early'
  label: string
  color: string
  desc: string
}[] = [
  { value: 'absent', label: 'Absent', color: 'border-red-300 bg-red-50 text-red-800', desc: 'Not coming in today' },
  { value: 'late', label: 'Late Arrival', color: 'border-amber-300 bg-amber-50 text-amber-800', desc: 'Coming in later than usual' },
  { value: 'leaving_early', label: 'Leaving Early', color: 'border-orange-300 bg-orange-50 text-orange-800', desc: 'Leaving before end of day' },
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
  slug?: string
}

// Maps org slug → public logo file in /public folder
const ORG_LOGOS: Record<string, string> = {
  hba: '/hba.png',
  spa: '/SPA.png',
  wva: '/WVA.jfif',
}

const ORG_HERO_BACKGROUNDS: Record<string, string> = {
  hba: '/Beast_1-scaled.jpg',
}

// Full school names — overrides whatever short name is stored in the database
const ORG_FULL_NAMES: Record<string, string> = {
  hba: 'Harvest Best Academy',
  spa: 'Sankofa Prep',
  wva: 'Wakanda Virtual Academy',
}

function SchoolLogo({ orgSlug, orgName }: { orgSlug: string | null; orgName: string | null }) {
  const [imgError, setImgError] = useState(false)
  const logoSrc = orgSlug ? ORG_LOGOS[orgSlug] : null

  if (logoSrc && !imgError) {
    return (
      <div className="w-20 h-20 rounded-2xl overflow-hidden bg-white flex items-center justify-center mb-2 shadow-lg">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoSrc}
          alt={orgName ?? orgSlug ?? 'School logo'}
          className="w-full h-full object-contain p-1.5"
          onError={() => setImgError(true)}
        />
      </div>
    )
  }

  if (orgSlug && ORG_FULL_NAMES[orgSlug]) {
    // Initials fallback
    const initials = orgSlug.toUpperCase()
    return (
      <div className="w-20 h-20 rounded-2xl bg-white/20 flex items-center justify-center mb-2 shadow-lg">
        <span className="text-white font-black text-2xl tracking-wider">{initials}</span>
      </div>
    )
  }

  return (
    <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-2 shadow-lg">
      <Zap className="w-9 h-9 text-white" />
    </div>
  )
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

  // Pre-fetch org info from subdomain slug on mount
  const [orgSlug] = useState<string | null>(() =>
    typeof window !== 'undefined' ? getClientOrgSlug() : null
  )

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

  // Pre-fetch org info from slug so header shows school name/logo immediately
  useEffect(() => {
    if (!orgSlug || orgSlug === 'demo') return
    fetch(`/api/public/org?slug=${orgSlug}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data) setOrg(data)
      })
      .catch(() => {})
  }, [orgSlug])
  const [status, setStatus] = useState<'' | 'absent' | 'late' | 'leaving_early'>('')
  const [expectedArrival, setExpectedArrival] = useState('')
  const [leaveTime, setLeaveTime] = useState('')
  const [reasonCategory, setReasonCategory] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  // Multi-day
  const [isMultiDay, setIsMultiDay] = useState(false)
  const [endDate, setEndDate] = useState('')

  // Lesson plan
  const lessonPlanRef = useRef<HTMLInputElement>(null)
  const [lessonPlanFile, setLessonPlanFile] = useState<File | null>(null)
  const [lessonPlanUrl, setLessonPlanUrl] = useState<string | null>(null)
  const [uploadingPlan, setUploadingPlan] = useState(false)
  const [uploadError, setUploadError] = useState('')

  // PTO balance
  const [ptoInfo, setPtoInfo] = useState<{ balance: number | null; used: number; remaining: number | null } | null>(null)
  const [submittedPtoDeducted, setSubmittedPtoDeducted] = useState<number | null>(null)

  const isAfter8AM = new Date().getHours() >= 8
  const heroBackground = orgSlug ? ORG_HERO_BACKGROUNDS[orgSlug] : null
  const useFullscreenHero = (step === 'email' || step === 'code' || step === 'form') && !!heroBackground

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
        const staff = data.staff ?? (data.staffList?.[0] ?? null)
        setVerifiedStaff(staff)
        if (staff?.id && data.org?.id) {
          fetch(`/api/pto?staff_id=${staff.id}&org_id=${data.org.id}`)
            .then((r) => r.ok ? r.json() : null)
            .then((d) => { if (d) setPtoInfo(d) })
            .catch(() => {})
        }
        setStep('form')
      }
    }
  }

  async function handleLessonPlanUpload(file: File) {
    if (!org?.id) return
    setUploadingPlan(true)
    setUploadError('')
    const fd = new FormData()
    fd.append('file', file)
    fd.append('org_id', org.id)
    const res = await fetch('/api/lesson-plan/upload', { method: 'POST', body: fd })
    const data = await res.json()
    setUploadingPlan(false)
    if (!res.ok) {
      setUploadError(data.error || 'Upload failed')
      setLessonPlanFile(null)
    } else {
      setLessonPlanUrl(data.url)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!status) return
    if (status === 'late' && !expectedArrival) {
      setSubmitError('Please enter your expected arrival time.')
      return
    }
    if (status === 'leaving_early' && !leaveTime) {
      setSubmitError('Please enter the time you are leaving.')
      return
    }

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
        end_date: isMultiDay && endDate ? endDate : null,
        expected_arrival: status === 'late' ? expectedArrival : null,
        leave_time: status === 'leaving_early' ? leaveTime : null,
        reason_category: reasonCategory || null,
        notes: notes || null,
        lesson_plan_url: lessonPlanUrl || null,
      }),
    })

    const data = await res.json()
    setSubmitting(false)

    if (!res.ok) {
      setSubmitError(data.error || 'Something went wrong. Please try again.')
    } else {
      setSubmittedPtoDeducted(data.pto_hours_deducted ?? null)
      if (verifiedStaff?.id && org?.id) {
        try {
          const ptoRes = await fetch(`/api/pto?staff_id=${verifiedStaff.id}&org_id=${org.id}`)
          const ptoData = await ptoRes.json()
          if (ptoRes.ok) {
            setPtoInfo(ptoData)
          }
        } catch {
          // If refresh fails, keep the previous snapshot and still show success
        }
      }
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
            {status && <> · <span className="text-indigo-600">{STATUS_LABELS[status]}</span></>}
          </div>
          {ptoInfo?.balance !== null && ptoInfo !== null && (
            <div
              className={`mt-3 py-2.5 px-4 rounded-xl text-sm flex items-center gap-2 ${
                (ptoInfo.remaining ?? 0) < 0
                  ? 'bg-red-50 text-red-700'
                  : 'bg-indigo-50 text-indigo-700'
              }`}
            >
              <Clock className="w-4 h-4 shrink-0" />
              <span>
                {(ptoInfo.remaining ?? 0) < 0 ? (
                  <>
                    <span className="font-semibold">
                      Over PTO by {formatPtoHours(Math.abs(ptoInfo.remaining ?? 0))}
                    </span>
                    {' '}after this submission
                  </>
                ) : (
                  <>
                    <span className="font-semibold">{formatPtoHours(ptoInfo.remaining ?? 0)} PTO remaining</span>
                    {' '}after this submission
                  </>
                )}
              </span>
            </div>
          )}
          {submittedPtoDeducted !== null && submittedPtoDeducted > 0 && (
            <p className="mt-2 text-xs text-slate-500">
              PTO deducted for this submission: {formatPtoHours(submittedPtoDeducted)}
            </p>
          )}
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
              setIsMultiDay(false)
              setEndDate('')
              setLessonPlanFile(null)
              setLessonPlanUrl(null)
              setPtoInfo(null)
              setSubmittedPtoDeducted(null)
            }}
            className="mt-5 text-sm text-indigo-600 font-medium hover:underline"
          >
            Submit another
          </button>
        </div>
      </div>
    )
  }

  if (useFullscreenHero && (step === 'email' || step === 'code')) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-slate-950">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={heroBackground}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
          style={{ objectPosition: 'center center' }}
        />
        <div className="absolute inset-0 bg-slate-950/35" />
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/25 via-transparent to-slate-950/30" />

        <div
          className="relative min-h-screen px-4"
          style={{ paddingTop: 'calc(2rem + env(safe-area-inset-top, 0px))' }}
        >
          <div className="max-w-lg mx-auto min-h-screen flex flex-col items-center justify-center py-8">
            <div className="flex flex-col items-center mb-6 text-center">
              <SchoolLogo orgSlug={orgSlug} orgName={org?.name ?? null} />
              <span className="text-white font-extrabold text-2xl tracking-wide mt-2 px-4 text-center drop-shadow-[0_3px_14px_rgba(0,0,0,0.5)]">
                {orgSlug && ORG_FULL_NAMES[orgSlug]
                  ? ORG_FULL_NAMES[orgSlug]
                  : 'OutOfShift'}
              </span>
              <h1 className="mt-4 text-2xl font-bold text-white drop-shadow-[0_3px_14px_rgba(0,0,0,0.5)]">
                Report your absence
              </h1>
            </div>

            {step === 'email' ? (
              <form onSubmit={handleSendCode} className="w-full bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-white/60 overflow-hidden">
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
                    className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4 bg-white"
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
            ) : (
              <form onSubmit={handleVerifyCode} className="w-full bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-white/60 overflow-hidden">
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
                    className="w-full border border-slate-300 rounded-xl px-4 py-4 text-3xl font-bold text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4 font-mono bg-white"
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
                <div className="px-6 pb-4 bg-slate-50/80 border-t border-slate-100">
                  <p className="text-xs text-slate-400 text-center pt-3">
                    Code expires in 10 minutes · Check your spam folder if you don't see it
                  </p>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (useFullscreenHero && step === 'form') {
    return (
      <div className="relative min-h-screen overflow-hidden bg-slate-950 pb-10 pb-safe">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={heroBackground}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
          style={{ objectPosition: 'center center' }}
        />
        <div className="absolute inset-0 bg-slate-950/35" />
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/25 via-transparent to-slate-950/30" />

        <div
          className="relative px-4"
          style={{ paddingTop: 'calc(2rem + env(safe-area-inset-top, 0px))' }}
        >
          <div className="max-w-lg mx-auto">
            <div className="flex flex-col items-center mb-6 text-center">
              <SchoolLogo orgSlug={orgSlug} orgName={org?.name ?? null} />
              <span className="text-white font-extrabold text-2xl tracking-wide mt-2 px-4 text-center drop-shadow-[0_3px_14px_rgba(0,0,0,0.5)]">
                {orgSlug && ORG_FULL_NAMES[orgSlug]
                  ? ORG_FULL_NAMES[orgSlug]
                  : 'OutOfShift'}
              </span>
              <h1 className="mt-4 text-2xl font-bold text-white drop-shadow-[0_3px_14px_rgba(0,0,0,0.5)]">
                Report your absence
              </h1>
            </div>

            <form onSubmit={handleSubmit} className="bg-white/96 backdrop-blur-sm rounded-2xl shadow-xl border border-white/60 overflow-hidden">
              {/* PTO balance banner — only show if balance is set */}
              {ptoInfo?.balance !== null && ptoInfo !== null && (
                <div className={`border-b px-5 py-3 flex items-center gap-2 ${
                  (ptoInfo.remaining ?? 0) <= 0
                    ? 'bg-red-50 border-red-100'
                    : (ptoInfo.remaining ?? 0) <= 16
                    ? 'bg-amber-50 border-amber-100'
                    : 'bg-indigo-50 border-indigo-100'
                }`}>
                  <Clock className={`w-4 h-4 shrink-0 ${
                    (ptoInfo.remaining ?? 0) <= 0 ? 'text-red-500' : (ptoInfo.remaining ?? 0) <= 16 ? 'text-amber-500' : 'text-indigo-500'
                  }`} />
                  <p className="text-sm">
                    <span className="font-semibold">
                      {ptoInfo.remaining !== null ? `${formatPtoHours(ptoInfo.remaining)} PTO remaining` : '—'}
                    </span>
                    <span className="text-slate-500 ml-1">
                      ({formatPtoHours(ptoInfo.used)} used of {formatPtoHours(ptoInfo.balance)})
                    </span>
                  </p>
                </div>
              )}

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
                          <div className="text-xs opacity-80">{opt.desc}</div>
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
                    <p className="mt-1 text-xs text-slate-400">PTO will be deducted from 8:00 AM to the time you select.</p>
                  </div>
                )}

                {status === 'leaving_early' && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Time leaving
                    </label>
                    <input
                      type="time"
                      value={leaveTime}
                      onChange={(e) => setLeaveTime(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <p className="mt-1 text-xs text-slate-400">PTO will be deducted from the time you select until 4:00 PM.</p>
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
                  <p className="mt-1 text-xs text-slate-400">Only visible to your supervisor and admin.</p>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Notes <span className="text-slate-400 font-normal">(optional)</span>
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    maxLength={500}
                    placeholder="Any additional details for your supervisor..."
                    className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  />
                  <p className="mt-1 text-xs text-slate-400">Private — shared only with your supervisor and admin.</p>
                </div>

                {/* Multi-day toggle */}
                {status === 'absent' && (
                  <div className="rounded-xl border border-slate-200 p-4">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isMultiDay}
                        onChange={(e) => setIsMultiDay(e.target.checked)}
                        className="mt-1 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div>
                        <div className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                          <CalendarRange className="w-4 h-4 text-indigo-500" />
                          Multi-day absence
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          Use this if you will be out for more than one weekday.
                        </div>
                      </div>
                    </label>
                    {isMultiDay && (
                      <div className="mt-3">
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Last day out</label>
                        <input
                          type="date"
                          value={endDate}
                          min={new Date().toISOString().split('T')[0]}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Lesson plan upload for teachers */}
                {verifiedStaff?.position?.toLowerCase().includes('teacher') && status === 'absent' && (
                  <div className="rounded-xl border border-slate-200 p-4">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">Lesson plan</p>
                        <p className="text-xs text-slate-500">Attach a lesson plan for your supervisor if needed.</p>
                      </div>
                      {lessonPlanUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            setLessonPlanFile(null)
                            setLessonPlanUrl(null)
                            setUploadError('')
                            if (lessonPlanRef.current) lessonPlanRef.current.value = ''
                          }}
                          className="text-slate-400 hover:text-slate-600"
                          aria-label="Remove lesson plan"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <input
                      ref={lessonPlanRef}
                      type="file"
                      accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                      onChange={async (e) => {
                        const file = e.target.files?.[0] ?? null
                        setLessonPlanFile(file)
                        setLessonPlanUrl(null)
                        setUploadError('')
                        if (file) await handleLessonPlanUpload(file)
                      }}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => lessonPlanRef.current?.click()}
                      className="w-full border-2 border-dashed border-slate-300 rounded-lg px-4 py-4 text-sm text-slate-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors"
                    >
                      <div className="flex items-center justify-center gap-2">
                        <Paperclip className="w-4 h-4" />
                        {uploadingPlan
                          ? 'Uploading lesson plan...'
                          : lessonPlanFile
                          ? `${lessonPlanFile.name}${lessonPlanUrl ? ' uploaded' : ''}`
                          : 'Upload lesson plan'}
                      </div>
                    </button>
                    {uploadError && <p className="mt-2 text-xs text-red-600">{uploadError}</p>}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting || uploadingPlan}
                  className="w-full bg-indigo-600 text-white font-semibold py-3 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  {submitting
                    ? 'Submitting...'
                    : isAfter8AM
                    ? 'Submit — all staff email goes out now'
                    : 'Submit — included in 8:00 AM staff email'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-10 pb-safe">
      {/* Header */}
      <div
        className="relative px-4 pb-12 text-center overflow-hidden bg-indigo-600"
        style={{ paddingTop: 'calc(2rem + env(safe-area-inset-top, 0px))' }}
      >
        <div className="relative max-w-lg mx-auto">
          {/* Logo + app name */}
          <div className="flex flex-col items-center mb-5">
            <SchoolLogo orgSlug={orgSlug} orgName={org?.name ?? null} />
            <span className="text-white font-extrabold text-xl tracking-wide mt-1 px-4 text-center">
              {orgSlug && ORG_FULL_NAMES[orgSlug]
                ? ORG_FULL_NAMES[orgSlug]
                : 'OutOfShift'}
            </span>
          </div>
          {/* Step context */}
          <h1 className="text-xl font-bold text-white mb-1">Report your absence</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 mt-6">

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
                      if (s?.id && org?.id) {
                        fetch(`/api/pto?staff_id=${s.id}&org_id=${org.id}`)
                          .then((r) => r.ok ? r.json() : null)
                          .then((d) => { if (d) setPtoInfo(d) })
                          .catch(() => {})
                      }
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

            {/* PTO balance banner — only show if balance is set */}
            {ptoInfo?.balance !== null && ptoInfo !== null && (
              <div className={`border-b px-5 py-3 flex items-center gap-2 ${
                (ptoInfo.remaining ?? 0) <= 0
                  ? 'bg-red-50 border-red-100'
                  : (ptoInfo.remaining ?? 0) <= 16
                  ? 'bg-amber-50 border-amber-100'
                  : 'bg-indigo-50 border-indigo-100'
              }`}>
                <Clock className={`w-4 h-4 shrink-0 ${
                  (ptoInfo.remaining ?? 0) <= 0 ? 'text-red-500' : (ptoInfo.remaining ?? 0) <= 16 ? 'text-amber-500' : 'text-indigo-500'
                }`} />
                <p className="text-sm">
                  <span className="font-semibold">
                    {ptoInfo.remaining !== null ? `${formatPtoHours(ptoInfo.remaining)} PTO remaining` : '—'}
                  </span>
                  <span className="text-slate-500 ml-1">
                    ({formatPtoHours(ptoInfo.used)} used of {formatPtoHours(ptoInfo.balance)})
                  </span>
                </p>
              </div>
            )}

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
                  <p className="mt-1 text-xs text-slate-400">PTO will be deducted from 8:00 AM to the time you select.</p>
                </div>
              )}

              {status === 'leaving_early' && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Time leaving
                  </label>
                  <input
                    type="time"
                    value={leaveTime}
                    onChange={(e) => setLeaveTime(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="mt-1 text-xs text-slate-400">PTO will be deducted from the time you select until 4:00 PM.</p>
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

              {/* Multi-day toggle — only for absent */}
              {status === 'absent' && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1">
                    <CalendarRange className="w-4 h-4" />
                    Duration
                  </label>
                  <div className="flex gap-2 mb-3">
                    <button
                      type="button"
                      onClick={() => setIsMultiDay(false)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                        !isMultiDay ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Single day
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsMultiDay(true)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                        isMultiDay ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Multiple days
                    </button>
                  </div>
                  {isMultiDay && (
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Last day of absence</label>
                      <input
                        type="date"
                        value={endDate}
                        min={new Date().toISOString().split('T')[0]}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <p className="text-xs text-slate-400 mt-1">Weekends are excluded automatically.</p>
                    </div>
                  )}
                </div>
              )}

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

              {/* Lesson plan upload — teachers only */}
              {verifiedStaff?.position?.toLowerCase().includes('teacher') && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1">
                    <Paperclip className="w-4 h-4" />
                    Lesson Plan <span className="text-slate-400 font-normal">(optional)</span>
                  </label>
                  {uploadError && (
                    <p className="text-xs text-red-600 mb-2">{uploadError}</p>
                  )}
                  {lessonPlanFile ? (
                    <div className="flex items-center gap-2 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                      <Paperclip className="w-4 h-4 text-indigo-500 shrink-0" />
                      <span className="text-sm text-indigo-700 flex-1 truncate">{lessonPlanFile.name}</span>
                      {uploadingPlan ? (
                        <span className="text-xs text-slate-500">Uploading...</span>
                      ) : lessonPlanUrl ? (
                        <span className="text-xs text-green-600 font-medium">✓ Uploaded</span>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => { setLessonPlanFile(null); setLessonPlanUrl(null); setUploadError('') }}
                        className="text-slate-400 hover:text-red-500"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => lessonPlanRef.current?.click()}
                      className="w-full border-2 border-dashed border-slate-300 rounded-lg px-4 py-4 text-sm text-slate-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors"
                    >
                      Click to upload PDF, Word, or image (max 10 MB)
                    </button>
                  )}
                  <input
                    ref={lessonPlanRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) { setLessonPlanFile(f); handleLessonPlanUpload(f) }
                      e.target.value = ''
                    }}
                  />
                  <p className="text-xs text-slate-400 mt-1">Your supervisor will receive a download link in their alert email.</p>
                </div>
              )}
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
                  ? 'Submit — all staff email goes out now'
                  : 'Submit — included in 8:00 AM staff email'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
