import React from "react";
import { useFocusTrap } from "../../hooks/useFocusTrap.js";
import { generateImage } from "../../lib/cliService.js";
import { dataUrlToFile } from "../../lib/files.js";
import { comfyService } from "../../lib/comfyService.js";
import { convertFileSrc } from "@tauri-apps/api/tauri";
import { readBinaryFile } from "@tauri-apps/api/fs";

const projectNameFromId = (projects, projectId) => projects?.[projectId]?.name || projectId || "";

const listThumbUrl = (asset) => asset.thumbUrl || asset.url;

const RECENTS_KEY = "smpg:recentAssets:v1";

const readRecents = () => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENTS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeRecents = (next) => {
  try {
    window.localStorage.setItem(RECENTS_KEY, JSON.stringify(next.slice(0, 24)));
  } catch {
    // ignore
  }
};

const pushRecent = (kind, asset) => {
  if (typeof window === "undefined") return;
  if (!kind || !asset?.url) return;
  const prev = readRecents();
  const entry = {
    kind: String(kind),
    url: String(asset.url),
    thumbUrl: asset.thumbUrl ? String(asset.thumbUrl) : "",
    fileName: String(asset.fileName || ""),
    projectId: asset.projectId ? String(asset.projectId) : "",
    id: asset.id ? String(asset.id) : "",
    at: Date.now(),
  };
  const filtered = prev.filter((x) => !(x.kind === entry.kind && x.url === entry.url));
  writeRecents([entry, ...filtered]);
};

