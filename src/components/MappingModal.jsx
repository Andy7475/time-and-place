function HeaderSelect({ value, onChange, headers, includeNone, label }) {
  return (
    <>
      <label className="modal-label">{label}</label>
      <select className="modal-select" value={value} onChange={onChange}>
        {includeNone && <option value="">— none —</option>}
        {headers.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
    </>
  );
}

export default function MappingModal({ accent, mapping, updateField, onConfirm, onCancel }) {
  const { headers, map } = mapping;
  const change = (field) => (e) => updateField(field, e.target.value);

  return (
    <div className="modal-scrim">
      <div className="modal-card">
        <div className="modal-title">Map CSV columns</div>
        <div className="modal-subtext">
          We guessed based on header names — adjust if needed.
        </div>

        <HeaderSelect
          label="Datetime *"
          value={map.datetime}
          onChange={change('datetime')}
          headers={headers}
        />
        <HeaderSelect
          label="Content / message text"
          value={map.content}
          onChange={change('content')}
          headers={headers}
          includeNone
        />
        <HeaderSelect
          label="Place / city label"
          value={map.place}
          onChange={change('place')}
          headers={headers}
          includeNone
        />

        <div className="modal-row">
          <div className="modal-col">
            <HeaderSelect
              label="Latitude"
              value={map.lat}
              onChange={change('lat')}
              headers={headers}
              includeNone
            />
          </div>
          <div className="modal-col">
            <HeaderSelect
              label="Longitude"
              value={map.lng}
              onChange={change('lng')}
              headers={headers}
              includeNone
            />
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button
            className="btn-primary"
            style={{ background: accent }}
            onClick={onConfirm}
            disabled={!map.datetime}
          >
            Visualize
          </button>
        </div>
      </div>
    </div>
  );
}
