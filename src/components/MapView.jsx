import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import {
  MARKER_NORMAL,
  MARKER_DIMMED,
  MARKER_SELECTED,
  SUN_REF_RING,
} from '../lib/constants.js';
import { isMatch, placeKey, resolveGeo } from '../lib/places.js';
import { formatTime } from '../lib/datetime.js';

function esc(s) {
  return (s || '').replace(
    /[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]
  );
}

export default function MapView({
  accent,
  markerStyle,
  events,
  placeGeocodes,
  selectedId,
  search,
  timezone,
  sunReference,
  fitToken,
  draggingPlaceLabel,
  onMarkerClick,
  onMapRightClick,
  onPinPlace,
  showNoGeoHint,
  apiRef,
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerLayerRef = useRef(null);
  const boundsFitRef = useRef(false);
  const lastFitTokenRef = useRef(fitToken);

  // Latest callbacks/values, so the Leaflet event handlers bound once on mount
  // always see current props without needing to rebind.
  const cbRef = useRef({});
  cbRef.current = { onMapRightClick, onPinPlace };

  // ---------- init map once (deferred until the container has real size) ----------
  useEffect(() => {
    let cancelled = false;

    const init = () => {
      if (cancelled || mapRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      // Initialising Leaflet before layout gives a zero-size container, which
      // permanently corrupts its internal pixel-bounds math — defer instead.
      if (rect.width < 2 || rect.height < 2) {
        requestAnimationFrame(init);
        return;
      }
      const map = L.map(containerRef.current, {
        zoomControl: true,
        fadeAnimation: false,
      }).setView([40.7128, -74.006], 11);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors',
      }).addTo(map);
      markerLayerRef.current = L.layerGroup().addTo(map);
      map.on('contextmenu', (evt) => cbRef.current.onMapRightClick(evt.latlng));
      map.invalidateSize();
      mapRef.current = map;
      if (apiRef) apiRef.current = { invalidateSize: () => map.invalidateSize() };
      setTimeout(() => map.invalidateSize(), 150);
    };

    requestAnimationFrame(() => requestAnimationFrame(init));

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      if (apiRef) apiRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- sync markers whenever inputs change ----------
  useEffect(() => {
    const map = mapRef.current;
    const layer = markerLayerRef.current;
    if (!map || !layer) return;

    if (lastFitTokenRef.current !== fitToken) {
      boundsFitRef.current = false;
      lastFitTokenRef.current = fitToken;
    }

    layer.clearLayers();
    const sorted = events.slice().sort((a, b) => a.t - b.t);
    const withGeo = sorted
      .map((e) => ({ e, geo: resolveGeo(e, placeGeocodes) }))
      .filter((x) => x.geo);

    const addMarker = ({ e, geo }) => {
      const matched = isMatch(e, search);
      const selected = e.id === selectedId;
      const color = selected ? MARKER_SELECTED : matched ? MARKER_NORMAL : MARKER_DIMMED;

      if (selected) {
        L.circleMarker([geo.lat, geo.lng], {
          radius: 20,
          stroke: false,
          fillColor: MARKER_SELECTED,
          fillOpacity: 0.16,
          interactive: false,
        }).addTo(layer);
        L.circleMarker([geo.lat, geo.lng], {
          radius: 13,
          color: MARKER_SELECTED,
          weight: 2,
          fillColor: '#fff',
          fillOpacity: 0.9,
          interactive: false,
        }).addTo(layer);
      }

      let marker;
      if (markerStyle === 'pins') {
        const size = selected ? 26 : 16;
        const icon = L.divIcon({
          html:
            '<div style="width:' +
            size +
            'px;height:' +
            size +
            'px;border-radius:50% 50% 50% 0;background:' +
            color +
            ';transform:rotate(-45deg);border:' +
            (selected ? 3 : 2) +
            'px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>',
          iconSize: [size, size],
          iconAnchor: [size / 2, size],
          className: '',
        });
        marker = L.marker([geo.lat, geo.lng], { icon });
      } else {
        marker = L.circleMarker([geo.lat, geo.lng], {
          radius: selected ? 8 : 6,
          color: '#fff',
          weight: selected ? 3 : 2,
          fillColor: color,
          fillOpacity: 1,
        });
      }

      const timeLabel = formatTime(e.t, timezone);
      marker.bindPopup(
        '<b>' +
          timeLabel +
          '</b><br>' +
          esc(e.content) +
          '<br><span style="color:#888">' +
          esc(e.place.label) +
          '</span>'
      );
      marker.on('click', () => onMarkerClick(placeKey(e)));
      marker.addTo(layer);
    };

    // Draw unselected first, then the selected marker last so it sits on top.
    withGeo.filter((x) => x.e.id !== selectedId).forEach(addMarker);
    withGeo.filter((x) => x.e.id === selectedId).forEach(addMarker);

    if (withGeo.length && !boundsFitRef.current) {
      const bounds = L.latLngBounds(withGeo.map((x) => [x.geo.lat, x.geo.lng]));
      map.fitBounds(bounds.pad(0.25));
      boundsFitRef.current = true;
    }
    if (selectedId != null) {
      const sel = withGeo.find((x) => x.e.id === selectedId);
      if (sel) map.panTo([sel.geo.lat, sel.geo.lng]);
    }

    if (sunReference) {
      const icon = L.divIcon({
        html:
          '<div style="width:20px;height:20px;border-radius:50%;background:#fff;border:2px solid ' +
          SUN_REF_RING +
          ';display:flex;align-items:center;justify-content:center;font-size:12px;box-shadow:0 1px 4px rgba(0,0,0,.35)">☀</div>',
        iconSize: [20, 20],
        iconAnchor: [10, 10],
        className: '',
      });
      L.marker([sunReference.lat, sunReference.lng], { icon, zIndexOffset: 1000 })
        .bindPopup('Sun reference — right-click map to move, or clear from the toolbar')
        .addTo(layer);
    }
  }, [
    events,
    placeGeocodes,
    selectedId,
    search,
    timezone,
    sunReference,
    markerStyle,
    accent,
    fitToken,
    onMarkerClick,
  ]);

  const onDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };
  const onDrop = (e) => {
    e.preventDefault();
    const label = e.dataTransfer.getData('text/plain');
    const map = mapRef.current;
    if (!label || !map) return;
    const latlng = map.mouseEventToLatLng(e.nativeEvent);
    cbRef.current.onPinPlace(label, latlng);
  };

  return (
    <div className="map-col" onDragOver={onDragOver} onDrop={onDrop}>
      <div ref={containerRef} className="map-canvas" />
      {draggingPlaceLabel && (
        <div className="map-drop-hint" style={{ borderColor: accent, color: accent }}>
          Drop to pin &quot;{draggingPlaceLabel}&quot; here
        </div>
      )}
      {showNoGeoHint && (
        <div className="map-nogeo-hint">
          No coordinates in this data yet — drag a dashed place tag from the timeline onto
          the map to pin it, or right-click the map to set a reference location for the
          day/night colors.
        </div>
      )}
    </div>
  );
}
