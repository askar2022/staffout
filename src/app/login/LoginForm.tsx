'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Zap, Mail, Lock, AlertCircle, CheckCircle } from 'lucide-react'

interface Props {
  orgName: string | null
  orgSlug: string | null
}

export default function LoginForm({ orgName, orgSlug }: Props) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resetSent, setResetSent] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError || !data.user) {
      setError(authError?.message ?? 'Sign in failed')
      setLoading(false)
      return
    }

    // If on root domain and user has an org, redirect them to their subdomain
    if (!orgSlug) {
      const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'outofshift.com'
      const isSuperAdmin = data.user.email === process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL

      if (isSuperAdmin) {
        router.push('/superadmin')
        router.refresh()
        return
      }

      // Look up their org slug so we can redirect to the right subdomain
      const res = await fetch('/api/public/my-org')
      if (res.ok) {
        const orgData = await res.json()
        if (orgData.slug) {
          const protocol = window.location.protocol
          window.location.href = `${protocol}//${orgData.slug}.${rootDomain}/dashboard`
          return
        }
      }
    }

    router.push('/dashboard')
    router.refresh()
  }

  async function handleForgotPassword() {
    if (!email) {
      setError('Enter your email address above first, then click Forgot password.')
      return
    }
    setResetLoading(true)
    setError('')
    const supabase = createClient()
    const redirectTo = `${window.location.origin}/login`
    await supabase.auth.resetPasswordForEmail(email, { redirectTo })
    setResetSent(true)
    setResetLoading(false)
  }

  const isSubdomain = !!orgSlug

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4 safe-area-top pb-safe">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold text-slate-900">StaffOut</span>
          </Link>
          <p className="text-slate-500 mt-2 text-sm">
            {isSubdomain && orgName ? (
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
                  placeholder="admin@yourschool.org"
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
              disabled={loading}
              className="w-full bg-indigo-600 text-white font-semibold py-2.5 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign in'}
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
                disabled={resetLoading}
                className="w-full text-sm text-slate-400 hover:text-indigo-600 transition-colors text-center"
              >
                {resetLoading ? 'Sending...' : 'Forgot password?'}
              </button>
            )}
          </form>

        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          Staff submitting an absence?{' '}
          <Link href="/submit" className="text-indigo-500 hover:underline">
            Go to the form →
          </Link>
        </p>
      </div>
    </div>
  )
}
