'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Zap,
  LayoutDashboard,
  Users,
  ClipboardList,
  Settings,
  Mail,
  LogOut,
  ExternalLink,
  BarChart2,
  Menu,
  X,
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/submissions', label: 'Submissions', icon: ClipboardList },
  { href: '/dashboard/staff', label: 'Staff Directory', icon: Users },
  { href: '/dashboard/reports', label: 'Reports', icon: BarChart2 },
  { href: '/dashboard/email-logs', label: 'Email Logs', icon: Mail },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
]

export default function DashboardSidebar({
  orgName,
  userEmail,
}: {
  orgName: string
  userEmail: string
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [isMobile, setIsMobile] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    function check() {
      setIsMobile(window.innerWidth < 768)
    }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false)
  }, [pathname])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const NavLinks = () => (
    <nav style={{ flex: 1, padding: '12px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
      {navItems.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 12px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              textDecoration: 'none',
              color: active ? '#4338ca' : '#475569',
              backgroundColor: active ? '#eef2ff' : 'transparent',
            }}
          >
            <item.icon style={{ width: '16px', height: '16px', flexShrink: 0 }} />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )

  const SidebarBottom = () => (
    <div style={{ padding: '12px', borderTop: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <Link
        href="/submit"
        target="_blank"
        style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          padding: '10px 12px', borderRadius: '8px', fontSize: '14px',
          fontWeight: '500', textDecoration: 'none', color: '#475569',
        }}
      >
        <ExternalLink style={{ width: '16px', height: '16px', flexShrink: 0 }} />
        Staff Form
      </Link>
      <button
        onClick={handleSignOut}
        style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          padding: '10px 12px', borderRadius: '8px', fontSize: '14px',
          fontWeight: '500', color: '#475569', background: 'none',
          border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left',
        }}
      >
        <LogOut style={{ width: '16px', height: '16px', flexShrink: 0 }} />
        Sign out
      </button>
      <p style={{ fontSize: '12px', color: '#94a3b8', padding: '4px 12px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {userEmail}
      </p>
    </div>
  )

  const LogoBlock = () => (
    <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
        <div style={{ width: '28px', height: '28px', background: '#4f46e5', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Zap style={{ width: '14px', height: '14px', color: 'white' }} />
        </div>
        <span style={{ fontWeight: '700', color: '#0f172a' }}>StaffOut</span>
      </div>
      <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', paddingLeft: '36px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {orgName}
      </p>
    </div>
  )

  // ── Mobile layout ────────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <>
        {/* Fixed top bar */}
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 40,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'white', borderBottom: '1px solid #e2e8f0',
          padding: '12px 16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '28px', height: '28px', background: '#4f46e5', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap style={{ width: '14px', height: '14px', color: 'white' }} />
            </div>
            <span style={{ fontWeight: '700', color: '#0f172a' }}>StaffOut</span>
            <span style={{ fontSize: '12px', color: '#94a3b8', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>· {orgName}</span>
          </div>
          <button
            onClick={() => setDrawerOpen(true)}
            style={{ padding: '8px', borderRadius: '8px', border: 'none', background: 'none', cursor: 'pointer', color: '#475569' }}
          >
            <Menu style={{ width: '22px', height: '22px' }} />
          </button>
        </div>

        {/* Drawer */}
        {drawerOpen && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex' }}>
            {/* Backdrop */}
            <div
              onClick={() => setDrawerOpen(false)}
              style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }}
            />
            {/* Drawer panel */}
            <div style={{
              position: 'relative', width: '280px', background: 'white',
              display: 'flex', flexDirection: 'column', height: '100%',
              boxShadow: '4px 0 24px rgba(0,0,0,0.15)',
            }}>
              <button
                onClick={() => setDrawerOpen(false)}
                style={{ position: 'absolute', top: '14px', right: '14px', padding: '6px', border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8' }}
              >
                <X style={{ width: '20px', height: '20px' }} />
              </button>
              <LogoBlock />
              <NavLinks />
              <SidebarBottom />
            </div>
          </div>
        )}
      </>
    )
  }

  // ── Desktop sidebar ──────────────────────────────────────────────────────────
  return (
    <aside style={{ width: '256px', background: 'white', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
      <LogoBlock />
      <NavLinks />
      <SidebarBottom />
    </aside>
  )
}
