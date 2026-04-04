import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Zap, Bell, Users, BarChart3, Shield, Clock, ArrowRight, CheckCircle } from 'lucide-react'

export default async function HomePage() {
  const headersList = await headers()
  const orgSlug = headersList.get('x-org-slug')

  // On a school subdomain, go straight to the submit form
  if (orgSlug) {
    redirect('/submit')
  }

  // Root domain — marketing page
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'outofshift.com'

  return (
    <div className="min-h-screen bg-white">

      {/* Nav */}
      <nav className="border-b border-slate-100 sticky top-0 bg-white/95 backdrop-blur z-10 safe-area-top">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold text-slate-900">StaffOut</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-slate-600 hover:text-slate-900 font-medium transition-colors hidden sm:block">
              Sign in
            </Link>
            <Link href="/login" className="text-sm text-slate-600 hover:text-slate-900 font-medium transition-colors sm:hidden">
              Sign in
            </Link>
            <a
              href="mailto:support@outofshift.com?subject=StaffOut%20school%20signup"
              className="text-sm bg-indigo-600 text-white font-semibold px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Get started
            </a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-14 pb-16 sm:pt-20 sm:pb-24 px-4 sm:px-6 text-center">
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 text-xs sm:text-sm font-medium px-3 py-1.5 sm:px-4 rounded-full mb-5 sm:mb-6">
            <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            Built for schools. Trusted by administrators.
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 leading-tight mb-5 sm:mb-6">
            Never wonder who&apos;s out{' '}
            <span className="text-indigo-600">before the day starts</span>
          </h1>
          <p className="text-base sm:text-xl text-slate-500 leading-relaxed mb-8 sm:mb-10 max-w-2xl mx-auto">
            StaffOut gives your school a simple, secure way for staff to report absences — and gives administrators real-time visibility without the morning chaos.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <a
              href="mailto:support@outofshift.com?subject=StaffOut%20school%20signup&body=School%20name%3A%0AContact%20name%3A%0AContact%20email%3A"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-indigo-600 text-white font-semibold px-6 py-3 sm:px-7 sm:py-3.5 rounded-xl hover:bg-indigo-700 transition-colors text-sm sm:text-base"
            >
              Get started for your school <ArrowRight className="w-4 h-4" />
            </a>
            <Link
              href={`https://demo.${rootDomain}/submit`}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-slate-300 text-slate-700 font-semibold px-6 py-3 sm:px-7 sm:py-3.5 rounded-xl hover:border-slate-400 hover:bg-slate-50 transition-colors text-sm sm:text-base"
            >
              See a live demo
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-14 sm:py-20 bg-slate-50 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 text-center mb-3 sm:mb-4">How it works</h2>
          <p className="text-slate-500 text-center mb-10 sm:mb-14 max-w-xl mx-auto text-sm sm:text-base">
            No apps to install. No passwords for staff to remember. Just email.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: '1',
                title: 'Staff reports in seconds',
                desc: 'Staff visit your school\'s link, enter their work email, and receive a 6-digit code. They select their status and submit — done in under a minute.',
                icon: Clock,
                color: 'bg-blue-100 text-blue-600',
              },
              {
                step: '2',
                title: 'Alerts go out instantly',
                desc: 'The moment a submission comes in after 8 AM, the right people are notified automatically — admins, supervisors, HR — whoever you configure.',
                icon: Bell,
                color: 'bg-amber-100 text-amber-600',
              },
              {
                step: '3',
                title: 'Morning summary at 8 AM',
                desc: 'Every school day at 8 AM your admin team gets a clean summary of everyone who\'s out, late, or on a personal day — before the first class starts.',
                icon: BarChart3,
                color: 'bg-green-100 text-green-600',
              },
            ].map((item) => (
              <div key={item.step} className="bg-white rounded-2xl p-7 border border-slate-200">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-5 ${item.color}`}>
                  <item.icon className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 mb-2 text-lg">{item.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-14 sm:py-20 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 text-center mb-3 sm:mb-4">Everything you need</h2>
          <p className="text-slate-500 text-center mb-10 sm:mb-14 max-w-xl mx-auto text-sm sm:text-base">
            Purpose-built for schools. No bloated HR software. No steep learning curve.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[
              { icon: Shield, title: 'Email-verified identity', desc: 'Only staff in your directory can submit. No accounts, no passwords, no fakes.' },
              { icon: Bell, title: 'Instant + morning alerts', desc: 'Configurable notifications — real-time or batched into a clean 8 AM digest.' },
              { icon: Users, title: 'Staff directory', desc: 'Manage your team in one place. Import by CSV or add manually.' },
              { icon: BarChart3, title: 'Attendance reports', desc: 'Track trends over time. See who\'s frequently absent before it becomes a pattern.' },
              { icon: Zap, title: 'Your own subdomain', desc: 'Your school gets its own URL — hba.outofshift.com — keeping data fully separate.' },
              { icon: CheckCircle, title: 'Multi-campus support', desc: 'Assign staff to campuses. Reports and alerts can be filtered by campus.' },
            ].map((f) => (
              <div key={f.title} className="flex gap-4 p-5 rounded-xl border border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/30 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                  <f.icon className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900 mb-1">{f.title}</p>
                  <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-14 sm:py-20 bg-slate-50 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3 sm:mb-4">Simple pricing</h2>
          <p className="text-slate-500 mb-8 sm:mb-12 text-sm sm:text-base">One plan. Everything included. No per-seat fees.</p>
          <div className="bg-white rounded-2xl border border-slate-200 p-7 sm:p-10 shadow-sm">
            <div className="text-4xl sm:text-5xl font-extrabold text-slate-900 mb-2">
              $49<span className="text-lg sm:text-xl font-normal text-slate-400">/month</span>
            </div>
            <p className="text-slate-500 mb-6 sm:mb-8 text-sm sm:text-base">Per school. Unlimited staff.</p>
            <ul className="space-y-3 text-left mb-10 max-w-sm mx-auto">
              {[
                'Your own subdomain',
                'Unlimited staff members',
                'Daily 8 AM summaries',
                'Instant absence alerts',
                'Staff directory & import',
                'Email logs & reports',
                'Dedicated support',
              ].map((item) => (
                <li key={item} className="flex items-center gap-3 text-sm text-slate-700">
                  <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <a
              href="mailto:support@outofshift.com?subject=StaffOut%20school%20signup&body=School%20name%3A%0AContact%20name%3A%0AContact%20email%3A"
              className="inline-flex items-center gap-2 bg-indigo-600 text-white font-semibold px-8 py-3.5 rounded-xl hover:bg-indigo-700 transition-colors"
            >
              Get started for your school <ArrowRight className="w-4 h-4" />
            </a>
            <p className="text-xs text-slate-400 mt-4">We onboard schools directly. Usually within one business day.</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-14 sm:py-20 px-4 sm:px-6 bg-indigo-600">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3 sm:mb-4">Ready to simplify your mornings?</h2>
          <p className="text-indigo-200 mb-6 sm:mb-8 text-sm sm:text-base">
            Register your school today. We review and approve accounts within 24 hours.
          </p>
          <a
            href="mailto:support@outofshift.com?subject=StaffOut%20school%20signup&body=School%20name%3A%0AContact%20name%3A%0AContact%20email%3A"
            className="inline-flex items-center gap-2 bg-white text-indigo-600 font-bold px-6 py-3 sm:px-8 sm:py-3.5 rounded-xl hover:bg-indigo-50 transition-colors text-sm sm:text-base"
          >
            Get in touch <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-8 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-slate-900">StaffOut</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-slate-400">
            <Link href="/login" className="hover:text-slate-600 transition-colors">Admin Sign In</Link>
            <a href="mailto:support@outofshift.com" className="hover:text-slate-600 transition-colors">Contact</a>
            <a href="mailto:support@outofshift.com" className="hover:text-slate-600 transition-colors">Support</a>
          </div>
          <p className="text-xs text-slate-400">© {new Date().getFullYear()} StaffOut by Automation LLC</p>
        </div>
      </footer>

    </div>
  )
}
