// CSV parsing, column auto-detection, and row → event conversion.
// Kept free of DOM/library globals so it can be unit-tested directly;
// PapaParse is injected by the caller.

/**
 * Guess which CSV columns map to which roles by case-insensitive substring
 * match against header names, in priority order.
 * @param {string[]} headers
 */
export function autoDetect(headers) {
  const find = (kws) =>
    headers.find((h) => kws.some((k) => h.toLowerCase().includes(k))) ||
    headers[0] ||
    '';
  const findOpt = (kws) =>
    headers.find((h) => kws.some((k) => h.toLowerCase().includes(k))) || '';
  return {
    datetime: find(['datetime', 'timestamp', 'date_time', 'date', 'time']),
    content: findOpt(['content', 'message', 'text', 'body', 'sms', 'transcript', 'note']),
    place: findOpt(['place', 'location', 'city', 'address']),
    lat: findOpt(['lat']),
    lng: findOpt(['lng', 'lon', 'long']),
  };
}

/**
 * Parse a raw datetime cell into a Date, or null if unparseable.
 * Retries "YYYY-MM-DD HH:MM:SS" as "...THH:MM:SS" — some engines (notably
 * Safari) refuse the space-separated form.
 */
export function parseDatetime(raw) {
  if (raw == null || raw === '') return null;
  let t = new Date(raw);
  if (isNaN(t.getTime()) && typeof raw === 'string') {
    t = new Date(raw.trim().replace(' ', 'T'));
  }
  return isNaN(t.getTime()) ? null : t;
}

/**
 * Convert parsed CSV rows into event objects using a column mapping.
 * Rows with an unparseable/missing datetime are silently skipped.
 * @returns {{events: Array, invalidCount: number}}
 */
export function rowsToEvents(rows, map) {
  let id = 0;
  let invalidCount = 0;
  const events = [];
  rows.forEach((row) => {
    const raw = map.datetime ? row[map.datetime] : null;
    const t = parseDatetime(raw);
    if (!t) {
      invalidCount++;
      return;
    }
    const lat = map.lat ? parseFloat(row[map.lat]) : NaN;
    const lng = map.lng ? parseFloat(row[map.lng]) : NaN;
    events.push({
      id: id++,
      t,
      content: map.content ? row[map.content] || '' : '',
      place: {
        label: map.place ? row[map.place] || '' : '',
        lat,
        lng,
      },
    });
  });
  return { events, invalidCount };
}

/**
 * Parse CSV text with PapaParse and auto-detect a column mapping.
 * @param {string} text
 * @param {object} Papa - the PapaParse module/global.
 */
export function parseCsv(text, Papa) {
  const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
  const headers = parsed.meta.fields || [];
  const rows = parsed.data;
  return { headers, rows, map: autoDetect(headers) };
}
