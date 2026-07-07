# Time & Place

An in-browser tool for visualising event records (e.g. call/message logs) along
two axes at once:

- **Time** — a vertical, top-to-bottom timeline that is _true to real elapsed
  time_ (quiet gaps are shown proportionally, not compressed away) and shaded
  with a continuous day/night gradient computed from the sun's real position.
- **Place** — a live [Leaflet](https://leafletjs.com/) / OpenStreetMap map,
  one marker per geocoded event, linked to the timeline.

Drop or upload a CSV, map its columns, and every row becomes a timeline entry
linked to a map marker. **All processing happens in your browser** — no server,
no upload, no tracking (much like [rawgraphs.io](https://www.rawgraphs.io/) or
[CyberChef](https://gchq.github.io/CyberChef/)). The only network calls are for
OpenStreetMap map tiles.

👉 **Live app: https://andy7475.github.io/time-and-place/**

## Features

- **Consistent real-time axis** — every minute of elapsed time maps to the same
  pixel scale, with a small minimum-height floor so bursts of activity don't
  collide. Hourly gridlines mark the passage of empty time.
- **Continuous day/night gradient** — real sunrise/solar-noon/sunset math
  ("sunrise equation") drives an OKLCH colour curve behind the timeline.
- **CSV import** with automatic column detection and an adjustable mapping modal.
- **Search** across message content and place names at once, with live match
  counts and dimming of non-matches on both panels.
- **Place linking** — click a place chip or map marker to cycle through every
  message sharing that place, in chronological order.
- **Drag-to-pin geocoding** — drag a place tag with no coordinates onto the map
  to pin it; every message with that place name follows.
- **Sun reference** — right-click the map to anchor the day/night calculation to
  a specific location.
- **Timezone-aware** — a single global timezone drives every label and boundary.
- Keyboard navigation, resizable timeline, and zoom.

## Tech stack

- [React 18](https://react.dev/) + [Vite 6](https://vite.dev/)
- [Leaflet 1.9](https://leafletjs.com/) — map
- [PapaParse 5.4](https://www.papaparse.com/) — CSV parsing
- Native `Intl.DateTimeFormat` for all timezone handling (no date library)
- [Vitest](https://vitest.dev/) — unit tests

## Project structure

```
src/
  lib/           Pure, framework-free logic (fully unit-tested)
    color.js       OKLCH interpolation
    sun.js         Sunrise equation + day/night colour curve
    layout.js      The consistent real-time axis
    csv.js         Parsing, column auto-detect, row -> event conversion
    places.js      Place identity, geo resolution, search matching
    datetime.js    Intl-based timezone formatting
    sample.js      Generated demo data
    constants.js   Tunables and design tokens
  components/    React components (Toolbar, Timeline, MapView, MappingModal, ...)
  App.jsx        Central state container
  main.jsx       Entry point (+ ErrorBoundary)
tests/           Vitest unit tests for every lib module
```

The logic in `src/lib` is deliberately kept free of React and browser globals so
it can be reasoned about and tested in isolation — the React layer only wires
state to those pure functions.

## Development

```bash
npm install
npm run dev       # start the dev server
npm test          # run the unit tests
npm run lint      # lint
npm run build     # production build into dist/
npm run preview   # preview the production build
```

## CSV format

A **datetime** column is the only requirement. Optional columns: message
content, a place/city label, and latitude/longitude. Column roles are
auto-detected from header names and can be adjusted in the mapping modal.

```csv
datetime,message,place,lat,lng
2026-06-12 09:14:00,Incoming call,"Queens, NY",40.7282,-73.7949
2026-06-12 09:31:00,ok talk later,"Queens, NY",40.7282,-73.7949
```

Rows with an unparseable datetime are skipped. Places with a label but no
coordinates can be pinned to the map by dragging their tag.

## Deployment (CI/CD)

Every push and pull request to `main` runs lint, tests, and a production build
via GitHub Actions (`.github/workflows/deploy.yml`). On `main`, the built
`dist/` is published to GitHub Pages.

**One-time setup:** in the repository settings, under **Settings -> Pages**, set
**Source** to **GitHub Actions**.

## License

MIT — see [LICENSE](./LICENSE). Map data © OpenStreetMap contributors.

---

This app was recreated from a Claude Designer prototype into a modular,
tested React/Vite application.
