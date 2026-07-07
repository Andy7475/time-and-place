import { describe, it, expect } from 'vitest';
import { autoDetect, parseDatetime, rowsToEvents, parseCsv } from '../src/lib/csv.js';
import Papa from 'papaparse';

describe('autoDetect', () => {
  it('matches columns by keyword, case-insensitively', () => {
    const map = autoDetect(['Timestamp', 'Message', 'City', 'Lat', 'Lng']);
    expect(map).toEqual({
      datetime: 'Timestamp',
      content: 'Message',
      place: 'City',
      lat: 'Lat',
      lng: 'Lng',
    });
  });

  it('falls back to the first column for the required datetime', () => {
    const map = autoDetect(['foo', 'bar']);
    expect(map.datetime).toBe('foo');
  });

  it('leaves optional roles empty when nothing matches', () => {
    const map = autoDetect(['foo', 'bar']);
    expect(map.content).toBe('');
    expect(map.place).toBe('');
    expect(map.lat).toBe('');
    expect(map.lng).toBe('');
  });

  it('matches longitude via lon/long as well as lng', () => {
    expect(autoDetect(['when', 'longitude']).lng).toBe('longitude');
    expect(autoDetect(['when', 'lon']).lng).toBe('lon');
  });
});

describe('parseDatetime', () => {
  it('parses ISO strings', () => {
    const d = parseDatetime('2026-06-12T04:30:00Z');
    expect(d.getTime()).toBe(Date.UTC(2026, 5, 12, 4, 30, 0));
  });

  it('retries space-separated datetimes without a T separator', () => {
    const d = parseDatetime('2026-06-12 04:30:00');
    expect(d).not.toBeNull();
    expect(isNaN(d.getTime())).toBe(false);
  });

  it('returns null for empty or unparseable values', () => {
    expect(parseDatetime('')).toBeNull();
    expect(parseDatetime(null)).toBeNull();
    expect(parseDatetime('not a date')).toBeNull();
  });
});

describe('rowsToEvents', () => {
  const map = { datetime: 'when', content: 'msg', place: 'city', lat: 'lat', lng: 'lng' };

  it('converts valid rows into event objects with incrementing ids', () => {
    const rows = [
      { when: '2026-06-12T04:00:00Z', msg: 'hi', city: 'Queens', lat: '40.7', lng: '-73.8' },
      { when: '2026-06-12T05:00:00Z', msg: 'bye', city: 'Bronx', lat: '40.8', lng: '-73.9' },
    ];
    const { events } = rowsToEvents(rows, map);
    expect(events).toHaveLength(2);
    expect(events[0].id).toBe(0);
    expect(events[1].id).toBe(1);
    expect(events[0].content).toBe('hi');
    expect(events[0].place).toEqual({ label: 'Queens', lat: 40.7, lng: -73.8 });
  });

  it('skips rows with an unparseable datetime and counts them', () => {
    const rows = [
      { when: 'garbage', msg: 'x', city: '', lat: '', lng: '' },
      { when: '2026-06-12T04:00:00Z', msg: 'ok', city: '', lat: '', lng: '' },
    ];
    const { events, invalidCount } = rowsToEvents(rows, map);
    expect(events).toHaveLength(1);
    expect(invalidCount).toBe(1);
  });

  it('leaves lat/lng as NaN when no coordinate columns are mapped', () => {
    const rows = [{ when: '2026-06-12T04:00:00Z', msg: 'x', city: 'Queens' }];
    const noGeo = { datetime: 'when', content: 'msg', place: 'city', lat: '', lng: '' };
    const { events } = rowsToEvents(rows, noGeo);
    expect(isNaN(events[0].place.lat)).toBe(true);
    expect(isNaN(events[0].place.lng)).toBe(true);
  });
});

describe('parseCsv (integration with PapaParse)', () => {
  it('parses text and auto-detects a mapping', () => {
    const text = 'datetime,message,city\n2026-06-12T04:00:00Z,hello,Queens\n';
    const { headers, rows, map } = parseCsv(text, Papa);
    expect(headers).toEqual(['datetime', 'message', 'city']);
    expect(rows).toHaveLength(1);
    expect(map.datetime).toBe('datetime');
    expect(map.content).toBe('message');
    expect(map.place).toBe('city');
  });
});
