import { describe, it, expect } from 'vitest';
import { sunTimesForDay, dayKeyframes, colorAt } from '../src/lib/sun.js';
import { C_MIDNIGHT, C_NOON } from '../src/lib/constants.js';

describe('sunTimesForDay', () => {
  it('computes a plausible sunrise before sunset for NYC in June', () => {
    const s = sunTimesForDay('2026-06-21', 40.7128, -74.006);
    expect(s.sunrise).toBeInstanceOf(Date);
    expect(s.sunset).toBeInstanceOf(Date);
    expect(s.sunrise.getTime()).toBeLessThan(s.transit.getTime());
    expect(s.transit.getTime()).toBeLessThan(s.sunset.getTime());
  });

  it('reports 24h daylight above the Arctic circle at midsummer', () => {
    const s = sunTimesForDay('2026-06-21', 78, 15);
    expect(s.alwaysDay).toBe(true);
    expect(s.sunrise).toBeNull();
  });

  it('reports 24h night above the Arctic circle at midwinter', () => {
    const s = sunTimesForDay('2026-12-21', 78, 15);
    expect(s.alwaysNight).toBe(true);
    expect(s.sunset).toBeNull();
  });
});

describe('dayKeyframes', () => {
  it('produces ten interpolation stops for a normal day', () => {
    const kf = dayKeyframes('2026-06-21', 40.7128, -74.006);
    expect(kf.stops).toHaveLength(10);
    expect(kf.flat).toBeUndefined();
  });

  it('produces a flat night colour for a polar winter day', () => {
    const kf = dayKeyframes('2026-12-21', 78, 15);
    expect(kf.flat).toEqual(C_MIDNIGHT);
  });

  it('produces a flat day colour for a polar summer day', () => {
    const kf = dayKeyframes('2026-06-21', 78, 15);
    expect(kf.flat).toEqual(C_NOON);
  });
});

describe('colorAt', () => {
  it('returns a flat colour directly for polar days', () => {
    const c = colorAt(new Date('2026-12-21T12:00:00Z'), '2026-12-21', { lat: 78, lng: 15 });
    expect(c).toEqual(C_MIDNIGHT);
  });

  it('returns an OKLCH triple for a normal day', () => {
    const c = colorAt(new Date('2026-06-21T16:00:00Z'), '2026-06-21', { lat: 40.7, lng: -74 });
    expect(c).toHaveLength(3);
    expect(typeof c[0]).toBe('number');
  });
});
