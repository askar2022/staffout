'use client'

import { useState } from 'react'
import { ShieldAlert } from 'lucide-react'
import HrExcuseForm from './HrExcuseForm'

export default function HrExcuseButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 bg-purple-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
      >
        <ShieldAlert className="w-4 h-4" />
        Log HR Excuse
      </button>
      {open && (
        <HrExcuseForm
          onClose={() => setOpen(false)}
          onSuccess={() => window.location.reload()}
        />
      )}
    </>
  )
}
