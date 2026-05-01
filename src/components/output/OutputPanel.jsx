import React from "react";

const postTitle = (post) => (post?.rowData?.title || post?.rowData?.slide1_title || "Untitled");

export const OutputPanel = ({
  activeProjectId,
  activeProjectName,
  rowsCount,
  generated,
  selectedPostIndex,
  onSelectPost,
  generateBusy,
  genProgress,
  exportBaseName,
  setExportBaseName,
  exportZipName,
  setExportZipName,
  exportFormat,
  setExportFormat,
  onGenerateAll,
  onDownloadZip,
  onExportSelectedSlides,
}) => {
  const entries = React.useMemo(() => (
    Object.entries(generated).sort((a, b) => Number(a[0]) - Number(b[0]))
  ), [generated]);

  const selectedPost = selectedPostIndex == null ? null : generated[String(selectedPostIndex)];
  const slidesCount = selectedPost?.slides?.length || 0;
  const [selectedSlides, setSelectedSlides] = React.useState(() => new Set());

  React.useEffect(() => {
    setSelectedSlides(new Set());
  }, [selectedPostIndex]);

  const toggleSlide = (i) => {
    setSelectedSlides((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  return (
    <div className="output-panel">
      <div className="panel-card">
        <div className="panel-card-title">Status</div>
        <div className="status-block">
          <div className="status-row">
            <span className="status-label">Project</span>
            <span className="status-value">{activeProjectId ? (activeProjectName || activeProjectId) : "None"}</span>
          </div>
          <div className="status-row">
            <span className="status-label">Rows</span>
            <span className="status-value">{rowsCount}</span>
          </div>
          <div className="status-row">
            <span className="status-label">Generated</span>
            <span className="status-value">{entries.length}</span>
          </div>
          {generateBusy && genProgress?.total ? (
            <div className="status-progress" aria-live="polite">
              Generating {genProgress.current}/{genProgress.total}
              <div className="status-progress-bar">
                <span style={{ width: `${Math.max(0, Math.min(100, (genProgress.current / genProgress.total) * 100))}%` }} />
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="panel-card">
        <div className="panel-card-title">Export settings</div>
        <label className="panel-field">
          <span>PNG prefix</span>
          <input value={exportBaseName} onChange={(e) => setExportBaseName(e.target.value)} />
        </label>
        <label className="panel-field">
          <span>ZIP name</span>
          <input value={exportZipName} onChange={(e) => setExportZipName(e.target.value)} />
        </label>
        <label className="panel-field">
          <span>Format</span>
          <select value={exportFormat} onChange={(e) => setExportFormat(e.target.value)} aria-label="Export format">
            <option value="png">PNG</option>
            <option value="jpg">JPG</option>
          </select>
        </label>
      </div>

      <div className="panel-card">
        <div className="panel-card-title">Actions</div>
        <button type="button" className="panel-primary" onClick={onGenerateAll} disabled={!rowsCount || generateBusy}>
          {generateBusy ? "Generating…" : "Generate all posts"}
        </button>
        <button type="button" className="panel-secondary" onClick={onDownloadZip} disabled={!entries.length}>
          Download ZIP
        </button>
        <button
          type="button"
          className="panel-secondary"
          onClick={() => onExportSelectedSlides?.(Array.from(selectedSlides))}
          disabled={!selectedPost || !selectedSlides.size}
        >
          Export selected slides
        </button>
      </div>

      <div className="panel-card">
        <div className="panel-card-title">Selected slides</div>
        {!selectedPost ? (
          <div className="panel-empty">Select a generated post to choose slides.</div>
        ) : (
          <div className="slide-picks" aria-label="Select slides to export">
            {Array.from({ length: slidesCount }, (_, i) => (
              <button
                key={i}
                type="button"
                className={`slide-pick ${selectedSlides.has(i) ? "active" : ""}`}
                onClick={() => toggleSlide(i)}
                aria-pressed={selectedSlides.has(i)}
              >
                Slide {i + 1}
              </button>
            ))}
          </div>
        )}
        <div className="panel-hint">Tip: pick slides here, then click “Export selected slides”.</div>
      </div>

      <div className="panel-card">
        <div className="panel-card-title">Output</div>
        {!activeProjectId ? (
          <div className="panel-empty">Create/select a project to view output.</div>
        ) : !rowsCount ? (
          <div className="panel-empty">Upload Excel to populate rows.</div>
        ) : !entries.length ? (
          <div className="panel-empty">Generate posts to start editing.</div>
        ) : (
          <div className="post-list" role="listbox" aria-label="Generated posts">
            {entries.map(([idx, post]) => {
              const i = Number(idx);
              const active = selectedPostIndex === i;
              return (
                <button
                  key={idx}
                  type="button"
                  className={`post-list-item ${active ? "active" : ""}`}
                  onClick={() => onSelectPost(i)}
                  role="option"
                  aria-selected={active}
                >
                  <span className="post-list-num">#{i + 1}</span>
                  <span className="post-list-title">{postTitle(post)}</span>
                  <span className="post-list-type">{post.type}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

