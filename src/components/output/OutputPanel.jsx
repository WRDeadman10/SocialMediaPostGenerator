import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MotionButton } from "../../motion/components/MotionButton.jsx";
import { MotionDurations, MotionEasing, motionTransition } from "../../motion/tokens.js";

export const OutputPanel = ({
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
      <div className="output-header">
        <span className="output-title">Production</span>
        <div className="output-badge">{Object.keys(generated).length} Generated</div>
      </div>

      <div className="output-content">
        <div className="output-section">
          <span className="section-label">Generation Status</span>
          {generateBusy ? (
            <div className="production-progress">
              <div className="progress-info">
                <span>Generating Posts...</span>
                <span>{genProgress.current} / {genProgress.total}</span>
              </div>
              <div className="progress-bar-bg">
                <motion.div 
                  className="progress-bar-fill"
                  animate={{ width: `${(genProgress.current / genProgress.total) * 100}%` }}
                />
              </div>
            </div>
          ) : (
            <button 
              className="generate-all-btn" 
              onClick={onGenerateAll}
              disabled={generateBusy}
            >
              <span>⚡</span> Generate All Posts
            </button>
          )}
        </div>

        <div className="output-section">
          <span className="section-label">Export Center</span>
          <div className="export-settings">
            <div className="export-field">
              <label>Prefix</label>
              <input value={exportBaseName} onChange={(e) => setExportBaseName(e.target.value)} />
            </div>
            <div className="export-field">
              <label>Format</label>
              <select value={exportFormat} onChange={(e) => setExportFormat(e.target.value)}>
                <option value="png">PNG (Lossless)</option>
                <option value="jpg">JPG (Web)</option>
              </select>
            </div>
          </div>
          
          <button 
            className="export-zip-btn"
            onClick={onDownloadZip}
            disabled={Object.keys(generated).length === 0}
          >
            Download ZIP Bundle
          </button>
        </div>

        <div className="output-section">
          <span className="section-label">Selective Slide Export</span>
          {!selectedPost ? (
            <div className="selection-empty">Select a post to view slides</div>
          ) : (
            <>
              <div className="slide-selection-grid">
                {Array.from({ length: slidesCount }, (_, i) => (
                  <button
                    key={i}
                    className={`slide-select-btn ${selectedSlides.has(i) ? "active" : ""}`}
                    onClick={() => toggleSlide(i)}
                  >
                    S{i + 1}
                  </button>
                ))}
              </div>
              <button 
                className="export-selected-btn"
                onClick={() => onExportSelectedSlides?.(Array.from(selectedSlides))}
                disabled={selectedSlides.size === 0}
              >
                Export {selectedSlides.size} Slides
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
