import React from "react";
import { fnUrl } from "../lib/env.js";
import { applyProject, projectSnapshot } from "../lib/project.js";

export const useProjectPersistence = ({
  config,
  rows,
  generated,
  visible,
  projects,
  setProjects,
  activeProjectId,
  setActiveProjectId,
  setAssetDefaults,
  hydrated,
  setHydrated,
  setConfig,
  setRows,
  setGenerated,
  setVisible,
  validateProjectAssets,
  showToast,
}) => {
  React.useEffect(() => {
    fetch(fnUrl("/getProjects"))
      .then((r) => r.json())
      .then((data) => {
        if (!data?.projects) { setHydrated(true); return; }
        const restored = data.projects;
        if (data.assetDefaults) setAssetDefaults(data.assetDefaults);
        const savedActive = localStorage.getItem("activeProjectId") || "";
        const active = (savedActive && restored[savedActive]) ? savedActive : Object.keys(restored)[0] || "";
        setProjects(restored);
        setActiveProjectId(active);
        if (active) {
          applyProject(restored[active], { setConfig, setRows, setGenerated, setVisible });
          validateProjectAssets(restored[active]);
          showToast(`Loaded: ${restored[active].name}`);
        }
        setHydrated(true);
      })
      .catch(() => setHydrated(true));
  // eslint-disable-next-line react-hooks/exhaustive-deps -- load once on mount
  }, []);

  React.useEffect(() => {
    if (!hydrated || !activeProjectId) return;
    setProjects((prev) => {
      const current = prev[activeProjectId];
      if (!current) return prev;
      return { ...prev, [activeProjectId]: projectSnapshot(current, config, rows, generated, visible) };
    });
  }, [activeProjectId, config, generated, hydrated, rows, setProjects, visible]);

  React.useEffect(() => {
    if (!hydrated || !activeProjectId) return;
    const id = setTimeout(() => {
      const project = projects[activeProjectId];
      if (!project) return;
      fetch(fnUrl("/saveProject"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: activeProjectId, project }),
      }).catch(() => {});
    }, 250);
    return () => clearTimeout(id);
  }, [activeProjectId, hydrated, projects]);

  React.useEffect(() => {
    if (activeProjectId) localStorage.setItem("activeProjectId", activeProjectId);
  }, [activeProjectId]);
};
