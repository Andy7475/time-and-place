import { describe, it, expect } from 'vitest';
import { lerpHue, lerpColor, easeColor, cssOklch } from '../src/lib/color.js';

describe('lerpHue', () => {
  it('interpolates linearly within a hue range', () => {
    expect(lerpHue(0, 100, 0.5)).toBeCloseTo(50);
  });

  it('takes the shortest path across the 0/360 boundary', () => {
    // 350 -> 10 should pass through 0, not sweep all the way down through 180.
    expect(lerpHue(350, 10, 0.5)).toBeCloseTo(0);
  });

  it('returns a value normalised to [0, 360)', () => {
    const h = lerpHue(350, 10, 0.25);
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThan(360);
  });
});

describe('lerpColor', () => {
  it('interpolates lightness and chroma linearly', () => {
    const c = lerpColor([0, 0, 0], [1, 0.2, 0], 0.5);
    expect(c[0]).toBeCloseTo(0.5);
    expect(c[1]).toBeCloseTo(0.1);
  });
});

describe('easeColor', () => {
  it('clamps factors outside [0, 1]', () => {
    expect(easeColor([0, 0, 0], [1, 0, 0], -5)).toEqual([0, 0, 0]);
    expect(easeColor([0, 0, 0], [1, 0, 0], 5)).toEqual([1, 0, 0]);
  });

  it('is symmetric at the midpoint', () => {
    const c = easeColor([0, 0, 0], [1, 0, 0], 0.5);
    expect(c[0]).toBeCloseTo(0.5);
  });
});

describe('cssOklch', () => {
  it('formats a triple with fixed precision', () => {
    expect(cssOklch([0.5, 0.1, 264])).toBe('oklch(0.500 0.100 264.0)');
  });
});
