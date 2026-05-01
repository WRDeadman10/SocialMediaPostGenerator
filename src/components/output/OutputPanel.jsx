import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MotionButton } from "../../motion/components/MotionButton.jsx";
import { MotionDurations, MotionEasing, motionTransition } from "../../motion/tokens.js";

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
  const [justGenerated, setJustGenerated] = React.useState(false);
  const prevGeneratedCountRef = React.useRef(0);

  React.useEffect(() => {
    setSelectedSlides(new Set());
  }, [selectedPostIndex]);

  React.useEffect(() => {
    const count = entries.length;
    const prev = prevGeneratedCountRef.current;
    prevGeneratedCountRef.current = count;
    if (generateBusy) return;
    if (count && count > prev) {
      setJustGenerated(true);
      const t = window.setTimeout(() => setJustGenerated(false), 900);
      return () => window.clearTimeout(t);
    }
    return undefined;
  }, [entries.length, generateBusy]);

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
                <motion.span
                  style={{ transformOrigin: "0 50%" }}
                  initial={false}
                  animate={{ scaleX: Math.max(0, Math.min(1, (genProgress.current / genProgress.total))) }}
                  transition={motionTransition(MotionDurations.standard, MotionEasing.emphasized)}
                />
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
        <MotionButton type="button" className="panel-primary" onClick={onGenerateAll} disabled={!rowsCount || generateBusy}>
          <span className="btn-stack" aria-hidden="true">
            <AnimatePresence mode="wait" initial={false}>
              {generateBusy ? (
                <motion.span
                  key="busy"
                  className="btn-busy"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={motionTransition(MotionDurations.micro, MotionEasing.standard)}
                >
                  <span className="btn-spinner" />
                  Generating…
                </motion.span>
              ) : (
                <motion.span
                  key="idle"
                  className="btn-idle"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={motionTransition(MotionDurations.micro, MotionEasing.standard)}
                >
                  {justGenerated ? "✓ Generated" : "Generate all posts"}
                </motion.span>
              )}
            </AnimatePresence>
          </span>
        </MotionButton>
        <MotionButton type="button" className="panel-secondary" onClick={onDownloadZip} disabled={!entries.length}>
          Download ZIP
        </MotionButton>
        <MotionButton
          type="button"
          className="panel-secondary"
          onClick={() => onExportSelectedSlides?.(Array.from(selectedSlides))}
          disabled={!selectedPost || !selectedSlides.size}
        >
          Export selected slides
        </MotionButton>
      </div>

      <div className="panel-card">
        <div className="panel-card-title">Selected slides</div>
        {!selectedPost ? (
          <div className="panel-empty">Select a generated post to choose slides.</div>
        ) : (
          <div className="slide-picks" aria-label="Select slides to export">
            {Array.from({ length: slidesCount }, (_, i) => (
              <MotionButton
                key={i}
                type="button"
                className={`slide-pick ${selectedSlides.has(i) ? "active" : ""}`}
                onClick={() => toggleSlide(i)}
                aria-pressed={selectedSlides.has(i)}
              >
                Slide {i + 1}
              </MotionButton>
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
                <MotionButton
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
                </MotionButton>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

