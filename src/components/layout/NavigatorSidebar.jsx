import React from "react";
import { motion } from "framer-motion";

export const NavigatorSidebar = ({
  rows,
  generated,
  activePostIndex,
  onSelectPost,
  generateBusy,
  stats
}) => {
  return (
    <aside className="navigator-sidebar">
      <div className="navigator-header">
        <span className="navigator-title">Navigator</span>
        <div className="navigator-badge">{rows.length} Posts</div>
      </div>

      <div className="navigator-content">
        <div className="navigator-section">
          <span className="section-label">Campaign Posts</span>
          <div className="post-navigator-list">
            {rows.map((row, idx) => {
              const isGenerated = !!generated[idx];
              const isActive = activePostIndex === idx;
              
              return (
                <button
                  key={idx}
                  className={`nav-item ${isActive ? "active" : ""} ${isGenerated ? "generated" : ""}`}
                  onClick={() => onSelectPost(idx)}
                >
                  <div className="nav-item-num">{(idx + 1).toString().padStart(2, "0")}</div>
                  <div className="nav-item-info">
                    <span className="nav-item-name">{row.title || row.slide1_title || `Post ${idx + 1}`}</span>
                    <span className="nav-item-type">
                      {row.post_type || "Single"} • {isGenerated ? "Ready" : "Pending"}
                    </span>
                  </div>
                  {isGenerated && <span className="nav-item-status">✓</span>}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="navigator-footer">
        <div className="mini-stats">
          <div className="mini-stat">
            <span className="mini-stat-label">Done</span>
            <span className="mini-stat-value">{stats.done}</span>
          </div>
          <div className="mini-stat-divider" />
          <div className="mini-stat">
            <span className="mini-stat-label">Pending</span>
            <span className="mini-stat-value">{stats.pending}</span>
          </div>
        </div>
        <div className="mini-progress-bg">
          <motion.div 
            className="mini-progress-fill"
            initial={{ width: 0 }}
            animate={{ width: `${stats.total ? (stats.done / stats.total) * 100 : 0}%` }}
          />
        </div>
      </div>
    </aside>
  );
};
