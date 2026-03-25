'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, XCircle, Clock, Shield, Building2, Mail, LayoutDashboard } from 'lucide-react'
import { format } from 'date-fns'

interface Org {
  id: string
  name: string
  contact_email: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
}

const statusStyle = {
  pending: 'bg-amber-100 text-amber-700 border-amber-200',
  approved: 'bg-green-100 text-green-700 border-green-200',
  rejected: 'bg-red-100 text-red-700 border-red-200',
}

const statusIcon = {
  pending: Clock,
  approved: CheckCircle,
  rejected: XCircle,
}

export default function SuperAdminPage() {
  const [orgs, setOrgs] = useState<Org[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const router = useRouter()

  async function handleManage(orgId: string) {
    await fetch('/api/superadmin/impersonate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ org_id: orgId }),
    })
    router.push('/dashboard')
  }

  useEffect(() => {
    fetch('/api/superadmin')
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error)
        else setOrgs(data.organizations ?? [])
      })
      .catch(() => setError('Failed to load'))
      .finally(() => setLoading(false))
  }, [])

  async function handleAction(orgId: string, action: 'approved' | 'rejected') {
    setActionLoading(orgId + action)
    const res = await fetch('/api/superadmin', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ org_id: orgId, action }),
    })
    const data = await res.json()
    if (res.ok) {
      setOrgs((prev) => prev.map((o) => (o.id === orgId ? { ...o, status: action } : o)))
    } else {
      alert(data.error || 'Action failed')
    }
    setActionLoading(null)
  }

  const pending = orgs.filter((o) => o.status === 'pending')
  const others = orgs.filter((o) => o.status !== 'pending')

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-400 text-sm animate-pulse">Loading...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-xl text-center max-w-sm">
          <Shield className="w-8 h-8 mx-auto mb-3 text-red-500" />
          <p className="font-semibold">{error === 'Forbidden' ? 'Access denied' : error}</p>
          <p className="text-sm mt-1 text-red-600">Only the super admin can access this page.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Super Admin</h1>
            <p className="text-slate-500 text-sm">Review and approve school accounts</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Pending', count: orgs.filter(o => o.status === 'pending').length, color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Approved', count: orgs.filter(o => o.status === 'approved').length, color: 'text-green-600', bg: 'bg-green-50' },
            { label: 'Rejected', count: orgs.filter(o => o.status === 'rejected').length, color: 'text-red-500', bg: 'bg-red-50' },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-5">
              <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
              <p className="text-sm text-slate-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Pending approvals */}
        {pending.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              Waiting for approval ({pending.length})
            </h2>
            <div className="space-y-3">
              {pending.map((org) => (
                <OrgCard
                  key={org.id}
                  org={org}
                  onApprove={() => handleAction(org.id, 'approved')}
                  onReject={() => handleAction(org.id, 'rejected')}
                  onManage={() => handleManage(org.id)}
                  actionLoading={actionLoading}
                />
              ))}
            </div>
          </div>
        )}

        {/* All others */}
        {others.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
              All accounts
            </h2>
            <div className="space-y-2">
              {others.map((org) => (
                <OrgCard
                  key={org.id}
                  org={org}
                  onApprove={() => handleAction(org.id, 'approved')}
                  onReject={() => handleAction(org.id, 'rejected')}
                  onManage={() => handleManage(org.id)}
                  actionLoading={actionLoading}
                />
              ))}
            </div>
          </div>
        )}

        {orgs.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No organizations yet.</p>
          </div>
        )}
      </div>
    </div>
  )
}

function OrgCard({
  org,
  onApprove,
  onReject,
  onManage,
  actionLoading,
}: {
  org: Org
  onApprove: () => void
  onReject: () => void
  onManage: () => void
  actionLoading: string | null
}) {
  const Icon = statusIcon[org.status]
  const isLoading = actionLoading?.startsWith(org.id)

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-center gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="font-semibold text-slate-900">{org.name}</p>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${statusStyle[org.status]} flex items-center gap-1`}>
            <Icon className="w-3 h-3" />
            {org.status}
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <Mail className="w-3 h-3" />
            {org.contact_email}
          </span>
          <span>Signed up {format(new Date(org.created_at), 'MMM d, yyyy h:mm a')}</span>
        </div>
      </div>

      {org.status === 'pending' && (
        <div className="flex gap-2 shrink-0">
          <button
            onClick={onApprove}
            disabled={!!isLoading}
            className="flex items-center gap-1.5 bg-green-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-60 transition-colors"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            {actionLoading === org.id + 'approved' ? 'Approving...' : 'Approve'}
          </button>
          <button
            onClick={onReject}
            disabled={!!isLoading}
            className="flex items-center gap-1.5 bg-red-50 text-red-600 border border-red-200 text-sm font-semibold px-4 py-2 rounded-lg hover:bg-red-100 disabled:opacity-60 transition-colors"
          >
            <XCircle className="w-3.5 h-3.5" />
            {actionLoading === org.id + 'rejected' ? 'Rejecting...' : 'Reject'}
          </button>
        </div>
      )}

      {org.status === 'approved' && (
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onManage}
            className="flex items-center gap-1.5 bg-indigo-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            Manage
          </button>
          <button
            onClick={onReject}
            disabled={!!isLoading}
            className="text-xs text-slate-400 hover:text-red-500 transition-colors px-2"
          >
            Revoke
          </button>
        </div>
      )}

      {org.status === 'rejected' && (
        <button
          onClick={onApprove}
          disabled={!!isLoading}
          className="text-xs text-slate-400 hover:text-green-600 transition-colors"
        >
          Re-approve
        </button>
      )}
    </div>
  )
}
