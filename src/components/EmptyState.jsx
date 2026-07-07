export default function EmptyState({ accent, openFilePicker, loadSample }) {
  return (
    <div className="empty-state">
      <div className="empty-inner">
        <div className="empty-title">No data loaded</div>
        <div className="empty-body">
          Drag a CSV anywhere on this page, or upload one — a datetime column and
          message/place columns are all you need. Or preview with sample call-log data.
        </div>
        <div className="empty-actions">
          <button className="btn-primary" style={{ background: accent }} onClick={openFilePicker}>
            Upload CSV
          </button>
          <button className="btn-secondary" onClick={loadSample}>
            Load sample data
          </button>
        </div>
      </div>
    </div>
  );
}