export const AssetPickerModal = ({
  title,
  pickerKind,
  projects,
  activeProjectId,
  assets,
  loadingList,
  loadingUpload,
  busyAssetId,
  uploadInputRef,
  defaultPreviewUrl,
  page,
  pageSize,
  total,
  hasMore,
  hasPrev,
  onPageChange,
  onPrefetchNext,
  search,
  onSearchChange,
  projectOnly,
  onProjectOnlyChange,
  onClose,
  onPick,
  onUploadClick,
  onUploadFile,
  onSetDefault,
  cliStatus,
  initialPrompt,
}) => {
  const [activeTab, setActiveTab] = React.useState("generate");
  const [hoverHighUrl, setHoverHighUrl] = React.useState("");
  const [navIndex, setNavIndex] = React.useState(0);
  const [prompt, setPrompt] = React.useState(initialPrompt || "");
  const [selectedCli, setSelectedCli] = React.useState("");
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [generatedImages, setGeneratedImages] = React.useState([]);
  const [selectedImageIndex, setSelectedImageIndex] = React.useState(0);
  const [generationError, setGenerationError] = React.useState(null);

  // ComfyUI State
  const [comfyConfig, setComfyConfig] = React.useState(comfyService.getConnection());
  const [comfyForm, setComfyForm] = React.useState({ email: "", password: "" });
  const [isComfyConnecting, setIsComfyConnecting] = React.useState(false);
  const [comfyProgress, setComfyProgress] = React.useState({ status: "", percent: 0 });
  const [comfyWidth, setComfyWidth] = React.useState(1080);
  const [comfyHeight, setComfyHeight] = React.useState(1920);
  const initialFocusRef = React.useRef(null);
  const closeRef = React.useRef(null);
  const gridRef = React.useRef(null);
  const itemRefs = React.useRef([]);
  const thumbnailStripRef = React.useRef(null);

  // Auto-select first available CLI
  React.useEffect(() => {
    if (cliStatus && cliStatus.length && !selectedCli) {
      const first = cliStatus.find((c) => c.available);
      if (first) setSelectedCli(first.id);
    }
  }, [cliStatus, selectedCli]);

  const titleId = React.useId();
  const { containerRef } = useFocusTrap({ enabled: true, onClose, initialFocusRef: initialFocusRef });

  const recents = React.useMemo(() => {
    const k = String(pickerKind || "");
    return readRecents().filter((r) => !k || r.kind === k).slice(0, 8);
  }, [pickerKind]);

  React.useEffect(() => {
    setHoverHighUrl("");
    setNavIndex(0);
  }, [assets, page, search, projectOnly]);

  const handleUploadInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) onUploadFile?.(file);
  };

  const totalPages = Math.max(1, Math.ceil((total || 0) / (pageSize || 10)));

  const handlePointerEnterAsset = (asset) => {
    if (asset?.url) setHoverHighUrl(asset.url);
  };

  const handlePointerLeaveGrid = () => {
    setHoverHighUrl("");
  };

  const focusNavIndex = React.useCallback((nextIdx) => {
    const maxIdx = assets.length; // 0 = upload card
    const clamped = Math.max(0, Math.min(maxIdx, nextIdx));
    setNavIndex(clamped);
    const el = itemRefs.current[clamped];
    el?.focus?.();
  }, [assets.length]);

  const colsForGrid = React.useCallback(() => {
    const grid = gridRef.current;
    if (!grid) return 1;
    const styles = window.getComputedStyle(grid);
    const template = styles.gridTemplateColumns || "";
    const parts = template.split(" ").filter(Boolean);
    if (parts.length) return Math.max(1, parts.length);
    const w = grid.clientWidth || 1;
    const min = 132;
    return Math.max(1, Math.floor(w / min));
  }, []);

  const handleGridKeyDown = (e) => {
    if (!gridRef.current) return;
    const maxIdx = assets.length;
    if (!maxIdx && e.key !== "u") return;

    const target = e.target;
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) {
      return;
    }

    if ((e.key === "u" || e.key === "U") && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      onUploadClick?.();
      return;
    }

    if ((e.key === "n" || e.key === "N") && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
      if (hasMore && !loadingList) {
        e.preventDefault();
        onPageChange?.(page + 1);
      }
      return;
    }

    if ((e.key === "p" || e.key === "P") && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
      if (hasPrev && !loadingList) {
        e.preventDefault();
        onPageChange?.(page - 1);
      }
      return;
    }

    if (e.key === "Enter") {
      if (navIndex === 0) {
        e.preventDefault();
        onUploadClick?.();
      }
      return;
    }

    if (e.key === "d" || e.key === "D") {
      if (navIndex > 0) {
        const asset = assets[navIndex - 1];
        if (asset) {
          e.preventDefault();
          onSetDefault?.(asset);
        }
      }
      return;
    }

    if (e.key === "ArrowRight") {
      e.preventDefault();
      focusNavIndex(Math.min(maxIdx, navIndex + 1));
      return;
    }
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      focusNavIndex(Math.max(0, navIndex - 1));
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const cols = colsForGrid();
      focusNavIndex(Math.min(maxIdx, navIndex + cols));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      const cols = colsForGrid();
      focusNavIndex(Math.max(0, navIndex - cols));
    }
  };

  const handleComfyAuth = async (isRegister = false) => {
    if (!comfyForm.email || !comfyForm.password) return;
    setIsComfyConnecting(true);
    setGenerationError(null);
    try {
      const baseUrl = comfyConfig.url || "http://localhost:8000";
      if (isRegister) {
        await comfyService.register(baseUrl, comfyForm.email, comfyForm.password);
      }
      await comfyService.login(baseUrl, comfyForm.email, comfyForm.password);
      setComfyConfig(comfyService.getConnection());
    } catch (err) {
      setGenerationError(`Connection failed: ${err.message}`);
    } finally {
      setIsComfyConnecting(false);
    }
  };

  const fileToDataUrl = async (path) => {
    const bytes = await readBinaryFile(path);
    const blob = new Blob([bytes], { type: "image/png" });
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  };

  const handlePick = (asset) => {
    pushRecent(String(pickerKind || ""), asset);
    onPick(asset);
  };

  return (
    <div className="modal" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div
        ref={containerRef}
        className="dialog asset-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={activeTab === "generate" ? { width: "min(1000px, 96vw)" } : {}}
      >
        <div className="dialog-head asset-dialog-head" style={{ flexDirection: "column", alignItems: "stretch", gap: "14px" }}>
          <div style={{ display: "flex", width: "100%", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", gap: "8px", marginBottom: 0 }}>
              <button
                type="button"
                style={{
                  padding: "8px 16px",
                  borderRadius: "8px",
                  border: activeTab === "generate" ? "1px solid var(--accent)" : "1px solid var(--border)",
                  background: activeTab === "generate" ? "var(--accent)" : "var(--surface2)",
                  color: activeTab === "generate" ? "#fff" : "var(--muted)",
                  fontWeight: "600",
                  cursor: "pointer",
                  whiteSpace: "nowrap"
                }}
                onClick={() => setActiveTab("generate")}
              >
                Generate
              </button>
              <button
                type="button"
                style={{
                  padding: "8px 16px",
                  borderRadius: "8px",
                  border: activeTab === "upload" ? "1px solid var(--accent)" : "1px solid var(--border)",
                  background: activeTab === "upload" ? "var(--accent)" : "var(--surface2)",
                  color: activeTab === "upload" ? "#fff" : "var(--muted)",
                  fontWeight: "600",
                  cursor: "pointer",
                  whiteSpace: "nowrap"
                }}
                onClick={() => setActiveTab("upload")}
              >
                Upload
              </button>
            </div>
            <div className="asset-dialog-head-right">
              {defaultPreviewUrl ? (
                <div className="asset-default-corner" title="Current default for new rows / all projects">
                  <span className="asset-default-corner-label">Default</span>
                  <div
                    className="asset-default-corner-thumb"
                    style={{ backgroundImage: `url(${defaultPreviewUrl})` }}
                    role="img"
                    aria-label="Default image for this slot"
                  />
                </div>
              ) : null}
              <button ref={closeRef} type="button" className="asset-dialog-close" onClick={onClose} aria-label="Close image picker">
                ×
              </button>
            </div>
          </div>
        </div>

        {activeTab === "upload" && (
          <div className="dialog-body asset-body">
            <input ref={uploadInputRef} hidden type="file" accept="image/*" onChange={handleUploadInputChange} />
            <div className="asset-toolbar">
              <label className="asset-search">
                <span className="sr-only">Search library</span>
                <input
                  value={search}
                  onChange={(e) => onSearchChange?.(e.target.value)}
                  placeholder="Search by file name…"
                  aria-label="Search assets by file name"
                />
              </label>
              <label className="asset-filter-toggle">
                <input
                  type="checkbox"
                  checked={!!projectOnly}
                  onChange={(e) => onProjectOnlyChange?.(e.target.checked)}
                />
                <span>This project only</span>
              </label>
            </div>
            {recents.length > 0 && (
              <div className="asset-recents" aria-label="Recently used images">
                <div className="asset-recents-label">Recent</div>
                <div className="asset-recents-row">
                  {recents.map((r) => (
                    <button
                      type="button"
                      key={`${r.kind}:${r.url}`}
                      className="asset-recent-chip"
                      style={{ backgroundImage: `url(${r.thumbUrl || r.url})` }}
                      title={r.fileName || "Recent"}
                      aria-label={`Recent image ${r.fileName || ""}`}
                      onClick={() => onPick({ url: r.url, thumbUrl: r.thumbUrl || r.url, fileName: r.fileName, projectId: r.projectId, id: r.id })}
                    />
                  ))}
                </div>
              </div>
            )}
            <div className="asset-hover-preview-bar" aria-live="polite">
              {hoverHighUrl ? (
                <img className="asset-hover-preview-img" src={hoverHighUrl} alt="" decoding="async" />
              ) : (
                <span className="asset-preview-placeholder">Hover or focus a card to preview full resolution</span>
              )}
            </div>
            <div
              ref={gridRef}
              className="asset-picker-grid"
              onPointerLeave={handlePointerLeaveGrid}
              onKeyDown={handleGridKeyDown}
            >
              <button
                ref={(el) => {
                  itemRefs.current[0] = el;
                  initialFocusRef.current = el;
                }}
                type="button"
                className="asset-upload-card"
                tabIndex={navIndex === 0 ? 0 : -1}
                onFocus={() => { setNavIndex(0); setHoverHighUrl(""); }}
                onClick={onUploadClick}
                disabled={loadingUpload}
                aria-busy={loadingUpload}
                aria-label={loadingUpload ? "Uploading image" : "Upload new image"}
              >
                <span className="asset-upload-plus" aria-hidden="true">+</span>
                <span className="asset-upload-label">{loadingUpload ? "Uploading…" : "Upload new"}</span>
              </button>
              {!loadingList && assets.map((asset, i) => {
                const idx = i + 1;
                const label = `Use image ${asset.fileName || "untitled"} from ${projectNameFromId(projects, asset.projectId)}`;
                const isCurrentProject = !!activeProjectId && asset.projectId === activeProjectId;
                return (
                  <div
                    key={asset.id || asset.url}
                    className={`asset-inventory-card ${isCurrentProject ? "asset-inventory-card-current" : ""}`}
                    onPointerEnter={() => handlePointerEnterAsset(asset)}
                  >
                    <button
                      ref={(el) => { itemRefs.current[idx] = el; }}
                      type="button"
                      tabIndex={navIndex === idx ? 0 : -1}
                      className="asset-inventory-thumb"
                      style={{ backgroundImage: `url(${listThumbUrl(asset)})` }}
                      aria-label={label}
                      onFocus={() => { setNavIndex(idx); handlePointerEnterAsset(asset); }}
                      onClick={() => handlePick(asset)}
                    />
                    <button
                      type="button"
                      className="asset-default-fab"
                      disabled={busyAssetId === asset.id}
                      onClick={(e) => { e.stopPropagation(); onSetDefault?.(asset); }}
                      aria-label={`Set ${asset.fileName || "image"} as default`}
                    >
                      {busyAssetId === asset.id ? "…" : "★"}
                    </button>
                    <div className="asset-inventory-meta">
                      <small title={asset.fileName || ""}>{projectNameFromId(projects, asset.projectId)}</small>
                    </div>
                  </div>
                );
              })}
            </div>
            {loadingList && <div className="asset-loading">Loading library…</div>}
            {!loadingList && !assets.length && (
              <p className="asset-empty-note">No images found for this slot yet. Use the + card to upload.</p>
            )}
            <div className="asset-pagination">
              <button
                type="button"
                className="asset-page-btn"
                disabled={!hasPrev || loadingList}
                onClick={() => onPageChange?.(page - 1)}
              >
                Previous
              </button>
              <span className="asset-page-info">
                Page {page} of {totalPages}
                {total > 0 ? ` · ${total} total` : ""}
              </span>
              <button
                type="button"
                className="asset-page-btn"
                disabled={!hasMore || loadingList}
                onClick={() => onPageChange?.(page + 1)}
                onMouseEnter={() => onPrefetchNext?.()}
                onFocus={() => onPrefetchNext?.()}
              >
                Next
              </button>
            </div>
            <p className="asset-kb-hint" aria-hidden="true">
              Keys: arrows move · Enter picks · D default · U upload · N/P pages
            </p>
          </div>
        )}

        {activeTab === "generate" && (
          <div className="dialog-body generate-body">
            <div className="generate-left">
              <div className="generate-prompt-box">
                <textarea
                  className="generate-prompt-input"
                  placeholder="Describe the image you want to generate…"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  disabled={isGenerating}
                />
              </div>

              {selectedCli === "comfyui" && (
                <div className="generate-options-row">
                  <div className="gen-option">
                    <label>Width</label>
                    <input
                      type="number"
                      value={comfyWidth}
                      onChange={(e) => setComfyWidth(parseInt(e.target.value) || 1080)}
                      disabled={isGenerating}
                      className="gen-input-small"
                    />
                  </div>
                  <div className="gen-option">
                    <label>Height</label>
                    <input
                      type="number"
                      value={comfyHeight}
                      onChange={(e) => setComfyHeight(parseInt(e.target.value) || 1920)}
                      disabled={isGenerating}
                      style={{ width: "90px", padding: "8px 12px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "8px", color: "var(--text)", fontSize: "14px" }}
                    />
                  </div>
                </div>
              )}

              <div className="generate-controls">
                <button
                  type="button"
                  className="btn-primary generate-btn"
                  disabled={isGenerating || !prompt.trim() || !selectedCli}
                  onClick={async () => {
                    if (!prompt.trim() || !selectedCli) return;
                    setIsGenerating(true);
                    setGenerationError(null);
                    setComfyProgress({ status: "starting", percent: 0 });
                    
                    try {
                      let imageDataUrl = "";
                      let imagePath = "";

                      if (selectedCli === "comfyui") {
                        const localPath = await comfyService.generateImage(
                          prompt.trim(), 
                          { width: comfyWidth, height: comfyHeight },
                          (status, percent) => {
                            setComfyProgress({ status, percent });
                          }
                        );
                        imagePath = localPath;
                        imageDataUrl = await fileToDataUrl(localPath);
                      } else {
                        const result = await generateImage(selectedCli, prompt.trim());
                        if (!result.success || !result.imageDataUrl) {
                          throw new Error(result.error || "Generation failed");
                        }
                        imageDataUrl = result.imageDataUrl;
                        imagePath = result.imagePath;
                      }

                      const newImage = {
                        id: `gen_${Date.now()}`,
                        dataUrl: imageDataUrl,
                        path: imagePath,
                        timestamp: Date.now(),
                      };
                      setGeneratedImages((prev) => [...prev, newImage]);
                      setSelectedImageIndex((prev) => prev === 0 && generatedImages.length === 0 ? 0 : generatedImages.length);
                    } catch (err) {
                      setGenerationError(`Generation failed: ${err.message || err}`);
                    } finally {
                      setIsGenerating(false);
                      setComfyProgress({ status: "", percent: 0 });
                    }
                  }}
                >
                  {isGenerating ? (
                    <>
                      <span className="generate-spinner" aria-hidden="true" />
                      Generating…
                    </>
                  ) : (
                    "Generate"
                  )}
                </button>
                <select
                  className="generate-cli-select"
                  value={selectedCli}
                  onChange={(e) => setSelectedCli(e.target.value)}
                  disabled={isGenerating}
                >
                  {(cliStatus || []).map((cli) => (
                    <option key={cli.id} value={cli.id} disabled={!cli.available && cli.id !== 'comfyui'}>
                      {cli.name}{!cli.available && cli.id !== 'comfyui' ? " (not installed)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              {selectedCli === "comfyui" && !comfyConfig.token && (
                <div className="comfy-auth-overlay">
                  <div className="comfy-auth-card">
                    <h4>Connect to ComfyUI</h4>
                    <p style={{ fontSize: "0.85em", color: "var(--muted)", marginBottom: "12px" }}>
                      Local server required (Default: http://localhost:8000)
                    </p>
                    <input
                      type="text"
                      placeholder="Server URL"
                      value={comfyConfig.url}
                      onChange={(e) => setComfyConfig({ ...comfyConfig, url: e.target.value })}
                      className="comfy-input"
                    />
                    <input
                      type="email"
                      placeholder="Email"
                      value={comfyForm.email}
                      onChange={(e) => setComfyForm({ ...comfyForm, email: e.target.value })}
                      className="comfy-input"
                    />
                    <input
                      type="password"
                      placeholder="Password"
                      value={comfyForm.password}
                      onChange={(e) => setComfyForm({ ...comfyForm, password: e.target.value })}
                      className="comfy-input"
                    />
                    <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                      <button 
                        className="btn-primary" 
                        style={{ flex: 1 }}
                        disabled={isComfyConnecting}
                        onClick={() => handleComfyAuth(false)}
                      >
                        {isComfyConnecting ? "Connecting..." : "Login"}
                      </button>
                      <button 
                        className="btn-secondary" 
                        style={{ flex: 1 }}
                        disabled={isComfyConnecting}
                        onClick={() => handleComfyAuth(true)}
                      >
                        Register
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {selectedCli === "comfyui" && comfyConfig.token && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "var(--surface2)", borderRadius: "8px", marginTop: "12px", border: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#4caf50" }} />
                    <span style={{ fontSize: "0.85em" }}>{comfyConfig.user?.email || "Connected"}</span>
                  </div>
                  <button 
                    style={{ background: "transparent", border: "none", color: "var(--accent)", cursor: "pointer", fontSize: "0.85em", fontWeight: "600" }}
                    onClick={() => {
                      comfyService.disconnect();
                      setComfyConfig(comfyService.getConnection());
                    }}
                  >
                    Disconnect
                  </button>
                </div>
              )}
              {generationError && (
                <div className="generate-error" role="alert">
                  <strong>Error:</strong> {generationError}
                </div>
              )}
            </div>
            <div className="generate-right">
              <div 
                className="generate-preview-area"
                style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "center", 
                  background: "var(--surface3)", 
                  borderRadius: "16px", 
                  overflow: "hidden", 
                  position: "relative", 
                  minHeight: "500px", 
                  maxHeight: "70vh", 
                  border: "1px solid var(--border)",
                  boxShadow: "inset 0 0 40px rgba(0, 0, 0, 0.2)"
                }}
              >
                {isGenerating ? (
                  <div className="generate-preview-loading">
                    <div className="generate-spinner-large" aria-hidden="true" />
                    <span>
                      {selectedCli === "comfyui" 
                        ? `ComfyUI: ${comfyProgress.status}... ${comfyProgress.percent}%` 
                        : `Generating image with ${(cliStatus || []).find(c => c.id === selectedCli)?.name || selectedCli}...`
                      }
                    </span>
                  </div>
                ) : generatedImages.length > 0 && generatedImages[selectedImageIndex] ? (
                  <img
                    className="generate-preview-img"
                    src={generatedImages[selectedImageIndex].dataUrl}
                    alt="Generated image preview"
                    draggable={false}
                    style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", filter: "drop-shadow(0 10px 30px rgba(0, 0, 0, 0.5))" }}
                  />
                ) : (
                  <div className="generate-preview-placeholder" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", color: "var(--muted)" }}>
                    <div className="generate-preview-placeholder-icon" aria-hidden="true" style={{ fontSize: "48px", opacity: 0.3 }}>🎨</div>
                    <span>Generated image will appear here</span>
                  </div>
                )}
              </div>
              <div className="generate-select-row">
                <button
                  type="button"
                  className="btn-primary generate-select-btn"
                  disabled={!generatedImages.length || isGenerating}
                  onClick={async () => {
                    const img = generatedImages[selectedImageIndex];
                    if (img && onUploadFile) {
                      try {
                        setIsGenerating(true);
                        const file = await dataUrlToFile(img.dataUrl, `generated_${img.id}.png`);
                        await onUploadFile(file);
                      } catch (err) {
                        setGenerationError(`Failed to upload selected image: ${err.message}`);
                      } finally {
                        setIsGenerating(false);
                      }
                    }
                  }}
                >
                  Select
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="dialog-foot asset-dialog-foot" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          {activeTab === "generate" ? (
            <div className="generate-thumbnail-strip" ref={thumbnailStripRef}>
              {generatedImages.map((img, i) => (
                <button
                  key={img.id}
                  type="button"
                  className={`generate-thumbnail ${i === selectedImageIndex ? "generate-thumbnail--active" : ""}`}
                  onClick={() => setSelectedImageIndex(i)}
                  aria-label={`Generated image ${i + 1}`}
                  title={`Image ${i + 1} — ${new Date(img.timestamp).toLocaleTimeString()}`}
                >
                  <img src={img.dataUrl} alt="" draggable={false} />
                </button>
              ))}
              {generatedImages.length === 0 && (
                <span className="generate-thumbnail-empty">Generated images will appear here</span>
              )}
            </div>
          ) : (
            <div />
          )}
          <button type="button" onClick={onClose} style={{ flexShrink: 0 }}>Close</button>
        </div>
      </div>
    </div>
  );
};
