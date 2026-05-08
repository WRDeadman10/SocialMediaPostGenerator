import React from "react";
import { motion, AnimatePresence } from "framer-motion";

export const ProjectSelector = ({ 
  projects, 
  activeProjectId, 
  onSelectProject, 
  onNewProject,
  stats 
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  
  const activeProject = projects[activeProjectId];
  
  const filteredProjects = Object.entries(projects)
    .filter(([id, p]) => p.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => b[1].updatedAt.localeCompare(a[1].updatedAt));

  return (
    <div className="project-selector">
      <button 
        type="button" 
        className="project-trigger"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="project-trigger-info">
          <span className="project-trigger-icon">📁</span>
          <div className="project-trigger-text">
            <span className="project-trigger-label">Active Project</span>
            <span className="project-trigger-name">{activeProject?.name || "No Project Selected"}</span>
          </div>
        </div>
        <span className="project-trigger-arrow">{isOpen ? "▴" : "▾"}</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="project-dropdown-overlay" onClick={() => setIsOpen(false)} />
            <motion.div 
              className="project-dropdown"
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
            >
              <div className="project-dropdown-header">
                <input 
                  autoFocus
                  type="text" 
                  placeholder="Search projects..." 
                  className="project-search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <button 
                  className="project-new-btn"
                  onClick={() => {
                    onNewProject();
                    setIsOpen(false);
                  }}
                >
                  + New
                </button>
              </div>

              <div className="project-list-scroll">
                {filteredProjects.map(([id, p]) => (
                  <button
                    key={id}
                    className={`project-option ${id === activeProjectId ? "active" : ""}`}
                    onClick={() => {
                      onSelectProject(id);
                      setIsOpen(false);
                    }}
                  >
                    <div className="project-option-icon">✦</div>
                    <div className="project-option-meta">
                      <span className="project-option-name">{p.name}</span>
                      <span className="project-option-date">
                        Last updated {new Date(p.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                    {id === activeProjectId && <span className="project-option-check">✓</span>}
                  </button>
                ))}
                {filteredProjects.length === 0 && (
                  <div className="project-empty">No projects found</div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
