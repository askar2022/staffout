const CT = 'America/Chicago'

export function formatTimeCT(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric', minute: '2-digit', hour12: true, timeZone: CT,
  }).format(new Date(date))
}

export function formatDateTimeCT(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true, timeZone: CT,
  }).format(new Date(date))
}
