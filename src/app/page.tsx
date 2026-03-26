'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Zap, ArrowRight } from 'lucide-react'

export default function HomePage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/otp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error || 'Could not send code. Check your email address.')
    } else {
      // Pass email to /submit via query param to continue the flow
      router.push(`/submit?email=${encodeURIComponent(email)}`)
    }
  }

  return (
    <div className="min-h-screen bg-indigo-600 flex flex-col">

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-16">

        {/* Logo */}
        <div className="flex items-center gap-2 mb-10">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="text-2xl font-bold text-white">Absence</span>
        </div>

        {/* Card */}
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-xl font-bold text-slate-900 mb-1">Report your absence</h1>
          <p className="text-slate-500 text-sm mb-6">
            Enter your work email to receive a 6-digit verification code.
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSend} className="space-y-3">
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="yourname@school.org"
              className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="submit"
              disabled={loading || !email}
              className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? 'Sending code...' : <>Send verification code <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>
        </div>

      </div>

      {/* Footer */}
      <div className="pb-8 flex flex-col items-center gap-3">
        <div className="flex items-center gap-4 text-sm">
          <Link href="/login" className="text-indigo-200 hover:text-white font-medium transition-colors">
            Admin Sign In
          </Link>
          <span className="text-indigo-400">·</span>
          <Link href="/signup" className="text-indigo-200 hover:text-white font-medium transition-colors">
            Register Your School
          </Link>
        </div>
        <p className="text-indigo-400 text-xs">© {new Date().getFullYear()} StaffOut by Automation LLC</p>
      </div>

    </div>
  )
}
