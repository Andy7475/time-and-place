import { describe, it, expect } from 'vitest';
import { computeLayout } from '../src/lib/layout.js';
import { BASE_PX_PER_MIN, MIN_ROW_PX, PAD_MIN } from '../src/lib/constants.js';

const REF = { lat: 40.7128, lng: -74.006 };
const TZ = 'America/New_York';

const ev = (id, minutesFromBase) => ({
  id,
  t: new Date(Date.UTC(2026, 5, 12, 4, 0, 0) + minutesFromBase * 60000),
  content: 'e' + id,
  place: { label: 'Queens', lat: 40.7, lng: -73.8 },
});

describe('computeLayout', () => {
  it('returns an empty layout for no events', () => {
    const l = computeLayout([], TZ, true, 1, REF);
    expect(l.totalPx).toBe(0);
    expect(l.bands).toEqual([]);
    expect(l.eventPx).toEqual({});
  });

  it('maps elapsed time to a consistent pixel scale (no auto-expand)', () => {
    // Two events 100 minutes apart. With pure scale (autoExpand off) the gap
    // between them should be exactly 100 * BASE_PX_PER_MIN pixels.
    const events = [ev(0, 0), ev(1, 100)];
    const l = computeLayout(events, TZ, false, 1, REF);
    const gap = l.eventPx[1] - l.eventPx[0];
    expect(gap).toBeCloseTo(100 * BASE_PX_PER_MIN);
  });

  it('applies the minimum-row floor for near-simultaneous events when auto-expanding', () => {
    // Two events 1 minute apart: natural gap (0.8px) < MIN_ROW_PX, so the floor applies.
    const events = [ev(0, 0), ev(1, 1)];
    const l = computeLayout(events, TZ, true, 1, REF);
    expect(l.eventPx[1] - l.eventPx[0]).toBeCloseTo(MIN_ROW_PX);
  });

  it('scales the whole axis by the zoom factor', () => {
    const events = [ev(0, 0), ev(1, 100)];
    const base = computeLayout(events, TZ, false, 1, REF);
    const zoomed = computeLayout(events, TZ, false, 2, REF);
    expect(zoomed.totalPx).toBeCloseTo(base.totalPx * 2);
  });

  it('pads before the first and after the last event', () => {
    const events = [ev(0, 0), ev(1, 100)];
    const l = computeLayout(events, TZ, false, 1, REF);
    // First event sits PAD_MIN worth of pixels below the top of the canvas.
    expect(l.eventPx[0]).toBeCloseTo(PAD_MIN * BASE_PX_PER_MIN);
  });

  it('emits one gradient band per inter-event segment', () => {
    const events = [ev(0, 0), ev(1, 100), ev(2, 200)];
    const l = computeLayout(events, TZ, false, 1, REF);
    // segments = events + 1 (leading + trailing pad) = 4 boundaries -> 4 segments
    expect(l.bands.length).toBe(events.length + 1);
    l.bands.forEach((b) => expect(b.color).toContain('linear-gradient'));
  });

  it('produces hourly gridlines across a long quiet gap', () => {
    // 6-hour gap should yield roughly 6 gridlines, not be collapsed away.
    const events = [ev(0, 0), ev(1, 360)];
    const l = computeLayout(events, TZ, false, 1, REF);
    expect(l.hourGridlines.length).toBeGreaterThanOrEqual(5);
  });

  it('emits a date label for each distinct calendar day', () => {
    const events = [ev(0, 0), ev(1, 60 * 24)]; // next day
    const l = computeLayout(events, TZ, false, 1, REF);
    expect(l.dateLabels.length).toBe(2);
  });
});
