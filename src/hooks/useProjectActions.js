import React from "react";
import * as XLSX from "xlsx";
import { defaultConfig } from "../lib/constants.js";
import { fnUrl } from "../lib/env.js";
import { applyProject } from "../lib/project.js";

export const useProjectActions = ({
  activeProjectId,
  projects,
  setProjects,
  setActiveProjectId,
  setAssetDefaults,
  setRows,
  setGenerated,
  setVisible,
  setConfig,
  setCreatingProject,
  setShowNewProjectModal,
  showToast,
  validateProjectAssets,
}) => {
  const createNewProject = React.useCallback(async (name) => {
    if (!name?.trim()) return;
    setCreatingProject(true);
    try {
      const res = await fetch(fnUrl("/createProject"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to create project");
      if (result.assetDefaults) setAssetDefaults(result.assetDefaults);
      setProjects((prev) => ({ ...prev, [result.project.id]: result.project }));
      setActiveProjectId(result.project.id);
      setRows([]);
      setGenerated({});
      setVisible({});
      setConfig(defaultConfig);
      showToast(`Project "${result.project.name}" created`);
      setShowNewProjectModal(false);
    } catch (e) {
      showToast(e.message);
    } finally {
      setCreatingProject(false);
    }
  }, [setActiveProjectId, setAssetDefaults, setConfig, setCreatingProject, setGenerated, setProjects, setRows, setShowNewProjectModal, setVisible, showToast]);

  const handleUpload = React.useCallback(async (file) => {
    if (!file) return;
    if (!activeProjectId) {
      showToast("Create a project first, then upload Excel");
      return;
    }
    const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet, { defval: "" }).map((row, i) => ({ ...row, _index: i }));
    setProjects((prev) => {
      const current = prev[activeProjectId];
      if (!current) return prev;
      return {
        ...prev,
        [activeProjectId]: {
          ...current,
          sourceFileName: file.name,
          rows: data,
          posts: {},
          visible: {},
          updatedAt: new Date().toISOString(),
        },
      };
    });
    setRows(data);
    setGenerated({});
    setVisible({});
    showToast(`Loaded ${data.length} rows from ${file.name}`);
  }, [activeProjectId, setGenerated, setProjects, setRows, setVisible, showToast]);

  const loadProject = React.useCallback((id) => {
    const project = projects[id];
    if (!project) return;
    setActiveProjectId(id);
    applyProject(project, { setConfig, setRows, setGenerated, setVisible });
    validateProjectAssets(project);
    showToast(`Loaded: ${project.name}`);
  }, [projects, setActiveProjectId, setConfig, setGenerated, setRows, setVisible, showToast, validateProjectAssets]);

  return { createNewProject, handleUpload, loadProject };
};
