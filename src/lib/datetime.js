// Timezone-aware formatting via the native Intl API — no date library needed.

/** Sortable `YYYY-MM-DD` key for an instant in a given IANA timezone. */
export function dateKey(date, tz) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/** 24-hour `HH:MM` label for an instant in a given timezone. */
export function formatTime(date, tz) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

/** Human date-divider label ("Mon, Jun 12") for an instant in a given timezone. */
export function formatDateLabel(date, tz) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(date);
}
