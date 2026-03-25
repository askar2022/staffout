'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Zap, Mail, Lock, User, AlertCircle, CheckCircle } from 'lucide-react'

export default function SignupPage() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/api/auth/callback?next=/setup`,
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSuccess(true)
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-7 h-7 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Check your email</h2>
          <p className="text-slate-500 text-sm">
            We sent a confirmation link to <strong>{email}</strong>. Click the link to verify your account and continue setup.
          </p>
          <p className="text-xs text-slate-400 mt-4">Check your spam folder if you don't see it.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold text-slate-900">StaffOut</span>
          </Link>
          <p className="text-slate-500 mt-2">Register your school</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <h1 className="text-xl font-bold text-slate-900 mb-1">Register Your School</h1>
          <p className="text-sm text-slate-500 mb-6">Create your account. Once verified you will be reviewed and approved before accessing the dashboard.</p>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg mb-4">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Your full name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your name"
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Work email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@yourschool.org"
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
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white font-semibold py-2.5 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-60"
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-5">
            Already registered?{' '}
            <Link href="/login" className="text-indigo-600 font-medium hover:underline">
              Admin Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
