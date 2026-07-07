export default function Timeline({
  scrollRef,
  width,
  layout,
  events,
  onSelect,
  onPlaceClick,
  onPlaceDragStart,
  onPlaceDragEnd,
}) {
  return (
    <div className="timeline" ref={scrollRef} style={{ width }}>
      <div className="timeline-canvas" style={{ height: layout.totalPx }}>
        {layout.bands.map((b, i) => (
          <div
            key={'b' + i}
            className="band"
            style={{ top: b.top, height: b.height, background: b.color }}
          />
        ))}

        {layout.hourGridlines.map((h, i) => (
          <div key={'h' + i}>
            <div className="gridline" style={{ top: h.top }} />
            <div className="gridline-label" style={{ top: h.top }}>
              {h.label}
            </div>
          </div>
        ))}

        {layout.dateLabels.map((d, i) => (
          <div key={'d' + i} className="date-label" style={{ top: d.top }}>
            {d.label}
          </div>
        ))}

        {events.map((ev) => (
          <div
            key={ev.id}
            className="event-row"
            style={{
              top: ev.topPx,
              opacity: ev.opacity,
              background: ev.rowBg,
              borderLeft: ev.leftBorder,
            }}
            onClick={() => onSelect(ev.id)}
          >
            <div
              className="event-dot"
              style={{ background: ev.dotColor, boxShadow: `0 0 0 1px ${ev.dotColor}` }}
            />
            <div className="event-time">{ev.timeLabel}</div>
            <div className="event-content">{ev.contentSnippet}</div>
            {ev.hasPlace && (
              <div
                className="place-chip"
                draggable={ev.draggablePlace}
                title={ev.placeChipTitle}
                style={{
                  border: `1px ${ev.placeChipStyle} ${ev.placeChipBorder}`,
                  cursor: ev.placeChipCursor,
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onPlaceClick(ev.pkey);
                }}
                onDragStart={(e) => onPlaceDragStart(e, ev.placeLabelRaw)}
                onDragEnd={onPlaceDragEnd}
              >
                {ev.placeLabel}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
