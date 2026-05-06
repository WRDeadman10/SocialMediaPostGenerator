import React from "react";
import { useFocusTrap } from "../../hooks/useFocusTrap.js";

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
}) => {
  const [activeTab, setActiveTab] = React.useState("generate");
  const [hoverHighUrl, setHoverHighUrl] = React.useState("");
  const [navIndex, setNavIndex] = React.useState(0);
  const initialFocusRef = React.useRef(null);
  const closeRef = React.useRef(null);
  const gridRef = React.useRef(null);
  const itemRefs = React.useRef([]);

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
        style={activeTab === "generate" ? { width: "min(800px, 94vw)" } : {}}
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
          <div className="dialog-body" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", padding: "20px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ flex: 1, minHeight: "340px", border: "1px solid var(--border)", borderRadius: "12px", background: "var(--surface2)", padding: "16px", display: "flex", flexDirection: "column" }}>
                <textarea 
                  placeholder="Enter prompt to generate image..."
                  style={{
                    flex: 1,
                    width: "100%",
                    resize: "none",
                    background: "transparent",
                    border: "none",
                    color: "var(--text)",
                    outline: "none",
                    fontSize: "14px",
                    fontFamily: "inherit"
                  }}
                />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <button type="button" className="btn-primary" style={{ width: "auto", minWidth: "120px", padding: "10px 24px", margin: 0 }}>
                  Generate
                </button>
                <select 
                  style={{
                    padding: "10px 16px",
                    borderRadius: "8px",
                    border: "1px solid var(--border)",
                    background: "var(--surface2)",
                    color: "var(--text)",
                    fontSize: "13px",
                    fontWeight: "600",
                    cursor: "pointer",
                    outline: "none"
                  }}
                >
                  <option value="claude">Claude</option>
                  <option value="gemini">Gemini</option>
                  <option value="codex">Codex</option>
                </select>
              </div>
            </div>
            <div style={{ border: "1px solid var(--border)", borderRadius: "12px", background: "var(--surface2)", display: "flex", flexDirection: "column", padding: "20px" }}>
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ color: "var(--muted2)", fontSize: "13px", fontWeight: "600", textAlign: "center" }}>
                  Generated Image placeholder
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "16px" }}>
                <button type="button" className="btn-primary" style={{ padding: "8px 20px", width: "auto" }}>Select</button>
              </div>
            </div>
          </div>
        )}

        <div className="dialog-foot asset-dialog-foot" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          {activeTab === "generate" ? (
            <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingRight: "16px", flex: 1, alignItems: "center" }}>
              {/* Thumbnails placeholder */}
              {[1, 2, 3, 4, 5].map(i => (
                <div 
                  key={i} 
                  style={{ 
                    width: "56px", 
                    height: "36px", 
                    flexShrink: 0, 
                    background: "var(--surface3)", 
                    border: i === 1 ? "2px solid var(--accent)" : "1px solid var(--border)", 
                    borderRadius: "6px",
                    cursor: "pointer"
                  }} 
                />
              ))}
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
