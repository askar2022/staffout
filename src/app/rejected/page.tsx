import { XCircle, Zap } from 'lucide-react'
import Link from 'next/link'

export default function RejectedPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <XCircle className="w-8 h-8 text-red-500" />
        </div>

        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-bold text-slate-900">StaffOut</span>
        </div>

        <h1 className="text-2xl font-bold text-slate-900 mb-3">
          Account not approved
        </h1>
        <p className="text-slate-500 leading-relaxed mb-6">
          Your account application was not approved at this time.
          Please contact support if you believe this is a mistake.
        </p>

        <a
          href="mailto:support@outofshift.com"
          className="inline-block bg-indigo-600 text-white font-semibold px-6 py-2.5 rounded-lg hover:bg-indigo-700 transition-colors text-sm"
        >
          Contact support
        </a>

        <div className="mt-8 pt-6 border-t border-slate-200">
          <Link href="/login" className="text-sm text-slate-500 hover:text-slate-700">
            ← Back to sign in
          </Link>
        </div>
      </div>
    </div>
  )
}
