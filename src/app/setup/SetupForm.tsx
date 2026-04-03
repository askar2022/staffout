'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Zap, User, CheckCircle } from 'lucide-react'

interface Props {
  orgName: string | null
}

export default function SetupForm({ orgName }: Props) {
  const router = useRouter()
  const [adminName, setAdminName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSetup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ admin_name: adminName }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'Setup failed. Please contact support.')
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Zap className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            {orgName ? `Welcome to ${orgName}` : 'Complete your setup'}
          </h1>
          <p className="text-slate-500 mt-2 text-sm">
            You've been invited as an administrator. Just confirm your name to finish.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          {orgName && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm p-3 rounded-lg mb-5">
              <CheckCircle className="w-4 h-4 shrink-0" />
              Your account will be linked to <strong className="ml-1">{orgName}</strong>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSetup} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Your full name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  required
                  autoFocus
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  placeholder="Your full name"
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !adminName.trim()}
              className="w-full bg-indigo-600 text-white font-semibold py-3 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-60 mt-2"
            >
              {loading ? 'Setting up...' : 'Go to dashboard →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
