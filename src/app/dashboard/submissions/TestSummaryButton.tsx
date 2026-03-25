'use client'

import { useState } from 'react'
import { Send, CheckCircle, AlertCircle } from 'lucide-react'

export default function TestSummaryButton() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  async function handleTest() {
    if (!confirm('Send a test summary email to all your configured recipients right now?')) return
    setLoading(true)
    setResult(null)

    const res = await fetch('/api/test-summary', { method: 'POST' })
    const data = await res.json()
    setLoading(false)

    if (res.ok) {
      setResult({
        success: true,
        message: `Test email sent to ${data.sentTo?.join(', ')} with ${data.submissionsIncluded} submission(s).`,
      })
    } else {
      setResult({ success: false, message: data.error || 'Failed to send test email.' })
    }

    setTimeout(() => setResult(null), 8000)
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        onClick={handleTest}
        disabled={loading}
        className="flex items-center gap-2 bg-slate-800 text-white text-sm font-semibold px-4 py-2.5 rounded-lg hover:bg-slate-700 disabled:opacity-50 transition-colors"
      >
        <Send className="w-4 h-4" />
        {loading ? 'Sending...' : 'Send Test Summary Now'}
      </button>
      {result && (
        <div className={`flex items-start gap-2 text-xs px-3 py-2 rounded-lg max-w-xs text-right ${
          result.success
            ? 'bg-green-50 border border-green-200 text-green-800'
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {result.success
            ? <CheckCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            : <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />}
          {result.message}
        </div>
      )}
    </div>
  )
}
