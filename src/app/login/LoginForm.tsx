'use client'

import { useState, useRef, useLayoutEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Zap, Mail, Lock, AlertCircle, CheckCircle } from 'lucide-react'

interface Props {
  orgName: string | null
  orgSlug: string | null
  isPlatformAdminHost: boolean
}

export default function LoginForm({ orgName, orgSlug, isPlatformAdminHost }: Props) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resetSent, setResetSent] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const loginInFlight = useRef(false)
  /** False until we clear stale cookies — stops Chrome refresh-token storms (429 loops) */
  const [authReady, setAuthReady] = useState(false)

  useLayoutEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const supabase = createClient()
        // Stale or cross-subdomain cookies make the client spam /token?grant_type=refresh_token → 429 → hang
        await supabase.auth.signOut({ scope: 'local' })
      } catch {
        // ignore
      }
      if (!cancelled) setAuthReady(true)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  function formatAuthError(message: string | undefined): string {
    if (!message) return 'Sign in failed'
    const lower = message.toLowerCase()
    if (lower.includes('rate limit') || lower.includes('too many requests')) {
      return 'Too many sign-in attempts were detected. Wait 10–15 minutes, then try again. If this keeps happening in Chrome, close other OutOfShift tabs, turn off extensions, or try another browser.'
    }
    if (lower.includes('timeout') || lower.includes('network') || lower.includes('fetch')) {
      return 'Connection timed out. In Chrome: Settings → Privacy → clear cookies for outofshift.com, close all OutOfShift tabs, then try again.'
    }
    return message
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!authReady || loginInFlight.current || loading) return
    loginInFlight.current = true
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError || !data.user) {
      setError(formatAuthError(authError?.message))
      setLoading(false)
      loginInFlight.current = false
      return
    }

    // If on root domain, hard redirect to the platform dashboard so cookies are fully sent
    if (!orgSlug) {
      window.location.href = '/dashboard'
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  async function handleForgotPassword() {
    if (!authReady) return
    if (!email) {
      setError('Enter your email address above first, then click Forgot password.')
      return
    }
    setResetLoading(true)
    setError('')
    const supabase = createClient()
    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'outofshift.com'
    const protocol = window.location.protocol
    const redirectTo = `${protocol}//${rootDomain}/auth/callback?next=/auth/reset-password`
    await supabase.auth.resetPasswordForEmail(email, { redirectTo })
    setResetSent(true)
    setResetLoading(false)
  }

  const isSchoolSubdomain = !!orgSlug

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4 pb-safe" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold text-slate-900">StaffOut</span>
          </Link>
          <p className="text-slate-500 mt-2 text-sm">
            {isPlatformAdminHost ? (
              'Platform admin sign in'
            ) : isSchoolSubdomain && orgName ? (
              <>Admin sign in · <span className="font-medium text-slate-700">{orgName}</span></>
            ) : (
              'Admin sign in'
            )}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <h1 className="text-xl font-bold text-slate-900 mb-6">Welcome back</h1>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg mb-4">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={isPlatformAdminHost ? 'owner@outofshift.com' : 'admin@yourschool.org'}
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !authReady}
              className="w-full bg-indigo-600 text-white font-semibold py-2.5 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {!authReady ? 'Preparing…' : loading ? 'Signing in...' : 'Sign in'}
            </button>

            {resetSent ? (
              <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm p-3 rounded-lg">
                <CheckCircle className="w-4 h-4 shrink-0" />
                Password reset link sent — check your email.
              </div>
            ) : (
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={resetLoading || !authReady}
                className="w-full text-sm text-slate-400 hover:text-indigo-600 transition-colors text-center disabled:opacity-50"
              >
                {resetLoading ? 'Sending...' : 'Forgot password?'}
              </button>
            )}
          </form>

        </div>

        <details className="mt-5 text-left max-w-md mx-auto rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600">
          <summary className="cursor-pointer font-semibold text-slate-700 list-none flex items-center justify-between">
            <span>Trouble signing in (Chrome freezes or &quot;rate limit&quot;)?</span>
            <span className="text-slate-400" aria-hidden>▼</span>
          </summary>
          <ol className="mt-3 space-y-2 list-decimal pl-4 leading-relaxed">
            <li>
              <strong className="text-slate-700">Use Microsoft Edge</strong> for this site — it often works when Chrome does not, and can stay signed in.
            </li>
            <li>
              In Chrome: close <strong>every</strong> OutOfShift tab, then open Settings → Privacy → delete browsing data → only <strong>Cookies</strong> for this site (or search for <strong>outofshift</strong> under Cookies and remove them).
            </li>
            <li>
              Wait <strong>10–15 minutes</strong> if you see a rate-limit message, then try again once.
            </li>
          </ol>
        </details>

        {!isPlatformAdminHost && (
          <p className="text-center text-xs text-slate-400 mt-6">
            Staff submitting an absence?{' '}
            <Link href="/submit" className="text-indigo-500 hover:underline">
              Go to the form →
            </Link>
          </p>
        )}
      </div>
    </div>
  )
}
