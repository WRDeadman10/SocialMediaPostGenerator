import React from "react";

export const StepReview = ({ data }) => {
  const { config, name, rows } = data;

  return (
    <div className="wizard-step-review">
      <div className="review-layout">
        <div className="review-details">
          <div className="review-group">
            <label>Project Name</label>
            <div className="review-value">{name || "Untitled Project"}</div>
          </div>

          <div className="review-group">
            <label>Configuration Summary</label>
            <div className="review-meta-grid">
              <div className="meta-item">
                <span className="meta-label">Post Type</span>
                <span className="meta-val">{config.postType}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Data Rows</span>
                <span className="meta-val">{rows.length}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Main Font</span>
                <span className="meta-val">{config.fontTitle}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Branding</span>
                <span className="meta-val">{config.logoDataUrl ? "Logo Set" : "No Logo"}</span>
              </div>
            </div>
          </div>

          <div className="review-alert">
            <span>🚀</span>
            <p>Ready to launch your production pipeline. You can always edit these settings later from the "Edit Branding" button in the header.</p>
          </div>
        </div>

        <div className="review-preview">
          <span className="preview-title">Quick Preview</span>
          <div className="mini-preview-card">
            <div 
              className="preview-canvas-mock"
              style={{ backgroundColor: config.bgColor, backgroundImage: config.bgDataUrl ? `url(${config.bgDataUrl})` : "none" }}
            >
              {config.logoDataUrl && (
                <img src={config.logoDataUrl} style={{ height: config.logoH / 4 }} alt="Logo" />
              )}
              <div className="mock-text" style={{ color: config.titleColor, fontFamily: config.fontTitle }}>
                Headline Preview
              </div>
              <div className="mock-cta" style={{ backgroundColor: config.ctaBg, color: config.ctaTxt }}>
                CTA
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
