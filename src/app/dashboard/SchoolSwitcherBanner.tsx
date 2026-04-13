'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Shield, ArrowLeft } from 'lucide-react'

interface Props {
  orgName: string
}

export default function SchoolSwitcherBanner({ orgName }: Props) {
  const [leaving, setLeaving] = useState(false)
  const router = useRouter()

  async function handleBack() {
    setLeaving(true)
    await fetch('/api/superadmin/impersonate', { method: 'DELETE' })
    router.push('/dashboard')
  }

  return (
    <div className="bg-indigo-600 px-5 py-2.5 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Shield className="w-4 h-4 text-indigo-200 shrink-0" />
        <span className="text-indigo-100 text-sm">
          Platform Admin — managing <strong className="text-white">{orgName}</strong>
        </span>
      </div>
      <button
        onClick={handleBack}
        disabled={leaving}
        className="flex items-center gap-1.5 text-indigo-200 hover:text-white text-sm font-medium transition-colors disabled:opacity-60"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        {leaving ? 'Going back...' : 'Back to platform'}
      </button>
    </div>
  )
}
