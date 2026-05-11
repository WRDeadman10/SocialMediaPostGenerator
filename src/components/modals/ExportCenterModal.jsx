import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import JSZip from "jszip";
import { jsPDF } from "jspdf";
import { Preview } from "../Preview.jsx";
import { motionTransition, MotionDurations, MotionEasing } from "../../motion/tokens.js";
import { popVariants } from "../../motion/variants.js";
import { downloadBlob } from "../../lib/files.js";

const KB = 1024;
const MB = KB * 1024;

const nowDateStamp = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const safeFilePart = (value) => String(value || "export")
  .trim()
  .replace(/[<>:"/\\|?*]+/g, "-")
  .replace(/\s+/g, "_")
  .slice(0, 90) || "export";

const titleForPost = (post) => (post?.rowData?.title || post?.rowData?.slide1_title || "Untitled");

const resolveScale = (resolution) => {
  if (resolution === "4k") return 4;
  if (resolution === "2k") return 3;
  return 2; // 1080p-ish (base 800x1000 * 2)
};

const templateName = (tpl, vars) => {
  const raw = String(tpl || "social_post_{index}_{date}");
  return raw
    .replaceAll("{index}", String(vars.index ?? ""))
    .replaceAll("{slide}", String(vars.slide ?? ""))
    .replaceAll("{date}", String(vars.date ?? ""))
    .replaceAll("{title}", String(vars.title ?? ""))
    .replaceAll("{type}", String(vars.type ?? ""))
    .replaceAll("{project}", String(vars.project ?? ""));
};

const defaultPreset = () => ({
  name: "Instagram Package",
  scope: "selected_outputs",
  formats: { png: true, jpg: false, pdf: false, svg: false },
  modes: { individualSlides: true, combinedPdf: false, zipPackage: true },
  resolution: "1080p",
  options: { transparentBg: true, includeMetadata: true, includePrompts: false, includeBranding: false },
  namingTemplate: "social_post_{index}_{date}",
  destination: "download",
});

const PRESETS_KEY = "smpg:exportPresets:v1";
const HISTORY_KEY = "smpg:exportHistory:v1";

const readJson = (key, fallback) => {
  try {
    const raw = window.localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
};

const writeJson = (key, value) => {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
};

const isTauri = () => typeof window !== "undefined" && !!window.__TAURI__;

export const ExportCenterModal = ({
  isOpen,
  onClose,
  projectName = "",
  generated = {},
  activePostIndex = null,
  activeSlideIndex = 0,
  renderCanvas,
}) => {
  const entries = React.useMemo(() => (
    Object.entries(generated).sort((a, b) => Number(a[0]) - Number(b[0]))
  ), [generated]);

  const [selectedOutputIds, setSelectedOutputIds] = React.useState(() => new Set());
  const [scope, setScope] = React.useState("selected_outputs"); // all_outputs | selected_outputs | current_output | current_slide
  const [formats, setFormats] = React.useState({ png: true, jpg: false, pdf: false, svg: false });
  const [modes, setModes] = React.useState({ individualSlides: true, combinedPdf: false, zipPackage: true });
  const [resolution, setResolution] = React.useState("1080p"); // 1080p | 2k | 4k
  const [options, setOptions] = React.useState({ transparentBg: true, includeMetadata: true, includePrompts: false, includeBranding: false });
  const [namingTemplate, setNamingTemplate] = React.useState("social_post_{index}_{date}");
  const [destination, setDestination] = React.useState("download"); // download | cloud

  const [queue, setQueue] = React.useState([]);
  const [isRunning, setIsRunning] = React.useState(false);
  const [activeJobId, setActiveJobId] = React.useState("");
  const abortByJobRef = React.useRef(new Map());

  const [presets, setPresets] = React.useState(() => readJson(PRESETS_KEY, [defaultPreset()]));
  const [history, setHistory] = React.useState(() => readJson(HISTORY_KEY, []));
  const [activePresetName, setActivePresetName] = React.useState("Instagram Package");
  const [presetDraftName, setPresetDraftName] = React.useState("");
  const [showAdvanced, setShowAdvanced] = React.useState(false);
  const [advanced, setAdvanced] = React.useState({
    jpgQuality: 0.92,
    paddingPx: 0,
    watermarkText: "",
    watermarkOpacity: 0.12,
  });

  const titleId = React.useId();
  const closeRef = React.useRef(null);

  React.useEffect(() => {
    if (!isOpen) return;
    closeRef.current?.focus?.();
    // Default select all when opening if nothing is selected.
    setSelectedOutputIds((prev) => {
      if (prev.size) return prev;
      const next = new Set();
      for (const [idx] of entries) next.add(String(idx));
      return next;
    });
  }, [entries, isOpen]);

  React.useEffect(() => {
    writeJson(PRESETS_KEY, presets);
  }, [presets]);

  React.useEffect(() => {
    writeJson(HISTORY_KEY, history.slice(0, 20));
  }, [history]);

  React.useEffect(() => {
    // Apply active preset when opening or when preset changes.
    if (!isOpen) return;
    const preset = presets.find((p) => p.name === activePresetName) || presets[0];
    if (!preset) return;
    applyPreset(preset);
  }, [activePresetName, isOpen, presets]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleToggleAll = (checked) => {
    setSelectedOutputIds(() => {
      if (!checked) return new Set();
      const next = new Set();
      for (const [idx] of entries) next.add(String(idx));
      return next;
    });
  };

  const handleToggleOutput = (idx) => {
    setSelectedOutputIds((prev) => {
      const next = new Set(prev);
      const key = String(idx);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selectedCount = selectedOutputIds.size;

  const currentPost = activePostIndex == null ? null : generated[String(activePostIndex)];
  const currentSlideHtml = currentPost?.slides?.[activeSlideIndex] || "";

  const selectedIndices = React.useMemo(() => {
    if (scope === "all_outputs") return entries.map(([idx]) => String(idx));
    if (scope === "selected_outputs") return Array.from(selectedOutputIds);
    if (scope === "current_output") return activePostIndex == null ? [] : [String(activePostIndex)];
    if (scope === "current_slide") return activePostIndex == null ? [] : [String(activePostIndex)];
    return [];
  }, [activePostIndex, entries, scope, selectedOutputIds]);

  const canStart = selectedIndices.length > 0 && Object.values(formats).some(Boolean) && Object.values(modes).some(Boolean) && !!renderCanvas;

  const addHistoryEntry = React.useCallback((entry) => {
    setHistory((prev) => ([{
      ...entry,
      at: Date.now(),
    }, ...prev].slice(0, 20)));
  }, []);

  const pickDirectoryIfTauri = React.useCallback(async () => {
    if (!isTauri()) return "";
    const { open } = await import("@tauri-apps/api/dialog");
    const dir = await open({ directory: true, multiple: false });
    return typeof dir === "string" ? dir : "";
  }, []);

  const writeFileIfTauri = React.useCallback(async (dir, fileName, blob) => {
    if (!isTauri()) return false;
    const { writeBinaryFile, createDir } = await import("@tauri-apps/api/fs");
    const { join } = await import("@tauri-apps/api/path");
    const bytes = new Uint8Array(await blob.arrayBuffer());
    await createDir(dir, { recursive: true });
    const fullPath = await join(dir, fileName);
    await writeBinaryFile({ path: fullPath, contents: bytes });
    return true;
  }, []);

  const exportSvgFromCanvas = React.useCallback(async (canvas) => {
    const pngDataUrl = canvas.toDataURL("image/png");
    const svg = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"800\" height=\"1000\" viewBox=\"0 0 800 1000\">\n  <image href=\"${pngDataUrl}\" width=\"800\" height=\"1000\" preserveAspectRatio=\"none\" />\n</svg>\n`;
    return new Blob([svg], { type: "image/svg+xml" });
  }, []);

  const blobFromCanvas = React.useCallback((canvas, fmt, qualityOverride) => new Promise((resolve) => {
    const format = fmt === "jpg" ? "image/jpeg" : "image/png";
    const q = fmt === "jpg" ? (typeof qualityOverride === "number" ? qualityOverride : 0.92) : undefined;
    canvas.toBlob((blob) => resolve(blob), format, q);
  }), []);

  const buildExportHtml = React.useCallback((rawHtml) => {
    const pad = Math.max(0, Math.min(120, Number(advanced.paddingPx) || 0));
    const watermark = String(advanced.watermarkText || "").trim();
    const wmOpacity = Math.max(0, Math.min(0.4, Number(advanced.watermarkOpacity) || 0.12));
    if (!pad && !watermark) return rawHtml;

    const scale = pad ? (800 - pad * 2) / 800 : 1;
    const translate = pad ? `translate(${pad}px, ${pad}px) scale(${scale})` : "none";
    const wm = watermark
      ? `<div style="position:absolute;inset:0;display:grid;place-items:center;pointer-events:none;opacity:${wmOpacity};transform:rotate(-18deg);font-family:DM Sans,system-ui;letter-spacing:6px;font-weight:900;font-size:54px;color:#ffffff;mix-blend-mode:overlay;z-index:5;text-transform:uppercase">${watermark.replaceAll("<", "&lt;").replaceAll(">", "&gt;")}</div>`
      : "";

    return `
      <div style="width:800px;height:1000px;position:relative;overflow:hidden">
        <div style="width:800px;height:1000px;transform-origin:0 0;transform:${translate};position:absolute;left:0;top:0">
          ${rawHtml}
        </div>
        ${wm}
      </div>
    `;
  }, [advanced.paddingPx, advanced.watermarkOpacity, advanced.watermarkText]);

  const estimateBytes = React.useCallback((slideCount) => {
    const scale = resolveScale(resolution);
    const pxFactor = (scale * scale);
    const perSlidePng = 900 * KB * pxFactor; // heuristic
    const perSlideJpg = 350 * KB * pxFactor;
    const perSlideSvg = 80 * KB;
    const pdfOverhead = formats.pdf ? (200 * KB + slideCount * 180 * KB * pxFactor) : 0;
    const slides = Math.max(1, slideCount);
    const images = (formats.png ? perSlidePng : 0) + (formats.jpg ? perSlideJpg : 0) + (formats.svg ? perSlideSvg : 0);
    const total = slides * images + pdfOverhead + (options.includeMetadata || options.includePrompts ? 60 * KB : 0);
    return total;
  }, [formats.jpg, formats.pdf, formats.png, formats.svg, options.includeMetadata, options.includePrompts, resolution]);

  const estimateTimeSeconds = React.useCallback((slideCount) => {
    const scale = resolveScale(resolution);
    const perSlide = scale >= 4 ? 1.6 : scale >= 3 ? 1.0 : 0.7; // heuristic seconds per slide
    return Math.max(1, Math.round(perSlide * Math.max(1, slideCount)));
  }, [resolution]);

  const createJobs = React.useCallback(() => {
    const date = nowDateStamp();
    const jobs = [];
    for (const idx of selectedIndices) {
      const post = generated[idx];
      if (!post) continue;
      const slides = post.slides || [];
      const slideTargets = scope === "current_slide"
        ? [Math.max(0, Math.min(slides.length - 1, Number(activeSlideIndex) || 0))]
        : slides.map((_, i) => i);

      jobs.push({
        id: `${Date.now()}_${idx}_${Math.random().toString(16).slice(2)}`,
        outputIndex: Number(idx),
        title: titleForPost(post),
        type: String(post.type || "single"),
        slideIndices: slideTargets,
        status: "waiting", // waiting | rendering | packaging | completed | failed | cancelled
        progress: 0,
        etaSeconds: null,
        message: "",
        error: "",
        startedAt: 0,
        completedAt: 0,
        date,
      });
    }
    return jobs;
  }, [activeSlideIndex, generated, scope, selectedIndices]);

  const cancelJob = React.useCallback((jobId) => {
    abortByJobRef.current.get(jobId)?.abort?.();
    setQueue((prev) => prev.map((j) => (j.id === jobId ? { ...j, status: j.status === "completed" ? j.status : "cancelled", message: "Cancelled" } : j)));
  }, []);

  const retryJob = React.useCallback((jobId) => {
    setQueue((prev) => prev.map((j) => (j.id === jobId ? { ...j, status: "waiting", progress: 0, error: "", message: "" } : j)));
  }, []);

  const runQueue = React.useCallback(async () => {
    if (isRunning) return;
    setIsRunning(true);
    let outputDir = "";

    try {
      if (destination === "cloud") {
        outputDir = await pickDirectoryIfTauri();
        if (!outputDir) throw new Error("Choose a destination folder");
      }

      const scale = resolveScale(resolution);
      const date = nowDateStamp();

      const jobs = createJobs();
      setQueue(jobs);

      for (const job of jobs) {
        // eslint-disable-next-line no-await-in-loop
        const shouldSkip = (() => {
          const latest = queue.find((q) => q.id === job.id);
          return latest?.status === "cancelled";
        })();
        if (shouldSkip) continue;

        const controller = new AbortController();
        abortByJobRef.current.set(job.id, controller);
        setActiveJobId(job.id);
        const startedAt = Date.now();

        setQueue((prev) => prev.map((j) => (j.id === job.id ? { ...j, status: "rendering", startedAt } : j)));

        const post = generated[String(job.outputIndex)];
        const slides = post?.slides || [];

        const baseName = safeFilePart(templateName(namingTemplate, {
          index: job.outputIndex + 1,
          slide: "",
          date,
          title: safeFilePart(job.title),
          type: job.type,
          project: safeFilePart(projectName),
        }));

        const files = [];
        const slideCount = Math.max(1, job.slideIndices.length);

        // Render slides
        for (let s = 0; s < job.slideIndices.length; s++) {
          if (controller.signal.aborted) throw new Error("Cancelled");
          const slideIdx = job.slideIndices[s];
          const html = buildExportHtml(slides[slideIdx]);
          // eslint-disable-next-line no-await-in-loop
          const canvas = await renderCanvas(html, { scale, transparent: options.transparentBg });

          const suffix = slideCount > 1 ? `_slide${slideIdx + 1}` : "";
          const stem = `${baseName}${suffix}`;

          if (formats.png) {
            // eslint-disable-next-line no-await-in-loop
            const blob = await blobFromCanvas(canvas, "png");
            files.push({ name: `${stem}.png`, blob, kind: "png" });
          }
          if (formats.jpg) {
            // eslint-disable-next-line no-await-in-loop
            const blob = await blobFromCanvas(canvas, "jpg", advanced.jpgQuality);
            files.push({ name: `${stem}.jpg`, blob, kind: "jpg" });
          }
          if (formats.svg) {
            // eslint-disable-next-line no-await-in-loop
            const blob = await exportSvgFromCanvas(canvas);
            files.push({ name: `${stem}.svg`, blob, kind: "svg" });
          }

          const progress = Math.round(((s + 1) / slideCount) * 75);
          setQueue((prev) => prev.map((j) => (j.id === job.id ? { ...j, progress, message: `Rendered ${s + 1}/${slideCount}` } : j)));
          // eslint-disable-next-line no-await-in-loop
          await new Promise((r) => setTimeout(r, 0));
        }

        // Combined PDF per output
        if (formats.pdf && (modes.combinedPdf || modes.individualSlides)) {
          setQueue((prev) => prev.map((j) => (j.id === job.id ? { ...j, status: "packaging", progress: 82, message: "Building PDF…" } : j)));
          const pdf = new jsPDF({ unit: "pt", format: [800, 1000] });
          let first = true;
          for (const slideIdx of job.slideIndices) {
            if (controller.signal.aborted) throw new Error("Cancelled");
            const html = buildExportHtml(slides[slideIdx]);
            // eslint-disable-next-line no-await-in-loop
            const canvas = await renderCanvas(html, { scale, transparent: options.transparentBg });
            const imgData = canvas.toDataURL("image/png");
            if (!first) pdf.addPage([800, 1000], "portrait");
            first = false;
            pdf.addImage(imgData, "PNG", 0, 0, 800, 1000);
          }
          const pdfBlob = pdf.output("blob");
          files.push({ name: `${baseName}.pdf`, blob: pdfBlob, kind: "pdf" });
        }

        // Metadata
        if (options.includeMetadata || options.includePrompts) {
          const meta = {
            project: projectName,
            index: job.outputIndex + 1,
            title: job.title,
            type: job.type,
            slides: job.slideIndices.map((i) => i + 1),
            exportedAt: new Date().toISOString(),
            ...(options.includePrompts ? { prompts: post?.rowData || {} } : {}),
          };
          files.push({ name: `${baseName}_meta.json`, blob: new Blob([JSON.stringify(meta, null, 2)], { type: "application/json" }), kind: "json" });
        }

        // Package / destination
        setQueue((prev) => prev.map((j) => (j.id === job.id ? { ...j, status: "packaging", progress: 90, message: destination === "cloud" ? "Saving files…" : "Preparing downloads…" } : j)));

        if (destination === "cloud") {
          for (const f of files) {
            if (controller.signal.aborted) throw new Error("Cancelled");
            // eslint-disable-next-line no-await-in-loop
            await writeFileIfTauri(outputDir, f.name, f.blob);
          }
        } else if (modes.zipPackage) {
          const zip = new JSZip();
          for (const f of files) {
            // eslint-disable-next-line no-await-in-loop
            zip.file(f.name, await f.blob.arrayBuffer());
          }
          const zipBlob = await zip.generateAsync({ type: "blob" });
          downloadBlob(zipBlob, `${baseName}.zip`);
        } else {
          for (const f of files) downloadBlob(f.blob, f.name);
        }

        const completedAt = Date.now();
        setQueue((prev) => prev.map((j) => (j.id === job.id ? { ...j, status: "completed", progress: 100, message: "Completed", completedAt } : j)));
        addHistoryEntry({ outputIndex: job.outputIndex, title: job.title, fileBase: baseName, destination, formats, modes, resolution });
      }
    } catch (e) {
      const msg = String(e?.message || e || "Export failed");
      if (activeJobId) {
        setQueue((prev) => prev.map((j) => (j.id === activeJobId ? { ...j, status: msg === "Cancelled" ? "cancelled" : "failed", error: msg, message: msg } : j)));
      }
    } finally {
      setActiveJobId("");
      setIsRunning(false);
      abortByJobRef.current.clear();
    }
  }, [activeJobId, addHistoryEntry, blobFromCanvas, createJobs, destination, exportSvgFromCanvas, formats, isRunning, modes, namingTemplate, options.includeMetadata, options.includePrompts, options.transparentBg, pickDirectoryIfTauri, projectName, queue, renderCanvas, resolution, writeFileIfTauri]);

  const handleStart = () => {
    if (!canStart) return;
    runQueue();
  };

  const handleStopAll = () => {
    for (const [jobId, controller] of abortByJobRef.current.entries()) controller.abort?.();
    setQueue((prev) => prev.map((j) => (["waiting", "rendering", "packaging"].includes(j.status) ? { ...j, status: "cancelled", message: "Cancelled" } : j)));
    setIsRunning(false);
    setActiveJobId("");
  };

  const applyPreset = (preset) => {
    if (!preset) return;
    setScope(preset.scope || "selected_outputs");
    setFormats(preset.formats || { png: true });
    setModes(preset.modes || { individualSlides: true, zipPackage: true });
    setResolution(preset.resolution || "1080p");
    setOptions(preset.options || { transparentBg: true, includeMetadata: true });
    setNamingTemplate(preset.namingTemplate || "social_post_{index}_{date}");
    setDestination(preset.destination || "download");
  };

  const savePreset = () => {
    const name = safeFilePart(presetDraftName).replaceAll("_", " ").trim();
    if (!name) return;
    const payload = {
      name,
      scope,
      formats,
      modes,
      resolution,
      options,
      namingTemplate,
      destination,
    };
    const next = [payload, ...presets.filter((p) => p.name !== name)].slice(0, 12);
    setPresets(next);
    setActivePresetName(name);
    setPresetDraftName("");
  };

  const deletePreset = () => {
    if (!activePresetName) return;
    if (activePresetName === presets[0]?.name) return;
    setPresets((prev) => prev.filter((p) => p.name !== activePresetName));
    setActivePresetName(presets[0]?.name || "");
  };

  const handleOverlayKeyDown = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      if (isRunning) return;
      onClose?.();
    }
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleStart();
    }
  };

  if (!isOpen) return null;

  const selectedPosts = selectedIndices.map((idx) => generated[idx]).filter(Boolean);
  const totalSlides = selectedPosts.reduce((acc, post) => acc + (post?.slides?.length || 1), 0);
  const estimatedBytes = selectedPosts.reduce((acc, post) => acc + estimateBytes(post?.slides?.length || 1), 0);
  const estimatedSeconds = selectedPosts.reduce((acc, post) => acc + estimateTimeSeconds(post?.slides?.length || 1), 0);
  const estimatedText = estimatedBytes > 800 * MB ? `${(estimatedBytes / (1024 * MB)).toFixed(2)} GB` : `${Math.max(1, Math.round(estimatedBytes / MB))} MB`;

  return (
    <div className="export-overlay" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && !isRunning && onClose?.()} onKeyDown={handleOverlayKeyDown}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          className="export-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          variants={popVariants}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          <header className="export-head">
            <div className="export-head-left">
              <div className="export-title-row">
                <div className="export-icon">⭳</div>
                <div>
                  <div className="export-title" id={titleId}>Export Project</div>
                  <div className="export-sub">Export branded social media outputs</div>
                </div>
              </div>
              <div className="export-head-controls" aria-label="Export header controls">
                <label className="export-control">
                  <span className="export-control-label">Export preset</span>
                  <select
                    className="export-control-select"
                    value={activePresetName}
                    onChange={(e) => setActivePresetName(e.target.value)}
                    aria-label="Export preset selector"
                  >
                    {presets.map((p) => <option key={p.name} value={p.name}>{p.name}</option>)}
                    <option value="Custom Preset">Custom Preset</option>
                  </select>
                </label>
                <label className="export-control">
                  <span className="export-control-label">Preset name</span>
                  <input
                    className="export-control-input"
                    value={presetDraftName}
                    placeholder="Save preset…"
                    onChange={(e) => setPresetDraftName(e.target.value)}
                  />
                </label>
                <button type="button" className="export-head-btn" onClick={savePreset} disabled={!presetDraftName.trim()}>
                  Save preset
                </button>
                <button type="button" className="export-head-btn subtle" onClick={deletePreset} disabled={!activePresetName || activePresetName === presets[0]?.name}>
                  Delete
                </button>
                <label className="export-head-selectall">
                  <input type="checkbox" checked={selectedCount === entries.length && entries.length > 0} onChange={(e) => handleToggleAll(e.target.checked)} />
                  <span>Select all</span>
                </label>
              </div>
            </div>
            <div className="export-head-right">
              <button ref={closeRef} type="button" className="export-close" onClick={() => !isRunning && onClose?.()} aria-label="Close export center">×</button>
            </div>
          </header>

          <div className="export-body">
            <section className="export-left" aria-label="Output selection">
              <div className="export-section-title">
                <span>Outputs</span>
                <span className="export-section-meta">{selectedCount} selected</span>
              </div>
              <div className="export-output-list" role="listbox" aria-label="Outputs list">
                {entries.map(([idx, post]) => {
                  const checked = selectedOutputIds.has(String(idx));
                  const slide0 = post?.slides?.[0] || "";
                  const slidesN = post?.slides?.length || 1;
                  const est = estimateBytes(slidesN);
                  const estText = est > 800 * MB ? `${(est / (1024 * MB)).toFixed(2)} GB` : `${Math.max(1, Math.round(est / MB))} MB`;
                  return (
                    <button
                      key={idx}
                      type="button"
                      className={`export-output ${checked ? "active" : ""}`}
                      onClick={() => handleToggleOutput(idx)}
                      role="option"
                      aria-selected={checked}
                    >
                      <div className="export-output-thumb" aria-hidden="true">
                        <div className="export-thumb-inner" dangerouslySetInnerHTML={{ __html: slide0 }} />
                      </div>
                      <div className="export-output-meta">
                        <div className="export-output-title">{titleForPost(post)}</div>
                        <div className="export-output-sub">
                          <span className="pill">{post.type?.toUpperCase?.() || "POST"}</span>
                          <span className="pill">{slidesN} slides</span>
                          <span className="pill ok">Generated</span>
                          <span className="pill">{estText}</span>
                        </div>
                      </div>
                      <div className="export-output-check" aria-hidden="true">
                        <div className={`export-check ${checked ? "on" : ""}`} />
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="export-left-foot">
                <div className="export-hint">Tip: Ctrl/Cmd+Enter to start export · Esc to close</div>
              </div>
            </section>

            <section className="export-right" aria-label="Export settings">
              <div className="export-settings-grid">
                <div className="export-card">
                  <div className="export-card-title"><span>Scope</span><span className="export-card-icon">◎</span></div>
                  <div className="export-card-grid2">
                    {[
                      ["all_outputs", "All outputs"],
                      ["selected_outputs", "Selected outputs"],
                      ["current_output", "Current output"],
                      ["current_slide", "Current slide"],
                    ].map(([id, label]) => (
                      <button
                        key={id}
                        type="button"
                        className={`export-choice ${scope === id ? "active" : ""}`}
                        onClick={() => setScope(id)}
                        aria-pressed={scope === id}
                      >
                        <div className="export-choice-title">{label}</div>
                        <div className="export-choice-sub">{id === "all_outputs" ? "Everything generated" : id === "selected_outputs" ? "Use the selection list" : id === "current_output" ? "The post open on canvas" : "Only the active slide"}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="export-card">
                  <div className="export-card-title"><span>Formats</span><span className="export-card-icon">▦</span></div>
                  <div className="export-format-grid">
                    {[
                      ["pdf", "PDF", "Multi-page document", "Best for review/sharing"],
                      ["png", "PNG", "High quality images", "Best for social upload"],
                      ["jpg", "JPG", "Compressed images", "Smaller file size"],
                      ["svg", "SVG", "Vector wrapper", "Embed PNG in SVG"],
                    ].map(([k, label, line1, line2]) => (
                      <button
                        key={k}
                        type="button"
                        className={`export-format ${formats[k] ? "active" : ""}`}
                        onClick={() => setFormats((prev) => ({ ...prev, [k]: !prev[k] }))}
                        aria-pressed={!!formats[k]}
                      >
                        <div className="export-format-top">
                          <div className="export-format-name">{label}</div>
                          <div className={`export-format-dot ${formats[k] ? "on" : ""}`} aria-hidden="true" />
                        </div>
                        <div className="export-format-sub">{line1}</div>
                        <div className="export-format-sub2">{line2}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="export-card">
                  <div className="export-card-title"><span>Mode</span><span className="export-card-icon">⧉</span></div>
                  <div className="export-toggle-grid">
                    {[
                      ["individualSlides", "Individual slides", "Export each slide as a file"],
                      ["combinedPdf", "Combined PDF", "One PDF per output"],
                      ["zipPackage", "ZIP package", "Bundle files into a ZIP"],
                    ].map(([k, t, sub]) => (
                      <button
                        key={k}
                        type="button"
                        className={`export-toggle ${modes[k] ? "active" : ""}`}
                        onClick={() => setModes((p) => ({ ...p, [k]: !p[k] }))}
                        aria-pressed={!!modes[k]}
                      >
                        <div className="export-toggle-title">{t}</div>
                        <div className="export-toggle-sub">{sub}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="export-card">
                  <div className="export-card-title"><span>Resolution</span><span className="export-card-icon">⬚</span></div>
                  <div className="export-seg">
                    {[
                      ["1080p", "1080p"],
                      ["2k", "2K"],
                      ["4k", "4K"],
                    ].map(([id, label]) => (
                      <button key={id} type="button" className={`export-seg-btn ${resolution === id ? "active" : ""}`} onClick={() => setResolution(id)} aria-pressed={resolution === id}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="export-card">
                  <div className="export-card-title"><span>Options</span><span className="export-card-icon">☰</span></div>
                  <div className="export-chip-row">
                    {[
                      ["transparentBg", "Transparent BG"],
                      ["includeMetadata", "Metadata"],
                      ["includePrompts", "Prompts"],
                      ["includeBranding", "Branding assets"],
                    ].map(([k, label]) => (
                      <button
                        key={k}
                        type="button"
                        className={`export-chip ${options[k] ? "active" : ""}`}
                        onClick={() => setOptions((p) => ({ ...p, [k]: !p[k] }))}
                        aria-pressed={!!options[k]}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="export-card">
                  <div className="export-card-title"><span>File naming</span><span className="export-card-icon">✎</span></div>
                  <div className="export-naming">
                    <input className="export-input" value={namingTemplate} onChange={(e) => setNamingTemplate(e.target.value)} aria-label="File naming template" />
                    <div className="export-naming-hint">
                      Vars: <code>{"{index}"}</code> <code>{"{slide}"}</code> <code>{"{date}"}</code> <code>{"{title}"}</code> <code>{"{type}"}</code> <code>{"{project}"}</code>
                    </div>
                  </div>
                </div>

                <div className="export-card">
                  <div className="export-card-title"><span>Destination</span><span className="export-card-icon">⬇</span></div>
                  <div className="export-dest">
                    <button type="button" className={`export-dest-btn ${destination === "download" ? "active" : ""}`} onClick={() => setDestination("download")}>
                      Download
                    </button>
                    <button type="button" className={`export-dest-btn ${destination === "cloud" ? "active" : ""}`} onClick={() => setDestination("cloud")} disabled={!isTauri()}>
                      Save to folder
                    </button>
                  </div>
                  {!isTauri() ? <div className="export-hint">“Save to folder” is available in the desktop app (Tauri).</div> : null}
                </div>

                <div className="export-card">
                  <button type="button" className="export-advanced-toggle" onClick={() => setShowAdvanced((v) => !v)} aria-expanded={showAdvanced}>
                    <span>Advanced settings</span>
                    <span className="export-advanced-caret" aria-hidden="true">{showAdvanced ? "▾" : "▸"}</span>
                  </button>
                  {showAdvanced ? (
                    <div className="export-advanced">
                      <label className="export-adv-row">
                        <span>JPG quality</span>
                        <input
                          type="range"
                          min="0.6"
                          max="0.98"
                          step="0.02"
                          value={advanced.jpgQuality}
                          onChange={(e) => setAdvanced((p) => ({ ...p, jpgQuality: Number(e.target.value) }))}
                        />
                        <b>{Math.round(advanced.jpgQuality * 100)}%</b>
                      </label>
                      <label className="export-adv-row">
                        <span>Export padding</span>
                        <input
                          type="range"
                          min="0"
                          max="80"
                          step="4"
                          value={advanced.paddingPx}
                          onChange={(e) => setAdvanced((p) => ({ ...p, paddingPx: Number(e.target.value) }))}
                        />
                        <b>{advanced.paddingPx}px</b>
                      </label>
                      <label className="export-adv-col">
                        <span>Watermark</span>
                        <input className="export-input" value={advanced.watermarkText} placeholder="Optional watermark text" onChange={(e) => setAdvanced((p) => ({ ...p, watermarkText: e.target.value }))} />
                      </label>
                      <label className="export-adv-row">
                        <span>Watermark opacity</span>
                        <input
                          type="range"
                          min="0.05"
                          max="0.35"
                          step="0.02"
                          value={advanced.watermarkOpacity}
                          onChange={(e) => setAdvanced((p) => ({ ...p, watermarkOpacity: Number(e.target.value) }))}
                        />
                        <b>{Math.round(advanced.watermarkOpacity * 100)}%</b>
                      </label>
                    </div>
                  ) : null}
                </div>
              </div>
            </section>
          </div>

          <div className="export-queue">
            <div className="export-queue-list" aria-label="Export queue list">
              {queue.length ? queue.map((job) => (
                <div key={job.id} className={`export-job ${job.status}`}>
                  <div className="export-job-main">
                    <div className="export-job-title">{job.title}</div>
                    <div className="export-job-sub">
                      #{job.outputIndex + 1} · {job.type} · {job.slideIndices.length} slides
                      <span className="export-dot" />
                      <span className={`export-state ${job.status}`}>{job.status}</span>
                      {job.message ? <><span className="export-dot" /><span className="export-job-msg">{job.message}</span></> : null}
                    </div>
                  </div>
                  <div className="export-job-right">
                    <div className="export-job-pct">{job.progress}%</div>
                    <div className="export-job-controls">
                      {job.status === "failed" ? (
                        <button type="button" className="export-mini-btn" onClick={() => retryJob(job.id)}>Retry</button>
                      ) : null}
                      {["waiting", "rendering", "packaging"].includes(job.status) ? (
                        <button type="button" className="export-mini-btn" onClick={() => cancelJob(job.id)}>Cancel</button>
                      ) : null}
                    </div>
                  </div>
                  <div className="export-job-bar">
                    <motion.div
                      className="export-job-bar-fill"
                      initial={false}
                      animate={{ scaleX: Math.max(0, Math.min(1, job.progress / 100)) }}
                      style={{ transformOrigin: "0 50%" }}
                      transition={motionTransition(MotionDurations.standard, MotionEasing.emphasized)}
                    />
                  </div>
                  {job.error ? <div className="export-job-error">{job.error}</div> : null}
                </div>
              )) : (
                <div className="export-empty">
                  <div className="export-empty-hero">⭳</div>
                  <div className="export-empty-title">Ready to export</div>
                  <div className="export-empty-sub">Select outputs on the left, pick formats, then start export. Your queue will appear here.</div>
                  {history.length ? (
                    <div className="export-empty-recents">
                      <div className="export-history-title">Recent exports</div>
                      <div className="export-history-list">
                        {history.slice(0, 3).map((h) => (
                          <div key={String(h.at)} className="export-history-row">
                            <div className="export-history-main">
                              <div className="export-history-name">{h.title}</div>
                              <div className="export-history-sub">{new Date(h.at).toLocaleString()} · {h.destination}</div>
                            </div>
                            <button type="button" className="export-mini-btn" onClick={() => applyPreset({
                              name: "Re-export",
                              scope: "current_output",
                              formats: h.formats,
                              modes: h.modes,
                              resolution: h.resolution,
                              options,
                              namingTemplate,
                              destination: h.destination,
                            })}>
                              Load
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>

          <footer className="export-foot" aria-label="Export actions">
            <div className="export-summary">
              <div className="export-summary-item">
                <span className="k">Estimated size</span>
                <b className="v">{estimatedText}</b>
              </div>
              <div className="export-summary-item">
                <span className="k">Selected</span>
                <b className="v">{selectedIndices.length} outputs · {totalSlides} slides</b>
              </div>
              <div className="export-summary-item">
                <span className="k">Estimated time</span>
                <b className="v">~{Math.max(1, Math.round(estimatedSeconds / 60))} min</b>
              </div>
            </div>
            <div className="export-foot-actions">
              <button type="button" className="export-ghost" onClick={handleStopAll} disabled={!isRunning}>Cancel</button>
              <button type="button" className="export-primary" onClick={handleStart} disabled={!canStart || isRunning}>
                {isRunning ? "Exporting…" : "Start Export"}
              </button>
            </div>
          </footer>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

