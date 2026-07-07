import { TZ_LIST } from '../lib/constants.js';

export default function Toolbar({
  accent,
  search,
  onSearchChange,
  showMatchCount,
  matchCount,
  placeSelection,
  clearPlaceSelection,
  sunReference,
  clearSunReference,
  zoomIn,
  zoomOut,
  timezone,
  onTzChange,
  loadSample,
  clearData,
  openFilePicker,
  fileInputRef,
  onFileInputChange,
}) {
  return (
    <div className="toolbar">
      <div className="wordmark">Time &amp; Place</div>
      <div className="tb-divider" />

      <input
        type="text"
        className="tb-search"
        placeholder="Search messages &amp; places…"
        value={search}
        onChange={onSearchChange}
      />

      {showMatchCount && (
        <div className="tb-muted tb-none">
          {matchCount} match{matchCount === 1 ? '' : 'es'}
        </div>
      )}

      <div className="tb-hint tb-none">↑↓ / j (up) k (down) to step through messages</div>

      {placeSelection && (
        <div className="chip-accent tb-none" style={{ borderColor: accent, background: `color-mix(in srgb,${accent} 14%, white)` }}>
          <span>
            📍 {placeSelection.label} · {placeSelection.index + 1}/{placeSelection.count}
          </span>
          <span className="chip-close" onClick={clearPlaceSelection}>
            ✕
          </span>
        </div>
      )}

      <div className="tb-spacer" />

      <div className="tb-legend tb-none">
        <span className="legend-dot legend-day" />
        day
        <span className="legend-dot legend-night" />
        night
      </div>

      {sunReference && (
        <div className="chip-plain tb-none" title="Right-click the map to move it">
          <span>
            ☀ {sunReference.lat.toFixed(2)}, {sunReference.lng.toFixed(2)}
          </span>
          <span className="chip-close" onClick={clearSunReference}>
            ✕
          </span>
        </div>
      )}

      <div className="zoom-control tb-none">
        <button onClick={zoomOut} aria-label="Zoom out">
          −
        </button>
        <div className="zoom-divider" />
        <button onClick={zoomIn} aria-label="Zoom in">
          +
        </button>
      </div>

      <select className="tb-select tb-none" value={timezone} onChange={onTzChange} aria-label="Timezone">
        {TZ_LIST.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>

      <button className="btn-secondary tb-none" onClick={loadSample}>
        Sample data
      </button>
      <button className="btn-secondary tb-none" onClick={clearData}>
        Clear
      </button>
      <button className="btn-primary tb-none" style={{ background: accent }} onClick={openFilePicker}>
        ⇪ Upload CSV
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        onChange={onFileInputChange}
        style={{ display: 'none' }}
      />
    </div>
  );
}
