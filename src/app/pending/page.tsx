import { Clock, Mail, Zap } from 'lucide-react'
import Link from 'next/link'

export default function PendingPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <Clock className="w-8 h-8 text-amber-600" />
        </div>

        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-bold text-slate-900">StaffOut</span>
        </div>

        <h1 className="text-2xl font-bold text-slate-900 mb-3">
          Your account is pending approval
        </h1>
        <p className="text-slate-500 leading-relaxed mb-6">
          Thank you for signing up. Your school has been submitted and is waiting for review.
          You will receive an email once your account is approved — usually within 24 hours.
        </p>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-left">
          <div className="flex items-start gap-3">
            <Mail className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Check your email</p>
              <p className="text-sm text-amber-700 mt-0.5">
                We will send you a confirmation when your account is activated.
              </p>
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-400">
          Questions?{' '}
          <a href="mailto:support@outofshift.com" className="text-indigo-500 hover:underline">
            Contact support
          </a>
        </p>

        <div className="mt-8 pt-6 border-t border-slate-200">
          <Link href="/login" className="text-sm text-slate-500 hover:text-slate-700">
            ← Back to sign in
          </Link>
        </div>
      </div>
    </div>
  )
}
