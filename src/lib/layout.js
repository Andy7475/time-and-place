// The consistent real-time axis.
//
// Every minute of real elapsed time maps to the same pixel scale. The only
// distortion is a local floor applied between two events that fall very close
// together, so their rows don't collide (an "auto-zoom" for busy bursts).
// Everywhere else — including long quiet gaps — is true to scale, with hourly
// gridlines marking the passage of empty time.

import { BASE_PX_PER_MIN, MIN_ROW_PX, PAD_MIN } from './constants.js';
import { cssOklch } from './color.js';
import { colorAt } from './sun.js';
import { dateKey, formatTime, formatDateLabel } from './datetime.js';

const EMPTY_LAYOUT = {
  totalPx: 0,
  bands: [],
  hourGridlines: [],
  dateLabels: [],
  eventPx: {},
  sorted: [],
};

const SAMPLE_MIN = 20; // gradient sampling interval, in simulated minutes

/**
 * Compute the full timeline layout.
 * @param {Array} events - event objects with `{ id, t: Date }`.
 * @param {string} tz - IANA timezone.
 * @param {boolean} autoExpand - apply the busy-burst minimum row floor.
 * @param {number} zoom - pixel-scale multiplier.
 * @param {{lat:number,lng:number}} refLocation - day/night reference location.
 */
export function computeLayout(events, tz, autoExpand, zoom, refLocation) {
  if (!events.length) return { ...EMPTY_LAYOUT };
  const sorted = events.slice().sort((a, b) => a.t - b.t);
  const centroidLoc = refLocation;

  const boundaries = [
    sorted[0].t.getTime() - PAD_MIN * 60000,
    ...sorted.map((e) => e.t.getTime()),
    sorted[sorted.length - 1].t.getTime() + PAD_MIN * 60000,
  ];

  let px = 0;
  const segPx = [0];
  const segs = [];
  for (let i = 0; i < boundaries.length - 1; i++) {
    const a = boundaries[i];
    const b = boundaries[i + 1];
    const deltaMin = (b - a) / 60000;
    const natural = deltaMin * BASE_PX_PER_MIN * (zoom || 1);
    const h = autoExpand ? Math.max(natural, MIN_ROW_PX) : natural;
    segs.push({ a, b, px0: px, px1: px + h });
    px += h;
    segPx.push(px);
  }
  const totalPx = px;

  const eventPx = {};
  sorted.forEach((e, idx) => {
    eventPx[e.id] = segPx[idx + 1];
  });

  const bands = [];
  const hourGridlines = [];
  segs.forEach((seg) => {
    const pxAt = (t) =>
      seg.px0 + ((t - seg.a) / (seg.b - seg.a)) * (seg.px1 - seg.px0);
    const spanMs = seg.b - seg.a;

    // Continuous day/night gradient, sampled at a fixed real-time interval.
    const stops = [seg.a];
    for (let t = seg.a + SAMPLE_MIN * 60000; t < seg.b; t += SAMPLE_MIN * 60000) {
      stops.push(t);
    }
    stops.push(seg.b);
    const stopStrs = stops.map((t) => {
      const pct = spanMs > 0 ? ((t - seg.a) / spanMs) * 100 : 0;
      const ymd = dateKey(new Date(t), tz);
      return cssOklch(colorAt(new Date(t), ymd, centroidLoc)) + ' ' + pct.toFixed(2) + '%';
    });
    bands.push({
      top: seg.px0,
      height: seg.px1 - seg.px0,
      color: 'linear-gradient(to bottom,' + stopStrs.join(',') + ')',
    });

    // Hour gridlines — one every real clock-hour, even through long empty gaps.
    const firstHour = Math.ceil(seg.a / 3600000) * 3600000;
    for (let m = firstHour; m < seg.b; m += 3600000) {
      if (m <= seg.a) continue;
      hourGridlines.push({ top: pxAt(m), label: formatTime(new Date(m), tz) });
    }
  });

  const dateLabels = [];
  let prevKey = null;
  sorted.forEach((e) => {
    const k = dateKey(e.t, tz);
    if (k !== prevKey) {
      dateLabels.push({
        top: Math.max(0, eventPx[e.id] - 22),
        label: formatDateLabel(e.t, tz),
      });
      prevKey = k;
    }
  });

  return { totalPx, bands, hourGridlines, dateLabels, eventPx, sorted };
}
