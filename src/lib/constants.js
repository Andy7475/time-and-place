// ---------- timeline layout ----------
// Every minute of real elapsed time maps to the same pixel scale (before zoom),
// so quiet gaps are shown proportionally rather than being compressed away.
export const BASE_PX_PER_MIN = 0.8;
// Minimum height applied to the segment between two very-close events so their
// rows don't visually collide (the "auto-zoom for busy bursts" behaviour).
export const MIN_ROW_PX = 34;
// Padding (in minutes) added before the first and after the last event.
export const PAD_MIN = 40;

export const ZOOM_MIN = 0.25;
export const ZOOM_MAX = 6;
export const ZOOM_STEP = 1.4;

export const TIMELINE_WIDTH_DEFAULT = 400;
export const TIMELINE_WIDTH_MIN = 260;
export const TIMELINE_WIDTH_MAX = 800;

// ---------- day/night gradient anchors (OKLCH [L, C, H]) ----------
export const C_MIDNIGHT = [0.24, 0.09, 264]; // dark blue
export const C_NIGHT = [0.42, 0.1, 258]; // blue
export const C_SUNRISE = [0.72, 0.15, 45]; // warm orange
export const C_DAY = [0.9, 0.09, 95]; // yellow
export const C_NOON = [0.985, 0.012, 95]; // near-white
export const C_SUNSET = [0.68, 0.16, 38]; // warm orange/red
export const C_DUSK = [0.55, 0.06, 20]; // grey-red

// Default reference location when a dataset has no resolvable coordinates (NYC).
export const DEFAULT_CENTROID = { lat: 40.7128, lng: -74.006 };

// Marker colours (independent of the tweakable accent).
export const MARKER_NORMAL = '#55565c';
export const MARKER_DIMMED = '#c7c7c2';
export const MARKER_SELECTED = '#1462ff';
export const SUN_REF_RING = '#d9770a';

export const DEFAULT_ACCENT = '#2a6fdb';

export const TZ_LIST = [
  ['America/New_York', 'Eastern (New York)'],
  ['America/Chicago', 'Central (Chicago)'],
  ['America/Denver', 'Mountain (Denver)'],
  ['America/Los_Angeles', 'Pacific (LA)'],
  ['America/Anchorage', 'Alaska'],
  ['UTC', 'UTC'],
  ['Europe/London', 'London'],
  ['Europe/Paris', 'Paris'],
  ['Europe/Moscow', 'Moscow'],
  ['Asia/Dubai', 'Dubai'],
  ['Asia/Kolkata', 'Kolkata'],
  ['Asia/Shanghai', 'Shanghai'],
  ['Asia/Tokyo', 'Tokyo'],
  ['Australia/Sydney', 'Sydney'],
  ['Pacific/Auckland', 'Auckland'],
];
