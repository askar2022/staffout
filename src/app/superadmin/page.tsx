'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, XCircle, Clock, Shield, Building2, Mail, LayoutDashboard, Link2, Pencil, Check, X, Plus, Send, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'

interface Org {
  id: string
  name: string
  slug: string
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

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'outofshift.com'

export default function SuperAdminPage() {
  const [orgs, setOrgs] = useState<Org[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
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

  async function handleCreateOrg(name: string, slug: string, contactEmail: string) {
    const res = await fetch('/api/superadmin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, slug, contact_email: contactEmail }),
    })
    const data = await res.json()
    if (res.ok) {
      setOrgs((prev) => [data.org, ...prev])
      setShowCreate(false)
    } else {
      throw new Error(data.error || 'Failed to create school')
    }
  }

  async function handleInvite(orgId: string, email: string) {
    const res = await fetch('/api/superadmin/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ org_id: orgId, email }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to send invite')
  }

  async function handleSlugUpdate(orgId: string, newSlug: string) {
    const res = await fetch('/api/superadmin', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ org_id: orgId, slug: newSlug }),
    })
    const data = await res.json()
    if (res.ok) {
      setOrgs((prev) => prev.map((o) => (o.id === orgId ? { ...o, slug: newSlug } : o)))
    } else {
      alert(data.error || 'Failed to update slug')
    }
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
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Super Admin</h1>
              <p className="text-slate-500 text-sm">Review, approve, and manage school subdomains</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                await createClient().auth.signOut()
                window.location.href = '/login'
              }}
              className="flex items-center gap-2 border border-slate-300 text-slate-600 font-semibold px-4 py-2.5 rounded-lg hover:bg-slate-50 transition-colors text-sm"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 bg-indigo-600 text-white font-semibold px-4 py-2.5 rounded-lg hover:bg-indigo-700 transition-colors text-sm"
            >
              <Plus className="w-4 h-4" />
              Add school
            </button>
          </div>
        </div>

        {showCreate && (
          <CreateOrgModal
            rootDomain={ROOT_DOMAIN}
            onClose={() => setShowCreate(false)}
            onCreate={handleCreateOrg}
          />
        )}

        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Pending', count: orgs.filter(o => o.status === 'pending').length, color: 'text-amber-600' },
            { label: 'Approved', count: orgs.filter(o => o.status === 'approved').length, color: 'text-green-600' },
            { label: 'Rejected', count: orgs.filter(o => o.status === 'rejected').length, color: 'text-red-500' },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-5">
              <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
              <p className="text-sm text-slate-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

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
                  onSlugUpdate={(slug) => handleSlugUpdate(org.id, slug)}
                  onInvite={(email) => handleInvite(org.id, email)}
                  actionLoading={actionLoading}
                  rootDomain={ROOT_DOMAIN}
                />
              ))}
            </div>
          </div>
        )}

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
                  onSlugUpdate={(slug) => handleSlugUpdate(org.id, slug)}
                  onInvite={(email) => handleInvite(org.id, email)}
                  actionLoading={actionLoading}
                  rootDomain={ROOT_DOMAIN}
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
  onSlugUpdate,
  onInvite,
  actionLoading,
  rootDomain,
}: {
  org: Org
  onApprove: () => void
  onReject: () => void
  onManage: () => void
  onSlugUpdate: (slug: string) => void
  onInvite: (email: string) => Promise<void>
  actionLoading: string | null
  rootDomain: string
}) {
  const Icon = statusIcon[org.status]
  const isLoading = actionLoading?.startsWith(org.id)
  const [editingSlug, setEditingSlug] = useState(false)
  const [slugInput, setSlugInput] = useState(org.slug)
  const [slugSaving, setSlugSaving] = useState(false)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteSending, setInviteSending] = useState(false)
  const [inviteResult, setInviteResult] = useState<{ ok: boolean; msg: string } | null>(null)

  async function saveSlug() {
    const clean = slugInput.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '')
    if (!clean || clean === org.slug) {
      setSlugInput(org.slug)
      setEditingSlug(false)
      return
    }
    setSlugSaving(true)
    await onSlugUpdate(clean)
    setSlugInput(clean)
    setSlugSaving(false)
    setEditingSlug(false)
  }

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault()
    setInviteSending(true)
    setInviteResult(null)
    try {
      await onInvite(inviteEmail)
      setInviteResult({ ok: true, msg: `Invite sent to ${inviteEmail}` })
      setInviteEmail('')
    } catch (err) {
      setInviteResult({ ok: false, msg: err instanceof Error ? err.message : 'Failed to send' })
    } finally {
      setInviteSending(false)
    }
  }

  const subdomain = `${org.slug}.${rootDomain}`

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-semibold text-slate-900">{org.name}</p>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${statusStyle[org.status]} flex items-center gap-1`}>
              <Icon className="w-3 h-3" />
              {org.status}
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-400 mb-2">
            <span className="flex items-center gap-1">
              <Mail className="w-3 h-3" />
              {org.contact_email}
            </span>
            <span>Signed up {format(new Date(org.created_at), 'MMM d, yyyy')}</span>
          </div>

          {/* Subdomain slug editor */}
          <div className="flex items-center gap-2 mt-2">
            <Link2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            {editingSlug ? (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-400">{rootDomain}/</span>
                <input
                  autoFocus
                  value={slugInput}
                  onChange={(e) => setSlugInput(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  onKeyDown={(e) => { if (e.key === 'Enter') saveSlug(); if (e.key === 'Escape') { setSlugInput(org.slug); setEditingSlug(false) } }}
                  className="border border-indigo-300 rounded px-2 py-0.5 text-xs w-28 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <span className="text-xs text-slate-400">.{rootDomain}</span>
                <button onClick={saveSlug} disabled={slugSaving} className="text-green-600 hover:text-green-700">
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => { setSlugInput(org.slug); setEditingSlug(false) }} className="text-slate-400 hover:text-slate-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-mono text-indigo-600">{subdomain}</span>
                <button
                  onClick={() => setEditingSlug(true)}
                  className="text-slate-300 hover:text-slate-500 transition-colors"
                  title="Edit subdomain"
                >
                  <Pencil className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {org.status === 'pending' && (
            <>
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
            </>
          )}

          {org.status === 'approved' && (
            <>
              <button
                onClick={() => { setShowInvite(!showInvite); setInviteResult(null) }}
                className="flex items-center gap-1.5 bg-green-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                Invite admin
              </button>
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
            </>
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
      {/* Invite admin expandable form */}
      {showInvite && org.status === 'approved' && (
        <div className="mt-4 pt-4 border-t border-slate-100">
          <p className="text-xs text-slate-500 mb-3">
            Send a setup link to the school admin. They will click it, confirm their name, and get access to <span className="font-mono text-indigo-600">{subdomain}</span>.
          </p>
          <form onSubmit={sendInvite} className="flex items-center gap-2">
            <input
              type="email"
              required
              autoFocus
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="admin@school.org"
              className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="submit"
              disabled={inviteSending || !inviteEmail}
              className="flex items-center gap-1.5 bg-indigo-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              {inviteSending ? 'Sending...' : 'Send invite'}
            </button>
            <button type="button" onClick={() => setShowInvite(false)} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </form>
          {inviteResult && (
            <p className={`text-xs mt-2 ${inviteResult.ok ? 'text-green-600' : 'text-red-600'}`}>
              {inviteResult.msg}
            </p>
          )}
        </div>
      )}
      </div>
    </div>
  )
}

function CreateOrgModal({
  rootDomain,
  onClose,
  onCreate,
}: {
  rootDomain: string
  onClose: () => void
  onCreate: (name: string, slug: string, contactEmail: string) => Promise<void>
}) {
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function derivedSlug(n: string) {
    return n.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
  }

  function handleNameChange(val: string) {
    setName(val)
    if (!slugTouched) setSlug(derivedSlug(val))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '')
    if (!cleanSlug) { setError('Subdomain is required'); return }
    setSaving(true)
    try {
      await onCreate(name.trim(), cleanSlug, contactEmail.trim())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-md p-7">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-slate-900">Add school</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">School name</label>
            <input
              type="text"
              required
              autoFocus
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. West Valley Academy"
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Subdomain</label>
            <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500">
              <input
                type="text"
                required
                value={slug}
                onChange={(e) => { setSlugTouched(true); setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')) }}
                placeholder="wva"
                className="flex-1 px-3 py-2.5 text-sm focus:outline-none"
              />
              <span className="text-slate-400 text-sm pr-3 shrink-0">.{rootDomain}</span>
            </div>
            {slug && (
              <p className="text-xs text-indigo-600 mt-1 font-mono">{slug}.{rootDomain}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Admin email <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="admin@school.org"
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-slate-300 text-slate-700 font-semibold py-2.5 rounded-lg hover:bg-slate-50 transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !name || !slug}
              className="flex-1 bg-indigo-600 text-white font-semibold py-2.5 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-60 text-sm"
            >
              {saving ? 'Creating...' : 'Create school'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
