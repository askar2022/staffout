import Link from 'next/link'
import { Zap, Mail, ArrowRight } from 'lucide-react'

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold text-slate-900">StaffOut</span>
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-10">
          <div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <Mail className="w-7 h-7 text-indigo-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-3">Get StaffOut for your school</h1>
          <p className="text-slate-500 text-sm leading-relaxed mb-8">
            We onboard schools directly. Send us an email and we will get your school set up — usually within one business day.
          </p>
          <a
            href="mailto:support@outofshift.com?subject=StaffOut%20school%20signup&body=School%20name%3A%0AContact%20name%3A%0AContact%20email%3A"
            className="inline-flex items-center gap-2 bg-indigo-600 text-white font-semibold px-6 py-3 rounded-xl hover:bg-indigo-700 transition-colors"
          >
            Email us to get started <ArrowRight className="w-4 h-4" />
          </a>
          <p className="text-xs text-slate-400 mt-5">
            Or email us directly at{' '}
            <a href="mailto:support@outofshift.com" className="text-indigo-500 hover:underline">
              support@outofshift.com
            </a>
          </p>
        </div>

        <p className="text-center text-sm text-slate-500 mt-6">
          Already set up?{' '}
          <Link href="/login" className="text-indigo-600 font-medium hover:underline">
            Admin sign in →
          </Link>
        </p>
      </div>
    </div>
  )
}
