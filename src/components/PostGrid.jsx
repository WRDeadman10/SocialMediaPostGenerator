import React from "react";
import { Preview } from "./Preview.jsx";
import { usePostGridVirtual } from "../hooks/usePostGridVirtual.js";

export const PostGrid = ({
  animateSeed,
  generated,
  visible,
  setVisible,
  onDownload,
  onEdit,
  onOpenFirstSlideImage,
  uploadLoading,
  virtualize,
}) => {
  const entries = React.useMemo(() => (
    Object.entries(generated).sort((a, b) => Number(a[0]) - Number(b[0]))
  ), [generated]);

  const useVirtual = !!virtualize && entries.length > 8;

  const { start, end, topSpacer, bottomSpacer, setMeasuredHeight } = usePostGridVirtual({
    enabled: useVirtual,
    itemCount: entries.length,
  });

  const visibleEntries = React.useMemo(() => {
    if (!useVirtual) return entries;
    return entries.filter((_, i) => i >= start && i <= end);
  }, [entries, end, start, useVirtual]);

  const elByIndexRef = React.useRef(new Map());

  React.useLayoutEffect(() => {
    if (!useVirtual) return;
    const observers = [];
    for (const [idxKey] of visibleEntries) {
      const idx = entries.findIndex(([k]) => k === idxKey);
      if (idx < 0) continue;
      const el = elByIndexRef.current.get(idx);
      if (!el) continue;
      const ro = new ResizeObserver(() => {
        setMeasuredHeight(idx, el.getBoundingClientRect().height);
      });
      ro.observe(el);
      observers.push(ro);
    }
    return () => observers.forEach((o) => o.disconnect());
  }, [entries, setMeasuredHeight, useVirtual, visibleEntries]);

  if (!entries.length) {
    return (
      <div className="empty">
        <div>✦</div>
        <h3>Load rows, tune branding, then generate</h3>
        <p>Pick a project, upload your Excel template, and press <b>Generate All Posts</b>.</p>
        <p className="empty-hint">Tip: set background + logo in the sidebar first — it applies to every card.</p>
      </div>
    );
  }

  return (
    <div className="posts-grid" data-anim={animateSeed}>
      {useVirtual && <div className="posts-virtual-top" style={{ height: topSpacer }} />}
      {visibleEntries.map(([idx, post]) => {
        const i = entries.findIndex(([k]) => k === idx);
        const n = Number(idx);
        const current = visible[idx] || 0;
        const busyFirst = !!uploadLoading?.[`card:first-slide:${idx}`];
        return (
          <article
            ref={(el) => {
              if (!useVirtual) return;
              if (el) elByIndexRef.current.set(i, el);
              else elByIndexRef.current.delete(i);
            }}
            className="post-card anim-in"
            style={{ "--stagger": `${Math.min(i, 18) * 45}ms` }}
            key={idx}
          >
            <div className="card-head">
              <span>{post.type}</span>
              <small>#{n + 1} · {(post.rowData.title || post.rowData.slide1_title || "Untitled").slice(0, 24)}</small>
            </div>
            <div className="status">● Ready</div>
            <Preview html={post.slides[current]} />
            {post.slides.length > 1 && (
              <div className="dots">
                {post.slides.map((_, j) => (
                  <button
                    type="button"
                    key={j}
                    className={j === current ? "active" : ""}
                    aria-label={`Show slide ${j + 1}`}
                    onClick={() => setVisible((prev) => ({ ...prev, [idx]: j }))}
                  />
                ))}
              </div>
            )}
            <div className="card-actions">
              <button type="button" onClick={() => onEdit(n)}>✎ Edit</button>
              {post.type === "carousel" && current === 0 && (
                <button
                  type="button"
                  className={`img-btn ${busyFirst ? "busy" : ""}`}
                  onClick={() => onOpenFirstSlideImage?.(n)}
                  aria-busy={busyFirst}
                  aria-label="Choose first slide image"
                >
                  {busyFirst ? "…" : (post.rowData.firstSlideImage ? "✓ Image" : "▣ Image")}
                </button>
              )}
              <div className="card-download-split">
                <button type="button" onClick={() => onDownload(idx, {})}>⬇ PNG</button>
                {post.slides.length > 1 && (
                  <select
                    aria-label={`Download a single slide for post ${n + 1}`}
                    defaultValue=""
                    onChange={(e) => {
                      const v = e.target.value;
                      e.target.value = "";
                      if (!v) return;
                      const slideIdx = Number(v);
                      onDownload(idx, { onlySlide: slideIdx });
                    }}
                  >
                    <option value="">One slide…</option>
                    {post.slides.map((_, j) => (
                      <option key={j} value={j}>Slide {j + 1}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          </article>
        );
      })}
      {useVirtual && <div className="posts-virtual-bottom" style={{ height: bottomSpacer }} />}
    </div>
  );
};
