// Returns the offset of `tz` from UTC in milliseconds at the given date (positive = ahead of UTC).
function getTzOffsetMs(tz: string, date: Date): number {
  const d1 = new Date(date.toLocaleString('en-US', { timeZone: tz }))
  const d2 = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }))
  return d1.getTime() - d2.getTime()
}

// Converts a UTC ISO string to "YYYY-MM-DDTHH:MM" as seen in `tz` (for datetime-local inputs).
export function toDatetimeLocalInTz(iso: string, tz: string): string {
  const d = new Date(iso)
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(d)
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00'
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`
}

// Interprets a "YYYY-MM-DDTHH:MM" datetime-local value as being in `tz` and returns a UTC ISO string.
export function fromDatetimeLocalInTz(value: string, tz: string): string {
  const naive = new Date(value) // browser interprets as its own local timezone
  const browserOffsetMs = -naive.getTimezoneOffset() * 60000
  const tzOffsetMs = getTzOffsetMs(tz, naive)
  return new Date(naive.getTime() + browserOffsetMs - tzOffsetMs).toISOString()
}

// Formats a UTC ISO string as a short time (HH:MM) in `tz`.
export function formatTimeInTz(iso: string, tz: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: tz })
}

// Formats a UTC ISO string as a short date (Mon D) in `tz`.
export function formatDateInTz(iso: string, tz: string): string {
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric', timeZone: tz })
}

// Formats a UTC ISO string as "Mon D, HH:MM" in `tz`.
export function formatDateTimeInTz(iso: string, tz: string): string {
  return new Date(iso).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: tz,
  })
}
