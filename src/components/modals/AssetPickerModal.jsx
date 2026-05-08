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
  const [negativePrompt, setNegativePrompt] = React.useState("");
  const [elapsedTime, setElapsedTime] = React.useState(0);
  const [activeJobId, setActiveJobId] = React.useState(null);
  const [aspectRatio, setAspectRatio] = React.useState("9:16");
  const [selectedLibraryAsset, setSelectedLibraryAsset] = React.useState(null);
  const [filterMode, setFilterMode] = React.useState("all"); // all, uploaded, generated
  const [sortMode, setSortMode] = React.useState("latest"); // latest, oldest, name

  const filteredAssets = React.useMemo(() => {
    let result = [...(assets || [])];
    
    if (filterMode === "generated") {
      result = result.filter(a => a.id?.includes("gen_") || a.url?.includes("generated"));
    } else if (filterMode === "uploaded") {
      result = result.filter(a => !a.id?.includes("gen_") && !a.url?.includes("generated"));
    }
    
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(a => a.fileName?.toLowerCase().includes(s) || a.id?.toLowerCase().includes(s));
    }
    
    if (sortMode === "latest") {
      result.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    } else if (sortMode === "oldest") {
      result.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    } else if (sortMode === "name") {
      result.sort((a, b) => (a.fileName || "").localeCompare(b.fileName || ""));
    }
    
    return result;
  }, [assets, filterMode, sortMode, search]);

  const initialFocusRef = React.useRef(null);
  const closeRef = React.useRef(null);
  const gridRef = React.useRef(null);
  const itemRefs = React.useRef([]);
  const thumbnailStripRef = React.useRef(null);
  const timerRef = React.useRef(null);
  const isCancelledRef = React.useRef(false);

  // Set initial library selection
  React.useEffect(() => {
    if (activeTab === "upload" && !selectedLibraryAsset && filteredAssets.length > 0) {
      setSelectedLibraryAsset(filteredAssets[0]);
    }
  }, [activeTab, filteredAssets, selectedLibraryAsset]);

  // Timer logic
  React.useEffect(() => {
    if (isGenerating) {
      setElapsedTime(0);
      timerRef.current = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isGenerating]);

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
    const maxIdx = filteredAssets.length; // 0 = upload card
    const clamped = Math.max(0, Math.min(maxIdx, nextIdx));
    setNavIndex(clamped);
    const el = itemRefs.current[clamped];
    el?.focus?.();
  }, [filteredAssets.length]);

  const colsForGrid = React.useCallback(() => {
    const grid = gridRef.current;
    if (!grid) return 1;
    const styles = window.getComputedStyle(grid);
    const template = styles.gridTemplateColumns || "";
    const parts = template.split(" ").filter(Boolean);
    if (parts.length) return Math.max(1, parts.length);
    const w = grid.clientWidth || 1;
    const min = 160;
    return Math.max(1, Math.floor(w / min));
  }, []);

  const handleGridKeyDown = (e) => {
    if (!gridRef.current) return;
    const maxIdx = filteredAssets.length;
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

    if (e.key === "Enter") {
      if (navIndex === 0) {
        e.preventDefault();
        onUploadClick?.();
      } else {
        const asset = filteredAssets[navIndex - 1];
        if (asset) handlePick(asset);
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

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      if (!isGenerating && prompt.trim() && selectedCli) {
        // Trigger generation
        const btn = document.querySelector(".ap-gen-btn");
        btn?.click();
      }
    }
  };

  return (
    <div className="asset-picker-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div
        ref={containerRef}
        className="asset-picker-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={handleKeyDown}
      >
        {/* --- Header --- */}
        <header className="ap-header">
          <div className="ap-header-title">
            <span style={{ fontSize: "24px" }}>🎨</span>
            <h2 id={titleId} style={{ margin: 0, fontSize: "18px" }}>{title || "Asset Library"}</h2>
          </div>
          
          <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
            <div style={{ display: "flex", gap: "4px" }}>
              <button
                type="button"
                className={`ap-preset-btn ${activeTab === "generate" ? "active" : ""}`}
                onClick={() => setActiveTab("generate")}
              >
                Generate
              </button>
              <button
                type="button"
                className={`ap-preset-btn ${activeTab === "upload" ? "active" : ""}`}
                onClick={() => setActiveTab("upload")}
              >
                Library
              </button>
            </div>

            {selectedCli === "comfyui" && comfyConfig.token && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 12px", background: "rgba(76, 175, 80, 0.1)", borderRadius: "8px", border: "1px solid rgba(76, 175, 80, 0.2)" }}>
                <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#4caf50" }} />
                <span style={{ fontSize: "12px", color: "#81c784", fontWeight: "600" }}>Connected</span>
              </div>
            )}

            <button type="button" className="ap-close-btn" onClick={onClose} aria-label="Close">×</button>
          </div>
        </header>

        <div className="ap-body">
          {activeTab === "generate" ? (
            <>
              {/* --- Left: Controls --- */}
              <aside className="ap-controls">
                <div className="ap-input-wrapper">
                  <div className="ap-section-label">
                    <span>Prompt</span>
                    <span>{prompt.length} / 1000</span>
                  </div>
                  <textarea
                    className="ap-textarea"
                    placeholder="A cinematic robot chef in a neon kitchen..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    disabled={isGenerating}
                  />
                  <div className="ap-char-count">Press Ctrl + Enter to generate</div>
                </div>

                <div className="ap-input-wrapper">
                  <div className="ap-section-label">Negative Prompt</div>
                  <textarea
                    className="ap-textarea"
                    style={{ minHeight: "60px" }}
                    placeholder="blurry, low quality, distorted..."
                    value={negativePrompt}
                    onChange={(e) => setNegativePrompt(e.target.value)}
                    disabled={isGenerating}
                  />
                </div>

                <div className="ap-section-label">Dimensions</div>
                <div className="ap-dimensions-grid">
                  <div className="ap-dim-input-group">
                    <label>Width</label>
                    <input
                      type="number"
                      className="ap-number-input"
                      value={comfyWidth}
                      onChange={(e) => setComfyWidth(parseInt(e.target.value) || 1080)}
                      disabled={isGenerating}
                    />
                  </div>
                  <div className="ap-dim-input-group">
                    <label>Height</label>
                    <input
                      type="number"
                      className="ap-number-input"
                      value={comfyHeight}
                      onChange={(e) => setComfyHeight(parseInt(e.target.value) || 1920)}
                      disabled={isGenerating}
                    />
                  </div>
                </div>

                <div className="ap-aspect-presets">
                  {[
                    { label: "1:1 Square", w: 1024, h: 1024, id: "1:1" },
                    { label: "9:16 Story", w: 1080, h: 1920, id: "9:16" },
                    { label: "16:9 Cinema", w: 1920, h: 1080, id: "16:9" },
                    { label: "4:5 Portrait", w: 1080, h: 1350, id: "4:5" }
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className={`ap-preset-btn ${aspectRatio === p.id ? "active" : ""}`}
                      onClick={() => {
                        setAspectRatio(p.id);
                        setComfyWidth(p.w);
                        setComfyHeight(p.h);
                      }}
                      disabled={isGenerating}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {selectedCli === "comfyui" && !comfyConfig.token && (
                  <div className="comfy-auth-overlay" style={{ marginTop: 0, marginBottom: "20px" }}>
                    <div className="comfy-auth-card">
                      <h4>Connect to ComfyUI</h4>
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
                        <button className="btn-primary" style={{ flex: 1 }} disabled={isComfyConnecting} onClick={() => handleComfyAuth(false)}>
                          {isComfyConnecting ? "..." : "Login"}
                        </button>
                        <button className="btn-secondary" style={{ flex: 1 }} disabled={isComfyConnecting} onClick={() => handleComfyAuth(true)}>
                          Reg
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="ap-actions-bar">
                  <button
                    type="button"
                    className="ap-gen-btn"
                    disabled={isGenerating || !prompt.trim() || !selectedCli}
                    onClick={async () => {
                      if (!prompt.trim() || !selectedCli) return;
                      setIsGenerating(true);
                      setGenerationError(null);
                      setComfyProgress({ status: "starting", percent: 0 });
                      isCancelledRef.current = false;
                      
                      try {
                        let imageDataUrl = "";
                        let imagePath = "";

                        if (selectedCli === "comfyui") {
                          const localPath = await comfyService.generateImage(
                            prompt.trim(), 
                            { width: comfyWidth, height: comfyHeight, negative_prompt: negativePrompt },
                            (status, percent) => {
                              if (!isCancelledRef.current) {
                                setComfyProgress({ status, percent });
                              }
                            },
                            (jobId) => setActiveJobId(jobId)
                          );

                          if (isCancelledRef.current) return;
                          imagePath = localPath;
                          imageDataUrl = await fileToDataUrl(localPath);
                        } else {
                          const result = await generateImage(selectedCli, prompt.trim());
                          if (isCancelledRef.current) return;
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
                          prompt: prompt.trim(),
                          dimensions: { width: comfyWidth, height: comfyHeight }
                        };
                        setGeneratedImages((prev) => [...prev, newImage]);
                        setSelectedImageIndex(generatedImages.length);
                      } catch (err) {
                        if (!isCancelledRef.current) {
                          setGenerationError(err.message || String(err));
                        }
                      } finally {
                        if (!isCancelledRef.current) {
                          setIsGenerating(false);
                          setComfyProgress({ status: "", percent: 0 });
                          setActiveJobId(null);
                        }
                      }
                    }}
                  >
                    Generate Image
                  </button>

                  {isGenerating && (
                    <button
                      type="button"
                      className="ap-stop-btn"
                      onClick={async () => {
                        isCancelledRef.current = true;
                        setIsGenerating(false);
                        setComfyProgress({ status: "", percent: 0 });
                        if (activeJobId && selectedCli === "comfyui") {
                          await comfyService.cancelJob(activeJobId);
                        }
                        setActiveJobId(null);
                      }}
                    >
                      Stop
                    </button>
                  )}

                  <select
                    className="ap-provider-select"
                    value={selectedCli}
                    onChange={(e) => setSelectedCli(e.target.value)}
                    disabled={isGenerating}
                  >
                    {(cliStatus || []).map((cli) => (
                      <option key={cli.id} value={cli.id} disabled={!cli.available && cli.id !== 'comfyui'}>
                        {cli.name}
                      </option>
                    ))}
                  </select>
                </div>

                {generationError && (
                  <div style={{ marginTop: "16px", padding: "12px", background: "rgba(244, 67, 54, 0.1)", borderRadius: "8px", border: "1px solid rgba(244, 67, 54, 0.2)", color: "#ef5350", fontSize: "13px" }}>
                    <strong>Error:</strong> {generationError}
                  </div>
                )}
              </aside>

              {/* --- Right: Preview --- */}
              <main className="ap-preview-pane">
                <div className="ap-main-preview">
                  {isGenerating ? (
                    <div className="ap-progress-overlay">
                      <div className="generate-spinner-large" />
                      <div style={{ fontSize: "16px", fontWeight: "700" }}>{comfyProgress.status}... {comfyProgress.percent}%</div>
                      <div className="ap-timer">{formatTime(elapsedTime)} elapsed</div>
                    </div>
                  ) : generatedImages.length > 0 && generatedImages[selectedImageIndex] ? (
                    <img
                      className="ap-preview-img"
                      src={generatedImages[selectedImageIndex].dataUrl}
                      alt="Generated result"
                      draggable={false}
                    />
                  ) : (
                    <div className="ap-preview-empty">
                      <div className="ap-preview-empty-icon">🎨</div>
                      <div style={{ fontSize: "18px", fontWeight: "600" }}>Ready to create?</div>
                      <div style={{ maxWidth: "300px", fontSize: "14px", opacity: 0.7 }}>Describe your vision in the prompt box and click generate to start.</div>
                    </div>
                  )}
                </div>

                {/* --- Bottom: Metadata & Action --- */}
                <footer className="ap-footer">
                  <div className="ap-footer-meta">
                    {generatedImages.length > 0 && generatedImages[selectedImageIndex] ? (
                      <>
                        <div className="ap-meta-item">
                          <span className="ap-meta-label">Resolution</span>
                          <span className="ap-meta-value">{generatedImages[selectedImageIndex].dimensions?.width} × {generatedImages[selectedImageIndex].dimensions?.height}</span>
                        </div>
                        <div className="ap-meta-item">
                          <span className="ap-meta-label">Created</span>
                          <span className="ap-meta-value">{new Date(generatedImages[selectedImageIndex].timestamp).toLocaleTimeString()}</span>
                        </div>
                      </>
                    ) : (
                      <div style={{ fontSize: "12px", color: "var(--muted)" }}>No image selected</div>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                    <div className="ap-gallery-strip" ref={thumbnailStripRef}>
                      {generatedImages.map((img, i) => (
                        <button
                          key={img.id}
                          type="button"
                          className={`ap-gallery-item ${i === selectedImageIndex ? "active" : ""}`}
                          onClick={() => setSelectedImageIndex(i)}
                        >
                          <img src={img.dataUrl} alt="" />
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      className="ap-gen-btn"
                      style={{ height: "40px", padding: "0 24px", flex: "none" }}
                      disabled={!generatedImages.length || isGenerating}
                      onClick={async () => {
                        const img = generatedImages[selectedImageIndex];
                        if (img && onUploadFile) {
                          try {
                            setIsGenerating(true);
                            const file = await dataUrlToFile(img.dataUrl, `generated_${img.id}.png`);
                            await onUploadFile(file);
                          } catch (err) {
                            setGenerationError(`Failed to upload: ${err.message}`);
                          } finally {
                            setIsGenerating(false);
                          }
                        }
                      }}
                    >
                      Use Image
                    </button>
                  </div>
                </footer>
              </main>
            </>
          ) : (
            /* --- Library Redesign Layout --- */
            <div className="ap-library-layout">
              {/* --- Sidebar: Preview & Metadata --- */}
              <aside className="ap-library-sidebar">
                <div className="ap-library-preview-box">
                  {selectedLibraryAsset ? (
                    <img 
                      src={listThumbUrl(selectedLibraryAsset)} 
                      className="ap-library-preview-img" 
                      alt="Selected asset" 
                    />
                  ) : (
                    <div className="ap-preview-empty">
                      <div className="ap-preview-empty-icon">📂</div>
                      <p>Select an asset to preview</p>
                    </div>
                  )}
                </div>
                
                {selectedLibraryAsset && (
                  <div className="ap-library-meta">
                    <div className="ap-library-meta-title">
                      {selectedLibraryAsset.fileName || "Untitled Asset"}
                    </div>
                    <div className="ap-library-meta-grid">
                      <div className="ap-meta-item">
                        <span className="ap-meta-label">Project</span>
                        <span className="ap-meta-value">{projectNameFromId(projects, selectedLibraryAsset.projectId)}</span>
                      </div>
                      <div className="ap-meta-item">
                        <span className="ap-meta-label">Type</span>
                        <span className="ap-meta-value">
                          {(selectedLibraryAsset.id?.includes("gen_") || selectedLibraryAsset.url?.includes("generated")) ? "AI Generated" : "Uploaded"}
                        </span>
                      </div>
                    </div>
                    
                    <button 
                      className="ap-gen-btn" 
                      style={{ width: "100%" }}
                      onClick={() => handlePick(selectedLibraryAsset)}
                    >
                      Use this Asset
                    </button>
                  </div>
                )}
              </aside>

              {/* --- Main: Grid & Toolbar --- */}
              <main className="ap-library-main">
                <div className="ap-library-toolbar">
                  <div className="ap-search-wrapper">
                    <span className="ap-search-icon">🔍</span>
                    <input 
                      type="text" 
                      className="ap-search-input" 
                      placeholder="Search by filename..." 
                      value={search || ""}
                      onChange={(e) => onSearchChange?.(e.target.value)}
                    />
                  </div>

                  <div className="ap-filter-group">
                    <select 
                      className="ap-provider-select" 
                      style={{ height: "36px" }}
                      value={filterMode}
                      onChange={(e) => setFilterMode(e.target.value)}
                    >
                      <option value="all">All Assets</option>
                      <option value="uploaded">Uploaded</option>
                      <option value="generated">Generated</option>
                    </select>

                    <select 
                      className="ap-provider-select" 
                      style={{ height: "36px" }}
                      value={sortMode}
                      onChange={(e) => setSortMode(e.target.value)}
                    >
                      <option value="latest">Latest First</option>
                      <option value="oldest">Oldest First</option>
                      <option value="name">Name A-Z</option>
                    </select>

                    <label className="ap-preset-btn" style={{ height: "36px", display: "flex", alignItems: "center", gap: "8px", padding: "0 12px", border: "1px solid var(--modal-border)", cursor: "pointer" }}>
                      <input 
                        type="checkbox" 
                        checked={!!projectOnly} 
                        onChange={(e) => onProjectOnlyChange?.(e.target.checked)}
                      />
                      <span style={{ fontSize: "12px" }}>Project Only</span>
                    </label>

                    <button className="ap-gen-btn" style={{ height: "36px", padding: "0 16px", flex: "none" }} onClick={onUploadClick}>
                      Upload
                    </button>
                  </div>
                </div>

                <div className="ap-library-grid-scroll">
                  <div ref={gridRef} className="ap-library-grid" onKeyDown={handleGridKeyDown}>
                    {/* Upload Card */}
                    <button 
                      type="button"
                      className="ap-asset-card ap-upload-card"
                      onClick={onUploadClick}
                      disabled={loadingUpload}
                      ref={(el) => { itemRefs.current[0] = el; }}
                    >
                      <span className="ap-upload-icon">{loadingUpload ? "⌛" : "📤"}</span>
                      <span style={{ fontSize: "13px", fontWeight: "600" }}>{loadingUpload ? "Uploading..." : "Upload New"}</span>
                    </button>

                    {/* Asset Cards */}
                    {filteredAssets.map((asset, i) => {
                      const isSelected = selectedLibraryAsset?.id === asset.id || selectedLibraryAsset?.url === asset.url;
                      const isGenerated = asset.id?.includes("gen_") || asset.url?.includes("generated");
                      
                      return (
                        <div 
                          key={asset.id || asset.url}
                          className={`ap-asset-card ${isSelected ? "active" : ""}`}
                          onClick={() => setSelectedLibraryAsset(asset)}
                          onDoubleClick={() => handlePick(asset)}
                          ref={(el) => { itemRefs.current[i + 1] = el; }}
                          tabIndex={0}
                        >
                          <img src={listThumbUrl(asset)} className="ap-asset-thumb" alt="" />
                          <div className="ap-asset-badge">{isGenerated ? "AI" : "IMG"}</div>
                          <div className="ap-asset-overlay">
                            <div className="ap-asset-name">{asset.fileName || "Untitled"}</div>
                          </div>
                          <div className="ap-asset-actions">
                            <button className="ap-asset-action-btn" title="Use Image" onClick={(e) => { e.stopPropagation(); handlePick(asset); }}>✓</button>
                            <button className="ap-asset-action-btn" title="Download" onClick={(e) => { e.stopPropagation(); /* TODO */ }}>↓</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {filteredAssets.length === 0 && !loadingList && (
                    <div className="ap-library-empty">
                      <div className="ap-library-empty-icon">📁</div>
                      <h3>No assets found</h3>
                      <p>Try adjusting your search or filters, or upload something new.</p>
                    </div>
                  )}

                  {loadingList && (
                    <div className="ap-library-empty">
                      <div className="generate-spinner-large" />
                      <p>Loading library...</p>
                    </div>
                  )}
                </div>
                
                {/* Pagination (Optional but good to keep if props exist) */}
                {totalPages > 1 && (
                  <div className="ap-footer" style={{ borderTop: "1px solid var(--modal-border)", padding: "8px 24px" }}>
                    <div className="ap-footer-meta">
                      <span className="ap-meta-value">Page {page} of {totalPages}</span>
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button className="ap-preset-btn" disabled={!hasPrev} onClick={() => onPageChange?.(page - 1)}>Prev</button>
                      <button className="ap-preset-btn" disabled={!hasMore} onClick={() => onPageChange?.(page + 1)}>Next</button>
                    </div>
                  </div>
                )}
              </main>
            </div>
          )}
        </div>
      </div>
      <input ref={uploadInputRef} hidden type="file" accept="image/*" onChange={handleUploadInputChange} />
    </div>
  );
};
