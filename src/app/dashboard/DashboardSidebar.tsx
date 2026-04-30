'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Zap, LayoutDashboard, Users, ClipboardList,
  Settings, Mail, LogOut, ExternalLink, BarChart2, Menu, X,
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/submissions', label: 'Submissions', icon: ClipboardList },
  { href: '/dashboard/staff', label: 'Staff Directory', icon: Users },
  { href: '/dashboard/reports', label: 'Reports', icon: BarChart2 },
  { href: '/dashboard/email-logs', label: 'Email Logs', icon: Mail },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
]

export default function DashboardSidebar({ orgName, userEmail }: { orgName: string; userEmail: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const [drawerOpen, setDrawerOpen] = useState(false)

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const Logo = () => (
    <div className="p-5 border-b border-slate-200">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
          <Zap className="w-3.5 h-3.5 text-white" />
        </div>
        <span className="font-bold text-slate-900">OutOfShift</span>
      </div>
      <p className="text-xs text-slate-500 truncate mt-1 pl-9">{orgName}</p>
    </div>
  )

  const NavLinks = ({ onNav }: { onNav?: () => void }) => (
    <nav className="flex-1 p-3 space-y-0.5">
      {navItems.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNav}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              active ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <item.icon className="w-4 h-4 shrink-0" />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )

  const BottomLinks = ({ onNav }: { onNav?: () => void }) => (
    <div className="p-3 border-t border-slate-200 space-y-1">
      <Link
        href="/submit"
        target="_blank"
        onClick={onNav}
        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
      >
        <ExternalLink className="w-4 h-4 shrink-0" />
        Staff Form
      </Link>
      <button
        onClick={handleSignOut}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors"
      >
        <LogOut className="w-4 h-4 shrink-0" />
        Sign out
      </button>
      <p className="text-xs text-slate-400 truncate px-3 pt-1">{userEmail}</p>
    </div>
  )

  return (
    <>
      {/* ── Desktop sidebar — hidden on mobile via CSS class ── */}
      <aside className="dashboard-sidebar-desktop w-64 bg-white border-r border-slate-200 flex-col shrink-0">
        <Logo />
        <NavLinks />
        <BottomLinks />
      </aside>

      {/* ── Mobile top bar — hidden on desktop via CSS class ── */}
      <div className="dashboard-topbar fixed top-0 left-0 right-0 z-40 items-center justify-between bg-white border-b border-slate-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-bold text-slate-900">OutOfShift</span>
          <span className="text-xs text-slate-400 truncate max-w-[140px]">· {orgName}</span>
        </div>
        <button
          onClick={() => setDrawerOpen(true)}
          className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* ── Mobile drawer ── */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="relative w-72 bg-white flex flex-col h-full shadow-xl">
            <button
              onClick={() => setDrawerOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
            <Logo />
            <NavLinks onNav={() => setDrawerOpen(false)} />
            <BottomLinks onNav={() => setDrawerOpen(false)} />
          </aside>
        </div>
      )}
    </>
  )
}
