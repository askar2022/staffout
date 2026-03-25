import Link from 'next/link'
import { Zap } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-indigo-600 flex flex-col">

      {/* Main content — centered submit CTA */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-16">

        {/* Logo */}
        <div className="flex items-center gap-2 mb-10">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="text-2xl font-bold text-white">StaffOut</span>
        </div>

        {/* Card */}
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-8 text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            Reporting an absence?
          </h1>
          <p className="text-slate-500 text-sm mb-8 leading-relaxed">
            Enter your work email and we will send you a verification code. Takes less than 60 seconds.
          </p>

          <Link
            href="/submit"
            className="block w-full bg-indigo-600 text-white font-bold py-4 rounded-xl hover:bg-indigo-700 transition-colors text-base"
          >
            Submit Absence →
          </Link>
        </div>

      </div>

      {/* Footer — admin links */}
      <div className="pb-8 flex flex-col items-center gap-3">
        <div className="flex items-center gap-4 text-sm">
          <Link
            href="/login"
            className="text-indigo-200 hover:text-white font-medium transition-colors"
          >
            Admin Sign In
          </Link>
          <span className="text-indigo-400">·</span>
          <Link
            href="/signup"
            className="text-indigo-200 hover:text-white font-medium transition-colors"
          >
            Register Your School
          </Link>
          <span className="text-indigo-400">·</span>
          <Link
            href="/about"
            className="text-indigo-200 hover:text-white font-medium transition-colors"
          >
            Learn more
          </Link>
        </div>
        <p className="text-indigo-400 text-xs">© {new Date().getFullYear()} StaffOut by Automation LLC</p>
      </div>

    </div>
  )
}
