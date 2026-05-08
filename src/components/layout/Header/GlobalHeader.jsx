import React from "react";
import { ProjectSelector } from "./ProjectSelector.jsx";

export const GlobalHeader = ({
  projects,
  activeProjectId,
  onSelectProject,
  onNewProject,
  onEditBranding,
  onExport,
  onToggleLeft,
  onToggleRight,
  leftOpen,
  rightOpen,
  theme,
  onToggleTheme,
  sfxMuted,
  onToggleSfx,
}) => {
  return (
    <div className="global-header">
      <div className="header-left">
        <div className="brand">
          <div className="brand-icon">✦</div>
          <div className="brand-text">
            <b>Post Generator</b>
            <span>VIITORCLOUD</span>
          </div>
        </div>
        
        <div className="header-divider" />
        
        <ProjectSelector 
          projects={projects}
          activeProjectId={activeProjectId}
          onSelectProject={onSelectProject}
          onNewProject={onNewProject}
        />
      </div>

      <div className="header-center">
        {/* Placeholder for future context-aware tools */}
      </div>

      <div className="header-right">
        <div className="header-actions">
          <button 
            className="action-btn branding-btn"
            onClick={onEditBranding}
            title="Edit Project Branding"
          >
            <span className="btn-icon">🎨</span>
            Edit Branding
          </button>
          
          <button 
            className="action-btn export-btn"
            onClick={onExport}
            title="Export Assets"
          >
            <span className="btn-icon">📤</span>
            Export
          </button>
        </div>

        <div className="header-divider" />

        <div className="header-utils">
          <button
            type="button"
            className={`util-btn ${leftOpen ? "active" : ""}`}
            onClick={onToggleLeft}
            title={leftOpen ? "Collapse Navigator" : "Expand Navigator"}
          >
            ⟨
          </button>
          
          <button
            type="button"
            className="util-btn"
            onClick={onToggleSfx}
            title={sfxMuted ? "Unmute SFX" : "Mute SFX"}
          >
            {sfxMuted ? "🔇" : "🔊"}
          </button>
          
          <button
            type="button"
            className="util-btn"
            onClick={onToggleTheme}
            title="Toggle Theme"
          >
            {theme === "dark" ? "☀" : "☾"}
          </button>

          <button
            type="button"
            className={`util-btn ${rightOpen ? "active" : ""}`}
            onClick={onToggleRight}
            title={rightOpen ? "Collapse Outputs" : "Expand Outputs"}
          >
            ⟩
          </button>
        </div>
      </div>
    </div>
  );
};
