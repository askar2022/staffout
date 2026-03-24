import Link from 'next/link'
import { CheckCircle, Clock, Mail, Shield, Users, Zap } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-slate-100 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg text-slate-900">StaffOut</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-slate-600 hover:text-slate-900 font-medium px-3 py-2">
              Sign in
            </Link>
            <Link
              href="/signup"
              className="text-sm bg-indigo-600 text-white font-semibold px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Get started free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 text-sm font-medium px-4 py-1.5 rounded-full mb-8 border border-indigo-100">
          <Zap className="w-3.5 h-3.5" />
          Automated staff notifications for schools
        </div>
        <h1 className="text-5xl sm:text-6xl font-bold text-slate-900 leading-tight mb-6">
          Staff absences, handled{' '}
          <span className="text-indigo-600">automatically</span>
        </h1>
        <p className="text-xl text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed">
          Staff submit their absence in seconds. The right people get notified instantly — 
          no phone calls, no manual emails, no missed messages.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/signup"
            className="bg-indigo-600 text-white font-semibold px-8 py-4 rounded-xl hover:bg-indigo-700 transition-colors text-lg"
          >
            Start free today
          </Link>
          <Link
            href="/submit"
            className="bg-slate-100 text-slate-700 font-semibold px-8 py-4 rounded-xl hover:bg-slate-200 transition-colors text-lg"
          >
            Submit an absence →
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-slate-50 py-20">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-slate-900 mb-12">How it works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: '1',
                icon: Users,
                title: 'Staff submits',
                desc: 'Staff opens the form and fills in their name, status, and any notes. Takes under 60 seconds.',
              },
              {
                step: '2',
                icon: Clock,
                title: 'Smart routing',
                desc: 'Before 8 AM → included in morning summary. After 8 AM → instant alert sent right away.',
              },
              {
                step: '3',
                icon: Mail,
                title: 'Right people notified',
                desc: 'All staff get a clean summary. Supervisors get a detailed action notice. HR gets a copy.',
              },
            ].map((item) => (
              <div key={item.step} className="bg-white rounded-2xl p-8 border border-slate-200">
                <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center mb-4">
                  <item.icon className="w-5 h-5 text-indigo-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">{item.title}</h3>
                <p className="text-slate-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-center text-slate-900 mb-12">Everything you need</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { icon: Mail, title: '8:00 AM Summary', desc: 'Daily digest sent to all staff before the school day starts.' },
            { icon: Zap, title: 'Instant Alerts', desc: 'Same-day updates sent immediately after 8 AM.' },
            { icon: Shield, title: 'Supervisor Notices', desc: 'Detailed action emails with coverage reminders.' },
            { icon: Users, title: 'Staff Directory', desc: 'Manage your team with supervisor links per person.' },
            { icon: CheckCircle, title: 'Admin Dashboard', desc: 'View all submissions, filter by day, and track email logs.' },
            { icon: Clock, title: 'Privacy First', desc: 'Staff email shows only status. Medical details go to supervisors only.' },
          ].map((f) => (
            <div key={f.title} className="flex gap-4 p-6 rounded-xl border border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/30 transition-colors">
              <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                <f.icon className="w-4 h-4 text-indigo-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-1">{f.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-indigo-600 py-20">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to stop the manual email chain?</h2>
          <p className="text-indigo-200 text-lg mb-8">Set up your school in 5 minutes. No IT team required.</p>
          <Link
            href="/signup"
            className="bg-white text-indigo-600 font-bold px-10 py-4 rounded-xl hover:bg-indigo-50 transition-colors text-lg inline-block"
          >
            Create your free account
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-8">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-slate-500">
            <Zap className="w-4 h-4 text-indigo-500" />
            <span className="text-sm font-medium">StaffOut by Automation LLC</span>
          </div>
          <p className="text-sm text-slate-400">© {new Date().getFullYear()} Automation LLC. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
