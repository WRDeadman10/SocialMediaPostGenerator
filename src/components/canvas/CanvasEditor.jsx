import React from "react";
import { Preview } from "../Preview.jsx";
import { AnimatePresence, motion } from "framer-motion";
import { useCanvasTransform } from "../../motion/hooks/useCanvasTransform.js";
import { popVariants } from "../../motion/variants.js";

const ARTBOARD_W = 800;
const ARTBOARD_H = 1000;

const parseEditKey = (raw) => {
  const value = String(raw || "");
  const [kind, field] = value.split(":");
  if (!kind || !field) return null;
  if (kind !== "row" && kind !== "config") return null;
  return { kind, field };
};

export const CanvasEditor = ({
  activeProjectId,
  activePostIndex,
  activeSlideIndex,
  setActiveSlideIndex,
  post,
  uploadLoading,
  onInlineEditRequest,
  onOpenEdit,
  onOpenFirstSlideImage,
}) => {
  const stageRef = React.useRef(null);
  const pageRef = React.useRef(null);
  const {
    renderZoom,
    renderPan,
    setTargetZoom,
    setTargetPan,
    nudgeTargetPan,
    beginDrag,
    dragTo,
    endDrag,
  } = useCanvasTransform({
    initialZoom: 1,
    initialPan: { x: 0, y: 0 },
    minZoom: 0.2,
    maxZoom: 3.2,
    lerp: 0.18,
    inertia: { enabled: true, decay: 0.92, stopSpeed: 0.18 },
  });

  const computeCenteredPan = React.useCallback((scale) => {
    const stage = stageRef.current;
    if (!stage) return { x: 0, y: 0 };
    const rect = stage.getBoundingClientRect();
    const style = window.getComputedStyle(stage);
    const padL = Number.parseFloat(style.paddingLeft) || 0;
    const padR = Number.parseFloat(style.paddingRight) || 0;
    const padT = Number.parseFloat(style.paddingTop) || 0;
    const padB = Number.parseFloat(style.paddingBottom) || 0;
    const contentW = Math.max(0, rect.width - padL - padR);
    const contentH = Math.max(0, rect.height - padT - padB);
    const scaledW = ARTBOARD_W * scale;
    const scaledH = ARTBOARD_H * scale;
    const x = padL + Math.max(0, (contentW - scaledW) / 2);
    const y = padT + Math.max(0, (contentH - scaledH) / 2);
    return { x, y };
  }, []);

  const handleFit = React.useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const rect = stage.getBoundingClientRect();
    const padding = 48;
    const maxW = Math.max(1, rect.width - padding);
    const maxH = Math.max(1, rect.height - padding);
    const scale = Math.max(0.2, Math.min(3, Math.min(maxW / ARTBOARD_W, maxH / ARTBOARD_H)));
    setTargetZoom(scale);
    setTargetPan(computeCenteredPan(scale));
  }, [computeCenteredPan]);

  React.useEffect(() => {
    handleFit();
    // Fit when switching posts/slides to keep the canvas centered.
  }, [activePostIndex, activeSlideIndex, handleFit]);

  React.useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(() => {
      setTargetPan(computeCenteredPan(renderZoom));
    });
    ro.observe(stage);
    return () => ro.disconnect();
  }, [computeCenteredPan]);

  const handleZoomOut = React.useCallback(() => {
    setTargetZoom((z) => {
      const next = Math.max(0.2, z - 0.1);
      queueMicrotask(() => setTargetPan(computeCenteredPan(next)));
      return next;
    });
  }, [computeCenteredPan]);

  const handleZoomIn = React.useCallback(() => {
    setTargetZoom((z) => {
      const next = Math.min(3.2, z + 0.1);
      queueMicrotask(() => setTargetPan(computeCenteredPan(next)));
      return next;
    });
  }, [computeCenteredPan]);

  const handleWheel = React.useCallback((e) => {
    const stage = stageRef.current;
    if (!stage) return;
    if (e.ctrlKey || e.metaKey) return;
    e.preventDefault();
    const delta = -e.deltaY;
    const step = Math.abs(delta) > 24 ? 0.12 : 0.06;
    setTargetZoom((prev) => {
      const next = Math.max(0.2, Math.min(3.2, prev + (delta > 0 ? step : -step)));
      queueMicrotask(() => setTargetPan(computeCenteredPan(next)));
      return next;
    });
  }, [computeCenteredPan]);

  const handlePointerDown = React.useCallback((e) => {
    if (e.button !== 0) return;
    // Only pan when the user starts on the stage background.
    if (!(e.target instanceof HTMLElement)) return;
    if (!e.target.closest(".canvas-stage")) return;
    if (e.target.closest(".canvas-page")) return;
    beginDrag(e.clientX, e.clientY);
    const move = (ev) => {
      dragTo(ev.clientX, ev.clientY);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      endDrag();
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }, [beginDrag, dragTo, endDrag]);

  const slides = post?.slides || [];
  const current = Math.max(0, Math.min(slides.length - 1, activeSlideIndex || 0));
  const html = slides[current] || slides[0] || "";
  const postType = String(post?.type || "").toLowerCase().trim();
  const isCarousel = postType === "carousel";
  const busyFirstSlide = !!uploadLoading?.[`card:first-slide:${activePostIndex}`];
  const hasRow = activePostIndex != null && !!post?.rowData;
  const prevSlideRef = React.useRef(activeSlideIndex || 0);
  const [slideDir, setSlideDir] = React.useState(1);

  React.useEffect(() => {
    const prev = prevSlideRef.current;
    prevSlideRef.current = activeSlideIndex || 0;
    setSlideDir((activeSlideIndex || 0) >= prev ? 1 : -1);
  }, [activeSlideIndex]);

  const handleCanvasClick = React.useCallback((e) => {
    if (!onInlineEditRequest) return;
    if (!(e.target instanceof HTMLElement)) return;
    const target = e.target.closest("[data-edit]");
    if (!target) return;
    const parsed = parseEditKey(target.getAttribute("data-edit"));
    if (!parsed) return;
    const rect = target.getBoundingClientRect();
    const pageRect = pageRef.current?.getBoundingClientRect();
    onInlineEditRequest({
      ...parsed,
      rect,
      pageRect: pageRect || null,
      slideIndex: current,
      postIndex: activePostIndex,
      currentValue: target.textContent || "",
    });
  }, [activePostIndex, current, onInlineEditRequest]);

  if (!activeProjectId) {
    return (
      <div className="canvas-empty">
        <div className="canvas-empty-title">Start by selecting a project</div>
        <div className="canvas-empty-sub">Your canvas will appear here once data is loaded.</div>
      </div>
    );
  }

  if (activePostIndex == null || !post) {
    return (
      <div className="canvas-empty">
        <div className="canvas-empty-title">Select an output to edit</div>
        <div className="canvas-empty-sub">Pick a generated post from the right panel.</div>
      </div>
    );
  }

  return (
    <div className="canvas-wrap">
      <div className="canvas-head">
        <div className="canvas-head-left">
          <div className="canvas-head-title">Canvas</div>
          <div className="canvas-head-sub">Post #{activePostIndex + 1} · Slide {current + 1}/{slides.length}</div>
        </div>
        <div className="canvas-head-right">
          <button
            type="button"
            className="canvas-tool text"
            onClick={() => onOpenEdit?.()}
            disabled={!hasRow}
            aria-label="Edit post fields"
          >
            ✎ Edit
          </button>
          {isCarousel && current === 0 ? (
            <button
              type="button"
              className={`canvas-tool img ${busyFirstSlide ? "busy" : ""}`}
              onClick={() => onOpenFirstSlideImage?.()}
              disabled={!hasRow || busyFirstSlide}
              aria-busy={busyFirstSlide}
              aria-label="Choose first slide image"
            >
              {busyFirstSlide ? "…" : (post?.rowData?.firstSlideImage ? "✓ Image" : "▣ Image")}
            </button>
          ) : null}
          <button type="button" className="canvas-tool" onClick={handleZoomOut} aria-label="Zoom out">−</button>
          <button type="button" className="canvas-tool" onClick={handleFit} aria-label="Fit to screen">Fit</button>
          <button type="button" className="canvas-tool" onClick={handleZoomIn} aria-label="Zoom in">+</button>
          <button type="button" className="canvas-tool" onClick={() => setActiveSlideIndex(Math.max(0, current - 1))} disabled={current <= 0}>
            ←
          </button>
          <button type="button" className="canvas-tool" onClick={() => setActiveSlideIndex(Math.min(slides.length - 1, current + 1))} disabled={current >= slides.length - 1}>
            →
          </button>
        </div>
      </div>
      <div
        ref={stageRef}
        className="canvas-stage"
        aria-label={`Canvas preview for post ${activePostIndex + 1}`}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
      >
        <div
          className="canvas-transform"
          style={{ transform: `translate(${renderPan.x}px, ${renderPan.y}px) scale(${renderZoom})` }}
        >
          <div ref={pageRef} className="canvas-page" onClick={handleCanvasClick}>
            <div className="canvas-page-inner">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.div
                  key={`${activePostIndex}:${current}`}
                  className="canvas-slide"
                  initial={{ opacity: 0, x: 18 * slideDir }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -18 * slideDir }}
                  transition={popVariants.animate.transition}
                >
                  <Preview html={html} />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
      {slides.length > 1 ? (
        <div className="canvas-thumbs" aria-label="Slide thumbnails">
          {slides.map((s, i) => (
            <button
              key={i}
              type="button"
              className={`canvas-thumb ${i === current ? "active" : ""}`}
              onClick={() => setActiveSlideIndex(i)}
              aria-label={`Show slide ${i + 1}`}
            >
              <div className="canvas-thumb-inner" dangerouslySetInnerHTML={{ __html: s }} />
              <div className="canvas-thumb-label">{i + 1}</div>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
};

