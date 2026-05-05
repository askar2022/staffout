import type { Submission } from '@/lib/types'

/** Normalize campus strings from submissions vs Settings dropdown */
export function normalizeCampusScope(value: string | null | undefined): string | null {
  if (value == null) return null
  const t = String(value).trim()
  return t.length ? t : null
}

/** Recipient sees submissions whose campus matches their scope, or all campuses when scope is null */
export function recipientMatchesSubmissionCampus(
  recipientCampusScope: string | null | undefined,
  submissionCampus: string | null | undefined
): boolean {
  const scope = normalizeCampusScope(recipientCampusScope)
  if (!scope) return true

  const subCampus = normalizeCampusScope(submissionCampus)
  if (!subCampus) return false

  return scope.localeCompare(subCampus, undefined, { sensitivity: 'accent' }) === 0
}

export function filterSubmissionsForCampusScope<T extends Pick<Submission, 'campus'>>(
  submissions: T[],
  campusScope: string | null
): T[] {
  const scope = normalizeCampusScope(campusScope)
  if (!scope) return submissions
  return submissions.filter((s) => recipientMatchesSubmissionCampus(scope, s.campus))
}
