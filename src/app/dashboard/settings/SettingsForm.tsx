'use client'

import { useState } from 'react'
import { Plus, Trash2, Check, Mail, Building2, Clock } from 'lucide-react'
import type { NotificationRecipient, Organization } from '@/lib/types'

interface Props {
  org: Organization
  initialRecipients: NotificationRecipient[]
  orgId: string
}

export default function SettingsForm({ org, initialRecipients }: Props) {
  const [orgName, setOrgName] = useState(org?.name ?? '')
  const [replyTo, setReplyTo] = useState(org?.reply_to_email ?? '')
  const [summaryTime, setSummaryTime] = useState(org?.summary_send_time ?? '08:00')
  const [savingOrg, setSavingOrg] = useState(false)
  const [orgSaved, setOrgSaved] = useState(false)
  const [orgError, setOrgError] = useState('')

  const [recipients, setRecipients] = useState<NotificationRecipient[]>(initialRecipients)
  const [newRecipient, setNewRecipient] = useState({ name: '', email: '', type: 'admin' as const })
  const [addingRecipient, setAddingRecipient] = useState(false)
  const [recipientError, setRecipientError] = useState('')

  async function saveOrgSettings() {
    setSavingOrg(true)
    setOrgError('')
    const res = await fetch('/api/org', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: orgName, reply_to_email: replyTo, summary_send_time: summaryTime }),
    })
    const data = await res.json()
    setSavingOrg(false)
    if (!res.ok) {
      setOrgError(data.error || 'Failed to save')
    } else {
      setOrgSaved(true)
      setTimeout(() => setOrgSaved(false), 2000)
    }
  }

  async function addRecipient() {
    if (!newRecipient.name || !newRecipient.email) return
    setAddingRecipient(true)
    setRecipientError('')

    const res = await fetch('/api/recipients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newRecipient),
    })
    const data = await res.json()
    setAddingRecipient(false)

    if (!res.ok) {
      setRecipientError(data.error || 'Failed to add recipient')
    } else {
      setRecipients((prev) => [...prev, data.recipient as NotificationRecipient])
      setNewRecipient({ name: '', email: '', type: 'admin' })
    }
  }

  async function removeRecipient(id: string) {
    const res = await fetch(`/api/recipients/${id}`, { method: 'DELETE' })
    if (res.ok) setRecipients((prev) => prev.filter((r) => r.id !== id))
  }

  async function toggleRecipient(id: string, field: 'receives_summary' | 'receives_instant') {
    const current = recipients.find((r) => r.id === id)
    if (!current) return
    const newVal = !current[field]

    const res = await fetch(`/api/recipients/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: newVal }),
    })

    if (res.ok) {
      setRecipients((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: newVal } : r)))
    }
  }

  const typeLabels: Record<string, string> = {
    all_staff: 'All Staff',
    admin: 'Admin',
    reception: 'Reception',
    hr: 'HR',
  }

  return (
    <div className="space-y-6">
      {/* Org settings */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="font-semibold text-slate-900 flex items-center gap-2 mb-5">
          <Building2 className="w-4 h-4 text-slate-500" />
          Organization
        </h2>

        {orgError && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg mb-4">
            {orgError}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">School name</label>
            <input
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Reply-to email</label>
            <input
              type="email"
              value={replyTo}
              onChange={(e) => setReplyTo(e.target.value)}
              placeholder="admin@school.org"
              className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              Morning summary time
            </label>
            <input
              type="time"
              value={summaryTime}
              onChange={(e) => setSummaryTime(e.target.value)}
              className="border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-xs text-slate-400 mt-1">Cron runs at 8:00 AM EST by default (edit vercel.json to change).</p>
          </div>
        </div>
        <button
          onClick={saveOrgSettings}
          disabled={savingOrg}
          className={`mt-5 flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors ${
            orgSaved ? 'bg-green-100 text-green-700' : 'bg-indigo-600 text-white hover:bg-indigo-700'
          } disabled:opacity-60`}
        >
          <Check className="w-4 h-4" />
          {orgSaved ? 'Saved!' : savingOrg ? 'Saving...' : 'Save settings'}
        </button>
      </div>

      {/* Notification recipients */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="font-semibold text-slate-900 flex items-center gap-2 mb-2">
          <Mail className="w-4 h-4 text-slate-500" />
          Notification Recipients
        </h2>
        <p className="text-sm text-slate-500 mb-5">Who receives the morning summary and instant alerts.</p>

        <div className="space-y-2 mb-4">
          {recipients.map((r) => (
            <div key={r.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">{r.name}</p>
                <p className="text-xs text-slate-500 truncate">{r.email}</p>
              </div>
              <span className="text-xs font-medium bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full shrink-0">
                {typeLabels[r.type] ?? r.type}
              </span>
              <div className="flex gap-1.5 text-xs shrink-0">
                <button
                  onClick={() => toggleRecipient(r.id, 'receives_summary')}
                  className={`px-2 py-1 rounded-lg font-medium transition-colors ${
                    r.receives_summary ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  Summary
                </button>
                <button
                  onClick={() => toggleRecipient(r.id, 'receives_instant')}
                  className={`px-2 py-1 rounded-lg font-medium transition-colors ${
                    r.receives_instant ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  Instant
                </button>
              </div>
              <button
                onClick={() => removeRecipient(r.id)}
                className="text-slate-400 hover:text-red-500 transition-colors shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Add recipient */}
        <div className="border border-dashed border-slate-300 rounded-xl p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Add recipient</p>

          {recipientError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-2 rounded-lg mb-3">
              {recipientError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
            <input
              type="text"
              value={newRecipient.name}
              onChange={(e) => setNewRecipient((p) => ({ ...p, name: e.target.value }))}
              placeholder="Name"
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <input
              type="email"
              value={newRecipient.email}
              onChange={(e) => setNewRecipient((p) => ({ ...p, email: e.target.value }))}
              placeholder="Email address"
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <select
              value={newRecipient.type}
              onChange={(e) => setNewRecipient((p) => ({ ...p, type: e.target.value as 'admin' }))}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="admin">Admin</option>
              <option value="all_staff">All Staff</option>
              <option value="reception">Reception</option>
              <option value="hr">HR</option>
            </select>
          </div>
          <button
            onClick={addRecipient}
            disabled={addingRecipient || !newRecipient.name || !newRecipient.email}
            className="flex items-center gap-2 text-sm font-medium bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            {addingRecipient ? 'Adding...' : 'Add'}
          </button>
        </div>
      </div>

      {/* Share form link */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-6">
        <h2 className="font-semibold text-slate-900 mb-2">Staff Submission Link</h2>
        <p className="text-sm text-slate-600 mb-3">Share this link with your staff so they can report absences.</p>
        <div className="flex items-center gap-2 bg-white border border-indigo-200 rounded-lg px-4 py-2.5">
          <code className="text-sm text-indigo-700 flex-1 truncate">
            {typeof window !== 'undefined' ? window.location.origin : 'https://your-app.vercel.app'}/submit
          </code>
          <button
            onClick={() => navigator.clipboard?.writeText(window.location.origin + '/submit')}
            className="text-xs font-medium text-indigo-600 hover:underline shrink-0"
          >
            Copy
          </button>
        </div>
      </div>
    </div>
  )
}
