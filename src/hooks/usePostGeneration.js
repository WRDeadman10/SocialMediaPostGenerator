import React from "react";
import { slidesFor } from "../lib/slideHtml.js";

export const usePostGeneration = ({
  rows,
  config,
  setRows,
  setConfig,
  setGenerated,
  setEditing,
  setAnimateSeed,
  playSfx,
  showToast,
  hydrated,
  editing,
  setGenerateBusy,
  setGenProgress,
}) => {
  const lastGeneratedCountRef = React.useRef(0);

  const regenerateGenerated = React.useCallback((nextRows = rows, nextConfig = config) => {
    setGenerated((prev) => Object.fromEntries(Object.entries(prev).map(([idx, post]) => {
      const row = nextRows[idx] || post.rowData;
      return [idx, { ...post, rowData: row, slides: slidesFor(row, nextConfig) }];
    })));
  }, [config, rows, setGenerated]);

  React.useEffect(() => {
    const id = setTimeout(() => regenerateGenerated(rows, config), 130);
    return () => clearTimeout(id);
  }, [config, regenerateGenerated, rows]);

  const generateAll = React.useCallback(async () => {
    if (!rows.length) return;
    setGenerateBusy?.(true);
    setGenProgress?.({ current: 0, total: rows.length });
    try {
      const next = {};
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        next[i] = { type: (row.post_type || "single").toLowerCase().trim(), rowData: row, slides: slidesFor(row, config) };
        setGenerated({ ...next });
        setGenProgress?.({ current: i + 1, total: rows.length });
        await new Promise((r) => setTimeout(r, 0));
      }
      setAnimateSeed(Date.now());
      playSfx("generate");
      showToast?.({ message: `${rows.length} posts generated`, tone: "success" });
    } catch (e) {
      showToast?.({ message: e?.message || "Generation failed", tone: "error" });
    } finally {
      setGenerateBusy?.(false);
      setGenProgress?.({ current: 0, total: 0 });
    }
  }, [config, playSfx, rows, setAnimateSeed, setGenProgress, setGenerateBusy, setGenerated, showToast]);

  const applyEdit = React.useCallback((row, modalConfig = config, meta) => {
    if (editing == null) return;
    const nextRows = rows.map((r, i) => (i === editing.index ? row : r));
    setRows(nextRows);
    setConfig(modalConfig);
    setGenerated((prev) => ({
      ...prev,
      [editing.index]: { ...prev[editing.index], rowData: row, slides: slidesFor(row, modalConfig) },
    }));
    setEditing(null);
    setAnimateSeed(Date.now());
    playSfx("apply");
    return meta;
  }, [config, editing, playSfx, rows, setAnimateSeed, setConfig, setEditing, setGenerated, setRows]);

  const onGeneratedCountSfx = React.useCallback((generated) => {
    const count = Object.keys(generated).length;
    const prev = lastGeneratedCountRef.current;
    lastGeneratedCountRef.current = count;
    if (!hydrated) return;
    if (count && count !== prev) {
      setAnimateSeed(Date.now());
      playSfx("distribute");
    }
  }, [hydrated, playSfx, setAnimateSeed]);

  return { generateAll, applyEdit, onGeneratedCountSfx };
};
