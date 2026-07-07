import { describe, it, expect } from 'vitest';
import {
  resolveGeo,
  placeKey,
  eventsForPlaceKey,
  centroid,
  isMatch,
} from '../src/lib/places.js';

const ev = (id, label, lat, lng, content = '') => ({
  id,
  t: new Date(2026, 5, 12, id),
  content,
  place: { label, lat, lng },
});

describe('resolveGeo', () => {
  it('prefers raw coordinates', () => {
    expect(resolveGeo(ev(0, 'Queens', 40.7, -73.8))).toEqual({ lat: 40.7, lng: -73.8 });
  });

  it('falls back to a drag-pinned geocode by lowercased label', () => {
    const e = ev(0, 'Queens', NaN, NaN);
    const geo = resolveGeo(e, { queens: { lat: 1, lng: 2 } });
    expect(geo).toEqual({ lat: 1, lng: 2 });
  });

  it('returns null when nothing resolves', () => {
    expect(resolveGeo(ev(0, 'Queens', NaN, NaN))).toBeNull();
    expect(resolveGeo(ev(0, '', NaN, NaN))).toBeNull();
  });
});

describe('placeKey', () => {
  it('keys by lowercased trimmed label', () => {
    expect(placeKey(ev(0, '  Queens, NY  ', NaN, NaN))).toBe('label:queens, ny');
  });

  it('keys by rounded coordinates when there is no label', () => {
    expect(placeKey(ev(0, '', 40.7282, -73.7949))).toBe('geo:40.728,-73.795');
  });

  it('returns null when there is neither a label nor coordinates', () => {
    expect(placeKey(ev(0, '', NaN, NaN))).toBeNull();
  });
});

describe('eventsForPlaceKey', () => {
  it('returns events sharing a key in chronological order', () => {
    const events = [ev(2, 'Queens', 40.7, -73.8), ev(1, 'Queens', 40.7, -73.8), ev(0, 'Bronx', 40.8, -73.9)];
    const key = placeKey(events[0]);
    const matches = eventsForPlaceKey(events, key);
    expect(matches.map((e) => e.id)).toEqual([1, 2]);
  });
});

describe('centroid', () => {
  it('averages resolvable coordinates', () => {
    const events = [ev(0, 'a', 0, 0), ev(1, 'b', 2, 4)];
    expect(centroid(events, {}, { lat: 99, lng: 99 })).toEqual({ lat: 1, lng: 2 });
  });

  it('returns the fallback when there are no coordinates', () => {
    const events = [ev(0, 'a', NaN, NaN)];
    expect(centroid(events, {}, { lat: 40.7, lng: -74 })).toEqual({ lat: 40.7, lng: -74 });
  });
});

describe('isMatch', () => {
  it('matches empty search against everything', () => {
    expect(isMatch(ev(0, 'Queens', 0, 0, 'hello'), '')).toBe(true);
  });

  it('matches content case-insensitively', () => {
    expect(isMatch(ev(0, 'Queens', 0, 0, 'Hello World'), 'hello')).toBe(true);
  });

  it('matches place label', () => {
    expect(isMatch(ev(0, 'Queens', 0, 0, 'x'), 'queen')).toBe(true);
  });

  it('returns false when neither matches', () => {
    expect(isMatch(ev(0, 'Queens', 0, 0, 'x'), 'zzz')).toBe(false);
  });
});
