// Self-contained implementation of the standard "sunrise equation"
// (NOAA / Wikipedia algorithm) plus a continuous day/night colour curve.
// No external astronomy library required — this is plain math.

import { easeColor } from './color.js';
import {
  C_MIDNIGHT,
  C_NIGHT,
  C_SUNRISE,
  C_DAY,
  C_NOON,
  C_SUNSET,
  C_DUSK,
} from './constants.js';

const DEG = Math.PI / 180;

// Results only depend on (date, rounded lat/lng, angle), so caching is safe and
// makes re-rendering the gradient cheap.
const sunCache = new Map();

function toJulian(date) {
  return date.getTime() / 86400000 - 0.5 + 2440588;
}
function fromJulian(j) {
  return new Date((j + 0.5 - 2440588) * 86400000);
}

/**
 * Times at which the sun reaches `angleDeg` above the horizon on the given day.
 * `ymd` is a `YYYY-MM-DD` string. Longitude uses the sunrise-equation
 * west-positive convention internally (`lw = -lng`).
 */
export function sunAngleTimes(ymd, lat, lng, angleDeg) {
  const key = `${ymd}|${lat.toFixed(2)}|${lng.toFixed(2)}|${angleDeg}`;
  const cached = sunCache.get(key);
  if (cached) return cached;

  const lw = -lng;
  const noon = new Date(`${ymd}T12:00:00Z`);
  const J1 = toJulian(noon);
  const n = Math.round(J1 - 2451545.0009 - lw / 360);
  const Jstar = 2451545.0009 + lw / 360 + n;
  const M = (((357.5291 + 0.98560028 * (Jstar - 2451545)) % 360) + 360) % 360;
  const Mrad = M * DEG;
  const C =
    1.9148 * Math.sin(Mrad) +
    0.02 * Math.sin(2 * Mrad) +
    0.0003 * Math.sin(3 * Mrad);
  const lambda = (((M + C + 180 + 102.9372) % 360) + 360) % 360;
  const lambdaRad = lambda * DEG;
  const Jtransit = Jstar + 0.0053 * Math.sin(Mrad) - 0.0069 * Math.sin(2 * lambdaRad);
  const decl = Math.asin(Math.sin(lambdaRad) * Math.sin(23.44 * DEG));
  const latRad = lat * DEG;
  const cosOmega =
    (Math.sin(angleDeg * DEG) - Math.sin(latRad) * Math.sin(decl)) /
    (Math.cos(latRad) * Math.cos(decl));
  const transit = fromJulian(Jtransit);

  let result;
  if (cosOmega > 1) {
    result = { sunrise: null, sunset: null, transit, alwaysDay: false, alwaysNight: true };
  } else if (cosOmega < -1) {
    result = { sunrise: null, sunset: null, transit, alwaysDay: true, alwaysNight: false };
  } else {
    const omega = (Math.acos(cosOmega) * 180) / Math.PI;
    result = {
      sunrise: fromJulian(Jtransit - omega / 360),
      sunset: fromJulian(Jtransit + omega / 360),
      transit,
      alwaysDay: false,
      alwaysNight: false,
    };
  }
  sunCache.set(key, result);
  return result;
}

/** Standard sunrise/sunset (accounts for refraction + solar disc: -0.833°). */
export function sunTimesForDay(ymd, lat, lng) {
  return sunAngleTimes(ymd, lat, lng, -0.833);
}

/**
 * Ten keyframe colours across a solar day (midnight → sunrise → noon → sunset →
 * midnight), or a single flat colour for polar 24h day/night. Anchored on the
 * real sun times so "middle of day/night" always reads as the clearest colour.
 */
export function dayKeyframes(ymd, lat, lng) {
  const key = `kf|${ymd}|${lat.toFixed(2)}|${lng.toFixed(2)}`;
  const cached = sunCache.get(key);
  if (cached) return cached;

  const sun = sunTimesForDay(ymd, lat, lng);
  let kf;
  if (sun.alwaysDay || sun.alwaysNight || !sun.sunrise || !sun.sunset || !sun.transit) {
    kf = { flat: sun.alwaysNight ? C_MIDNIGHT : C_NOON };
  } else {
    const transit = sun.transit.getTime();
    const sunrise = sun.sunrise.getTime();
    const sunset = sun.sunset.getTime();
    const midnightBefore = transit - 12 * 3600000;
    const midnightAfter = transit + 12 * 3600000;
    kf = {
      stops: [
        { t: midnightBefore, c: C_MIDNIGHT },
        { t: midnightBefore + 0.5 * (sunrise - midnightBefore), c: C_NIGHT },
        { t: sunrise, c: C_SUNRISE },
        { t: sunrise + 0.5 * (transit - sunrise), c: C_DAY },
        { t: transit, c: C_NOON },
        { t: transit + 0.5 * (sunset - transit), c: C_DAY },
        { t: sunset, c: C_SUNSET },
        { t: sunset + 0.25 * (midnightAfter - sunset), c: C_DUSK },
        { t: sunset + 0.6 * (midnightAfter - sunset), c: C_NIGHT },
        { t: midnightAfter, c: C_MIDNIGHT },
      ],
    };
  }
  sunCache.set(key, kf);
  return kf;
}

/**
 * OKLCH colour of the sky at instant `date`, where `ymdKey` is the timezone-aware
 * `YYYY-MM-DD` key for that instant and `centroid` is the reference location.
 */
export function colorAt(date, ymdKey, centroid) {
  const kf = dayKeyframes(ymdKey, centroid.lat, centroid.lng);
  if (kf.flat) return kf.flat;
  const tt = date.getTime();
  const stops = kf.stops;
  for (let i = 0; i < stops.length - 1; i++) {
    if (tt >= stops[i].t && tt <= stops[i + 1].t) {
      const f = (tt - stops[i].t) / (stops[i + 1].t - stops[i].t);
      return easeColor(stops[i].c, stops[i + 1].c, f);
    }
  }
  return tt < stops[0].t ? stops[0].c : stops[stops.length - 1].c;
}

/** Clear the internal sun/keyframe cache (used by tests). */
export function _clearSunCache() {
  sunCache.clear();
}
