import React from "react";

const projectNameFromId = (projects, projectId) => projects?.[projectId]?.name || projectId || "";

const listThumbUrl = (asset) => asset.thumbUrl || asset.url;

export const AssetPickerModal = ({
  title,
  projects,
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
  onPageChange,
  onClose,
  onPick,
  onUploadClick,
  onUploadFile,
  onSetDefault,
}) => {
  const [hoverHighUrl, setHoverHighUrl] = React.useState("");

  React.useEffect(() => {
    setHoverHighUrl("");
  }, [assets, page]);

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

  return (
    <div className="modal" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="dialog asset-dialog" role="dialog" aria-modal="true" aria-label={title}>
        <div className="dialog-head asset-dialog-head">
          <h2>{title}</h2>
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
            <button type="button" className="asset-dialog-close" onClick={onClose} aria-label="Close image picker">
              ×
            </button>
          </div>
        </div>
        <div className="dialog-body asset-body">
          <input ref={uploadInputRef} hidden type="file" accept="image/*" onChange={handleUploadInputChange} />
          <div className="asset-hover-preview-bar" aria-live="polite">
            {hoverHighUrl ? (
              <img className="asset-hover-preview-img" src={hoverHighUrl} alt="" decoding="async" />
            ) : (
              <span className="asset-preview-placeholder">Hover a card to preview full resolution</span>
            )}
          </div>
          <div
            className="asset-picker-grid"
            onPointerLeave={handlePointerLeaveGrid}
          >
            <button
              type="button"
              className="asset-upload-card"
              onClick={onUploadClick}
              disabled={loadingUpload}
              aria-busy={loadingUpload}
              aria-label={loadingUpload ? "Uploading image" : "Upload new image"}
            >
              <span className="asset-upload-plus" aria-hidden="true">+</span>
              <span className="asset-upload-label">{loadingUpload ? "Uploading…" : "Upload new"}</span>
            </button>
            {!loadingList && assets.map((asset) => (
              <article
                className="asset-inventory-card"
                key={asset.id}
                onPointerEnter={() => handlePointerEnterAsset(asset)}
              >
                <button
                  type="button"
                  className="asset-inventory-thumb"
                  style={{ backgroundImage: `url(${listThumbUrl(asset)})` }}
                  onClick={() => onPick(asset)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onPick(asset);
                    }
                  }}
                  onFocus={() => handlePointerEnterAsset(asset)}
                  tabIndex={0}
                  aria-label={`Use image ${asset.fileName || ""}`}
                />
                <div className="asset-inventory-meta">
                  <small title={asset.fileName || ""}>{projectNameFromId(projects, asset.projectId)}</small>
                  <div className="asset-inventory-actions">
                    <button type="button" onClick={() => onPick(asset)}>Use</button>
                    <button type="button" disabled={busyAssetId === asset.id} onClick={() => onSetDefault(asset)}>
                      {busyAssetId === asset.id ? "Saving…" : "Default"}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
          {loadingList && <div className="asset-loading">Loading library…</div>}
          {!loadingList && !assets.length && (
            <p className="asset-empty-note">No images found for this slot yet. Use the + card to upload.</p>
          )}
          <div className="asset-pagination">
            <button
              type="button"
              className="asset-page-btn"
              disabled={page <= 1 || loadingList}
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
            >
              Next
            </button>
          </div>
        </div>
        <div className="dialog-foot asset-dialog-foot">
          <button type="button" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};
