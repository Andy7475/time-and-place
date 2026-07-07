import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Papa from 'papaparse';

import {
  DEFAULT_ACCENT,
  DEFAULT_CENTROID,
  TIMELINE_WIDTH_DEFAULT,
  TIMELINE_WIDTH_MIN,
  TIMELINE_WIDTH_MAX,
  ZOOM_MIN,
  ZOOM_MAX,
  ZOOM_STEP,
} from './lib/constants.js';
import { computeLayout } from './lib/layout.js';
import { formatTime } from './lib/datetime.js';
import { parseCsv, rowsToEvents } from './lib/csv.js';
import { genSample } from './lib/sample.js';
import {
  centroid,
  eventsForPlaceKey,
  isMatch,
  placeKey,
  resolveGeo,
} from './lib/places.js';

import Toolbar from './components/Toolbar.jsx';
import Timeline from './components/Timeline.jsx';
import MapView from './components/MapView.jsx';
import MappingModal from './components/MappingModal.jsx';
import EmptyState from './components/EmptyState.jsx';

// Design tweaks (kept as constants; see the Designer handoff for alternatives).
const ACCENT = DEFAULT_ACCENT;
const MARKER_STYLE = 'dots'; // 'dots' | 'pins'
const COMPRESS_LONG_GAPS = true;

