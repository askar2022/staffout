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

    // Group by staff name → count by type
    interface StaffEntry {
      name: string
      absent: number
      late: number
      leaving_early: number
      appointment: number
      personal_day: number
      total: number
      dates: { date: string; status: string }[]
    }

    const byStaff: Record<string, StaffEntry> = {}

    for (const s of submissions) {
      if (!byStaff[s.staff_name]) {
        byStaff[s.staff_name] = {
          name: s.staff_name,
          absent: 0, late: 0, leaving_early: 0, appointment: 0, personal_day: 0, total: 0,
          dates: [],
        }
      }
      const entry = byStaff[s.staff_name]
      const statusKey = s.status as 'absent' | 'late' | 'leaving_early' | 'appointment' | 'personal_day'
      if (statusKey in entry) entry[statusKey]++
      entry.total++
      entry.dates.push({ date: s.date, status: s.status })
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
