// Pure helpers for a place's identity and its resolved coordinates.
//
// An event's "place identity" is its trimmed/lowercased label (or its rounded
// lat/lng when there is no label). This is the join key used to link a place
// across multiple messages.

/**
 * Resolve an event's coordinates, preferring its own raw lat/lng and falling
 * back to a manually drag-pinned geocode keyed by lowercased label.
 * @returns {{lat:number,lng:number}|null}
 */
export function resolveGeo(e, placeGeocodes = {}) {
  if (e.place && isFinite(e.place.lat) && isFinite(e.place.lng)) {
    return { lat: e.place.lat, lng: e.place.lng };
  }
  if (e.place && e.place.label) {
    const g = placeGeocodes[e.place.label.trim().toLowerCase()];
    if (g) return { lat: g.lat, lng: g.lng };
  }
  return null;
}

/** Stable key identifying the place-group an event belongs to (or null). */
export function placeKey(e) {
  if (e.place && e.place.label && e.place.label.trim()) {
    return 'label:' + e.place.label.trim().toLowerCase();
  }
  if (e.place && isFinite(e.place.lat) && isFinite(e.place.lng)) {
    return 'geo:' + e.place.lat.toFixed(3) + ',' + e.place.lng.toFixed(3);
  }
  return null;
}

/** Every event sharing `key`, in chronological order. */
export function eventsForPlaceKey(events, key) {
  return events.filter((e) => placeKey(e) === key).sort((a, b) => a.t - b.t);
}

/** Average of every resolvable coordinate, or `fallback` when there are none. */
export function centroid(events, placeGeocodes, fallback) {
  const pts = events.map((e) => resolveGeo(e, placeGeocodes)).filter(Boolean);
  if (!pts.length) return fallback;
  let lat = 0;
  let lng = 0;
  pts.forEach((p) => {
    lat += p.lat;
    lng += p.lng;
  });
  return { lat: lat / pts.length, lng: lng / pts.length };
}

/** Case-insensitive substring match against content and place label. */
export function isMatch(e, search) {
  const s = (search || '').trim().toLowerCase();
  if (!s) return true;
  return (
    (e.content || '').toLowerCase().includes(s) ||
    ((e.place && e.place.label) || '').toLowerCase().includes(s)
  );
}
