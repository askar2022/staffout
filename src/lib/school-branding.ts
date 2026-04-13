export const SCHOOL_LOGOS: Record<string, string> = {
  hba: '/hba.png',
  spa: '/SPA.png',
  wva: '/WVA.jfif',
}

export const SCHOOL_HERO_BACKGROUNDS: Record<string, string> = {
  hba: '/Beast_1-scaled.jpg',
}

export const SCHOOL_FULL_NAMES: Record<string, string> = {
  hba: 'Harvest Best Academy',
  spa: 'Sankofa Prep',
  wva: 'Wakanda Virtual Academy',
}

export function getSchoolDisplayName(orgSlug: string | null, orgName: string | null): string | null {
  if (orgSlug && SCHOOL_FULL_NAMES[orgSlug]) return SCHOOL_FULL_NAMES[orgSlug]
  return orgName
}
