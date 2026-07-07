// Generated demo call-log data (NYC-area, ~18 events over ~3 days).
// Not loaded from a file — purely in-code so the tool works offline.

export function genSample() {
  const base = Date.UTC(2026, 5, 12, 4, 0, 0);
  const mins = (m) => new Date(base + m * 60000);
  const S = {
    q: [40.7282, -73.7949, 'Queens, NY'],
    b: [40.6782, -73.9442, 'Brooklyn, NY'],
    x: [40.8448, -73.8648, 'Bronx, NY'],
    m: [40.7831, -73.9712, 'Manhattan, NY'],
    j: [40.7178, -74.0431, 'Jersey City, NJ'],
  };
  const rows = [
    [134, 'Incoming call · 4m12s', S.q],
    [150, 'ok, talk later', S.q],
    [543, 'On my way, leaving now', S.q],
    [560, 'see you soon', S.q],
    [887, 'heading there now — meet at the usual spot', S.b],
    [895, 'got it, 20 min omw', S.b],
    [1042, 'Outgoing call · 2m10s', S.m],
    [1262, 'Incoming call · 11m02s', S.x],
    [1490, 'just landed', S.x],
    [1700, 'Incoming call · 0m30s', S.j],
    [2200, "let's meet at noon tomorrow", S.m],
    [2215, 'sounds good', S.m],
    [2900, 'Outgoing call · 1m50s', S.q],
    [2920, "can't sleep, you up?", S.q],
    [3600, 'meet me at the cafe', S.b],
    [3610, 'on my way', S.b],
    [3615, 'here now', S.b],
    [4100, 'Incoming call · 3m40s', S.j],
  ];
  return rows.map(([m, content, spot], i) => ({
    id: i,
    t: mins(m),
    content,
    place: { label: spot[2], lat: spot[0], lng: spot[1] },
  }));
}