export default function App() {
  const [events, setEvents] = useState([]);
  const [timezone, setTimezone] = useState('America/New_York');
  const [search, setSearch] = useState('');
  const [dragging, setDragging] = useState(false);
  const [pendingMapping, setPendingMapping] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [placeCycleIndex, setPlaceCycleIndex] = useState(0);
  const [sunReference, setSunReference] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [timelineWidth, setTimelineWidth] = useState(TIMELINE_WIDTH_DEFAULT);
  const [placeGeocodes, setPlaceGeocodes] = useState({});
  const [draggingPlaceLabel, setDraggingPlaceLabel] = useState(null);
  // Bumped whenever the map should refit its bounds to the data.
  const [fitToken, setFitToken] = useState(0);

  const timelineScrollRef = useRef(null);
  const fileInputRef = useRef(null);

  const refitMap = useCallback(() => setFitToken((n) => n + 1), []);

  // ---------- derived: reference location for the day/night colours ----------
  const refLocation = useMemo(
    () => sunReference || centroid(events, placeGeocodes, DEFAULT_CENTROID),
    [sunReference, events, placeGeocodes]
  );

  // ---------- derived: timeline layout ----------
  const layout = useMemo(
    () => computeLayout(events, timezone, COMPRESS_LONG_GAPS, zoom, refLocation),
    [events, timezone, zoom, refLocation]
  );

  const scrollToEvent = useCallback(
    (id) => {
      const el = timelineScrollRef.current;
      if (el && layout.eventPx[id] != null) {
        el.scrollTo({ top: Math.max(0, layout.eventPx[id] - 160), behavior: 'smooth' });
      }
    },
    [layout]
  );

  // ---------- selection ----------
  const selectEvent = useCallback(
    (id) => {
      setSelectedId(id);
      setSelectedPlace(null);
      setPlaceCycleIndex(0);
      scrollToEvent(id);
    },
    [scrollToEvent]
  );

  const cyclePlace = useCallback(
    (key) => {
      if (!key) return;
      const matches = eventsForPlaceKey(events, key);
      if (!matches.length) return;
      const idx = selectedPlace === key ? (placeCycleIndex + 1) % matches.length : 0;
      const ev = matches[idx];
      setSelectedPlace(key);
      setPlaceCycleIndex(idx);
      setSelectedId(ev.id);
      scrollToEvent(ev.id);
    },
    [events, selectedPlace, placeCycleIndex, scrollToEvent]
  );

  const clearPlaceSelection = useCallback(() => {
    setSelectedPlace(null);
    setPlaceCycleIndex(0);
  }, []);

  // ---------- keyboard navigation (j = up, k = down; intentional reversal) ----------
  useEffect(() => {
    const onKeyDown = (e) => {
      const tag = (document.activeElement && document.activeElement.tagName) || '';
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      const down = e.key === 'ArrowDown' || e.key === 'k' || e.key === 'K';
      const up = e.key === 'ArrowUp' || e.key === 'j' || e.key === 'J';
      if (!down && !up) return;
      e.preventDefault();
      let list = events.slice().sort((a, b) => a.t - b.t);
      if (search.trim()) list = list.filter((ev) => isMatch(ev, search));
      if (!list.length) return;
      let idx = list.findIndex((ev) => ev.id === selectedId);
      if (idx === -1) idx = down ? 0 : list.length - 1;
      else idx = down ? Math.min(list.length - 1, idx + 1) : Math.max(0, idx - 1);
      selectEvent(list[idx].id);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [events, search, selectedId, selectEvent]);

  // ---------- CSV ingestion ----------
  const handleFile = useCallback((file) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        setPendingMapping(parseCsv(String(reader.result), Papa));
      } catch (err) {
        console.error('CSV parse failed', err);
      }
    };
    reader.readAsText(file);
  }, []);

  const openFilePicker = useCallback(() => {
    if (fileInputRef.current) fileInputRef.current.click();
  }, []);

  const onFileInputChange = useCallback(
    (e) => {
      const f = e.target.files[0];
      if (f) handleFile(f);
      e.target.value = '';
    },
    [handleFile]
  );

  const confirmMapping = useCallback(() => {
    if (!pendingMapping) return;
    const { events: parsed } = rowsToEvents(pendingMapping.rows, pendingMapping.map);
    setEvents(parsed);
    setPendingMapping(null);
    setSelectedId(null);
    refitMap();
  }, [pendingMapping, refitMap]);

  const updateMappingField = useCallback((field, value) => {
    setPendingMapping((prev) =>
      prev ? { ...prev, map: { ...prev.map, [field]: value } } : prev
    );
  }, []);

  // ---------- file drag over the whole app ----------
  const onDragOver = useCallback(
    (e) => {
      e.preventDefault();
      if (!dragging) setDragging(true);
    },
    [dragging]
  );
  const onDragLeave = useCallback(() => setDragging(false), []);
  const onDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragging(false);
      const f = e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) handleFile(f);
    },
    [handleFile]
  );

  // ---------- sample / clear ----------
  const loadSample = useCallback(() => {
    setEvents(genSample());
    setSelectedId(null);
    setSearch('');
    refitMap();
  }, [refitMap]);

  const clearData = useCallback(() => {
    setEvents([]);
    setSelectedId(null);
    refitMap();
  }, [refitMap]);

  // Load sample data on first mount, mirroring the prototype.
  useEffect(() => {
    setEvents(genSample());
  }, []);

  // ---------- timezone / zoom / resize ----------
  const onTzChange = useCallback(
    (e) => {
      setTimezone(e.target.value);
      refitMap();
    },
    [refitMap]
  );
  const zoomIn = useCallback(() => setZoom((z) => Math.min(ZOOM_MAX, z * ZOOM_STEP)), []);
  const zoomOut = useCallback(() => setZoom((z) => Math.max(ZOOM_MIN, z / ZOOM_STEP)), []);

  const mapApiRef = useRef(null); // set by MapView: { invalidateSize }
  const onResizeStart = useCallback((e) => {
    e.preventDefault();
    const startX = e.clientX;
    let startWidth;
    setTimelineWidth((w) => {
      startWidth = w;
      return w;
    });
    const onMove = (ev) => {
      const w = Math.min(
        TIMELINE_WIDTH_MAX,
        Math.max(TIMELINE_WIDTH_MIN, startWidth + (ev.clientX - startX))
      );
      setTimelineWidth(w);
      mapApiRef.current?.invalidateSize();
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      setTimeout(() => mapApiRef.current?.invalidateSize(), 50);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, []);

  // ---------- sun reference (right-click on the map) ----------
  const onMapRightClick = useCallback(
    (latlng) => {
      setSunReference({ lat: latlng.lat, lng: latlng.lng });
      refitMap();
    },
    [refitMap]
  );
  const clearSunReference = useCallback(() => setSunReference(null), []);

  // ---------- drag a place chip onto the map to pin it ----------
  const onPlaceDragStart = useCallback((e, label) => {
    e.dataTransfer.setData('text/plain', label);
    e.dataTransfer.effectAllowed = 'copy';
    setDraggingPlaceLabel(label);
  }, []);
  const onPlaceDragEnd = useCallback(() => setDraggingPlaceLabel(null), []);
  const pinPlace = useCallback(
    (label, latlng) => {
      setDraggingPlaceLabel(null);
      if (!label) return;
      const key = label.trim().toLowerCase();
      setPlaceGeocodes((prev) => ({ ...prev, [key]: { lat: latlng.lat, lng: latlng.lng } }));
      refitMap();
    },
    [refitMap]
  );

  // ---------- derived render values ----------
  const searchTrim = search.trim();
  const matchCount = useMemo(
    () => (searchTrim ? events.filter((e) => isMatch(e, search)).length : 0),
    [events, search, searchTrim]
  );

  const selectedPlaceInfo = useMemo(() => {
    if (!selectedPlace) return null;
    const matches = eventsForPlaceKey(events, selectedPlace);
    if (!matches.length) return null;
    return {
      label: matches[0].place.label || 'Unnamed place',
      count: matches.length,
      index: placeCycleIndex % matches.length,
    };
  }, [selectedPlace, events, placeCycleIndex]);

  const displayEvents = useMemo(() => {
    const sorted = events.slice().sort((a, b) => a.t - b.t);
    return sorted.map((e) => {
      const matched = isMatch(e, search);
      const selected = e.id === selectedId;
      const dimmed = !!searchTrim && !matched;
      const key = placeKey(e);
      const placeHighlighted = !!selectedPlace && key === selectedPlace;

      let dotColor = '#55565c';
      if (selected || placeHighlighted) dotColor = ACCENT;
      else if (searchTrim && matched) dotColor = ACCENT;
      else if (dimmed) dotColor = '#c7c7c2';

      let rowBg = 'rgba(255,255,255,.62)';
      let leftBorder = '3px solid transparent';
      if (selected) {
        rowBg = 'rgba(255,255,255,.92)';
        leftBorder = '3px solid ' + ACCENT;
      } else if (placeHighlighted) {
        rowBg = 'color-mix(in srgb,' + ACCENT + ' 16%, white)';
        leftBorder = '3px solid color-mix(in srgb,' + ACCENT + ' 55%, white)';
      } else if (searchTrim && matched) {
        rowBg = 'var(--match)';
      }

      const hasRawGeo = !!(e.place && isFinite(e.place.lat) && isFinite(e.place.lng));
      const draggablePlace = !!(
        e.place &&
        e.place.label &&
        e.place.label.trim() &&
        !hasRawGeo
      );
      const isPinned = draggablePlace && !!resolveGeo(e, placeGeocodes);

      return {
        id: e.id,
        pkey: key,
        topPx: layout.eventPx[e.id] || 0,
        timeLabel: formatTime(e.t, timezone),
        contentSnippet: e.content || '(no content)',
        hasPlace: !!(e.place && e.place.label),
        placeLabel: e.place ? e.place.label : '',
        opacity: dimmed && !placeHighlighted ? 0.32 : 1,
        dotColor,
        rowBg,
        leftBorder,
        placeChipBorder: placeHighlighted ? ACCENT : isPinned ? ACCENT : 'var(--line)',
        placeChipStyle: draggablePlace && !isPinned ? 'dashed' : 'solid',
        placeChipCursor: draggablePlace ? 'grab' : 'pointer',
        placeChipTitle: draggablePlace
          ? isPinned
            ? 'Drag onto the map to move this pin'
            : 'Drag onto the map to pin this place — every message with this place name will follow'
          : '',
        draggablePlace,
        placeLabelRaw: e.place ? e.place.label : '',
      };
    });
  }, [events, search, searchTrim, selectedId, selectedPlace, placeGeocodes, layout, timezone]);

  const hasData = events.length > 0;
  const showNoGeoHint =
    hasData && !draggingPlaceLabel && !events.some((e) => resolveGeo(e, placeGeocodes));

  return (
    <div className="app-root">
      <Toolbar
        accent={ACCENT}
        search={search}
        onSearchChange={(e) => setSearch(e.target.value)}
        showMatchCount={!!searchTrim}
        matchCount={matchCount}
        placeSelection={selectedPlaceInfo}
        clearPlaceSelection={clearPlaceSelection}
        sunReference={sunReference}
        clearSunReference={clearSunReference}
        zoomIn={zoomIn}
        zoomOut={zoomOut}
        timezone={timezone}
        onTzChange={onTzChange}
        loadSample={loadSample}
        clearData={clearData}
        openFilePicker={openFilePicker}
        fileInputRef={fileInputRef}
        onFileInputChange={onFileInputChange}
      />

      <div
        className="app-main"
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        {dragging && (
          <div className="overlay-drop" style={{ borderColor: ACCENT, color: ACCENT }}>
            Drop CSV to visualize
          </div>
        )}

        {!hasData && (
          <EmptyState accent={ACCENT} openFilePicker={openFilePicker} loadSample={loadSample} />
        )}

        <Timeline
          scrollRef={timelineScrollRef}
          width={timelineWidth}
          layout={layout}
          events={displayEvents}
          onSelect={selectEvent}
          onPlaceClick={cyclePlace}
          onPlaceDragStart={onPlaceDragStart}
          onPlaceDragEnd={onPlaceDragEnd}
        />

        <div className="resize-handle" onMouseDown={onResizeStart}>
          <div className="resize-grip" />
        </div>

        <MapView
          accent={ACCENT}
          markerStyle={MARKER_STYLE}
          events={events}
          placeGeocodes={placeGeocodes}
          selectedId={selectedId}
          search={search}
          timezone={timezone}
          sunReference={sunReference}
          fitToken={fitToken}
          draggingPlaceLabel={draggingPlaceLabel}
          onMarkerClick={cyclePlace}
          onMapRightClick={onMapRightClick}
          onPinPlace={pinPlace}
          showNoGeoHint={showNoGeoHint}
          apiRef={mapApiRef}
        />
      </div>

      {pendingMapping && (
        <MappingModal
          accent={ACCENT}
          mapping={pendingMapping}
          updateField={updateMappingField}
          onConfirm={confirmMapping}
          onCancel={() => setPendingMapping(null)}
        />
      )}
    </div>
  );
}
