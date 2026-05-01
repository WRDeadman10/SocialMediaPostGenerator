import React from "react";
import { Preview } from "./Preview.jsx";

export const PostGrid = ({
  animateSeed,
  generated,
  visible,
  setVisible,
  onDownload,
  onEdit,
  onOpenFirstSlideImage,
  uploadLoading,
}) => {
  const entries = Object.entries(generated);
  if (!entries.length) {
    return (
      <div className="empty">
        <div>✦</div>
        <h3>Upload an Excel file and generate posts</h3>
        <p>Your rendered cards will appear here.</p>
      </div>
    );
  }
  return (
    <div className="posts-grid" data-anim={animateSeed}>
      {entries.map(([idx, post], i) => {
        const current = visible[idx] || 0;
        const busyFirst = !!uploadLoading?.[`card:first-slide:${idx}`];
        return (
          <article className="post-card anim-in" style={{ "--stagger": `${Math.min(i, 18) * 45}ms` }} key={idx}>
            <div className="card-head">
              <span>{post.type}</span>
              <small>#{Number(idx) + 1} · {(post.rowData.title || post.rowData.slide1_title || "Untitled").slice(0, 24)}</small>
            </div>
            <div className="status">● Ready</div>
            <Preview html={post.slides[current]} />
            {post.slides.length > 1 && (
              <div className="dots">
                {post.slides.map((_, j) => (
                  <button type="button" key={j} className={j === current ? "active" : ""} onClick={() => setVisible((prev) => ({ ...prev, [idx]: j }))} />
                ))}
              </div>
            )}
            <div className="card-actions">
              <button type="button" onClick={() => onEdit(Number(idx))}>✎ Edit</button>
              {post.type === "carousel" && current === 0 && (
                <button
                  type="button"
                  className={`img-btn ${busyFirst ? "busy" : ""}`}
                  onClick={() => onOpenFirstSlideImage?.(Number(idx))}
                  aria-busy={busyFirst}
                  aria-label="Choose first slide image"
                >
                  {busyFirst ? "…" : (post.rowData.firstSlideImage ? "✓ Image" : "▣ Image")}
                </button>
              )}
              <button type="button" onClick={() => onDownload(idx)}>⬇ PNG</button>
            </div>
          </article>
        );
      })}
    </div>
  );
};
