import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth, apiError, apiOk, AuthError } from '@/lib/auth'
import type { Submission } from '@/lib/types'

export async function GET(request: NextRequest) {
  try {
    const { orgId } = await requireAuth()
    const db = createAdminClient()

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('start') ?? ''
    const endDate = searchParams.get('end') ?? ''
    const staffName = searchParams.get('name') ?? ''

    if (!startDate || !endDate) return apiError('start and end date required')

    let query = db
      .from('submissions')
      .select('*')
      .eq('organization_id', orgId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true })

    if (staffName) {
      query = query.ilike('staff_name', `%${staffName}%`)
    }

    const { data, error } = await query
    if (error) return apiError('Failed to load submissions', 500)

    const submissions = (data ?? []) as Submission[]

    // Collect unique staff_ids from submissions
    const staffIds = [...new Set(submissions.map((s) => s.staff_id).filter(Boolean))] as string[]

    // Fetch staff member info (employee_id, pto_balance) for those IDs
    const staffInfoMap: Record<string, { employee_id: string | null; pto_balance: number | null }> = {}

    if (staffIds.length > 0) {
      const { data: staffRows } = await db
        .from('staff_members')
        .select('id, employee_id, pto_balance')
        .in('id', staffIds)

      for (const row of staffRows ?? []) {
        staffInfoMap[row.id] = { employee_id: row.employee_id, pto_balance: row.pto_balance }
      }

      // Fetch all-time PTO used per staff_id (across all submissions, not just this period)
      const { data: allPtoRows } = await db
        .from('submissions')
        .select('staff_id, pto_hours_deducted')
        .eq('organization_id', orgId)
        .in('staff_id', staffIds)
        .not('pto_hours_deducted', 'is', null)

      const ptoUsedTotal: Record<string, number> = {}
      for (const row of allPtoRows ?? []) {
        if (row.staff_id) {
          ptoUsedTotal[row.staff_id] = (ptoUsedTotal[row.staff_id] ?? 0) + (row.pto_hours_deducted ?? 0)
        }
      }

      for (const id of staffIds) {
        (staffInfoMap[id] as { employee_id: string | null; pto_balance: number | null; pto_used_total?: number }).pto_used_total = ptoUsedTotal[id] ?? 0
      }
    }

    // Group by staff name → count by type
    interface StaffEntry {
      name: string
      staff_id: string | null
      employee_id: string | null
      absent: number
      late: number
      leaving_early: number
      appointment: number
      personal_day: number
      total: number
      pto_used_period: number
      pto_balance: number | null
      pto_remaining: number | null
      dates: { date: string; status: string; pto_hours?: number | null }[]
    }

    const byStaff: Record<string, StaffEntry> = {}

    for (const s of submissions) {
      if (!byStaff[s.staff_name]) {
        const info = s.staff_id ? staffInfoMap[s.staff_id] : null
        const balance = info?.pto_balance ?? null
        const usedTotal = s.staff_id
          ? ((staffInfoMap[s.staff_id] as { pto_used_total?: number })?.pto_used_total ?? 0)
          : 0
        const remaining = balance !== null ? balance - usedTotal : null

        byStaff[s.staff_name] = {
          name: s.staff_name,
          staff_id: s.staff_id ?? null,
          employee_id: info?.employee_id ?? null,
          absent: 0, late: 0, leaving_early: 0, appointment: 0, personal_day: 0, total: 0,
          pto_used_period: 0,
          pto_balance: balance,
          pto_remaining: remaining,
          dates: [],
        }
      }

      const entry = byStaff[s.staff_name]
      const statusKey = s.status as 'absent' | 'late' | 'leaving_early' | 'appointment' | 'personal_day'
      if (statusKey in entry) entry[statusKey]++
      entry.total++
      if (s.pto_hours_deducted) entry.pto_used_period += s.pto_hours_deducted
      entry.dates.push({ date: s.date, status: s.status, pto_hours: s.pto_hours_deducted })
    }

    return apiOk({
      staff: Object.values(byStaff).sort((a, b) => b.total - a.total),
      totalSubmissions: submissions.length,
    })
  } catch (err) {
    if (err instanceof AuthError) return apiError('Unauthorized', 401)
    return apiError('Server error', 500)
  }
}
