import React from "react";

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

export const useCanvasTransform = ({
  initialZoom = 1,
  initialPan = { x: 0, y: 0 },
  minZoom = 0.2,
  maxZoom = 3.2,
  lerp = 0.18,
  inertia = { enabled: true, decay: 0.92, stopSpeed: 0.18 },
} = {}) => {
  const [render, setRender] = React.useState(() => ({
    zoom: initialZoom,
    pan: initialPan,
  }));

  const targetRef = React.useRef({
    zoom: initialZoom,
    pan: { ...initialPan },
  });

  const velocityRef = React.useRef({ x: 0, y: 0 });
  const draggingRef = React.useRef(false);
  const lastMoveRef = React.useRef({ t: 0, x: 0, y: 0 });
  const rafRef = React.useRef(0);

  const setTarget = React.useCallback((next) => {
    targetRef.current = {
      zoom: typeof next.zoom === "number" ? next.zoom : targetRef.current.zoom,
      pan: next.pan ? { x: next.pan.x ?? targetRef.current.pan.x, y: next.pan.y ?? targetRef.current.pan.y } : targetRef.current.pan,
    };
  }, []);

  const setTargetZoom = React.useCallback((zoom) => {
    if (typeof zoom === "function") {
      const next = zoom(targetRef.current.zoom);
      setTarget({ zoom: clamp(next, minZoom, maxZoom) });
      return;
    }
    setTarget({ zoom: clamp(zoom, minZoom, maxZoom) });
  }, [maxZoom, minZoom, setTarget]);

  const setTargetPan = React.useCallback((pan) => {
    setTarget({ pan });
  }, [setTarget]);

  const nudgeTargetPan = React.useCallback((dx, dy) => {
    const cur = targetRef.current.pan;
    setTarget({ pan: { x: cur.x + dx, y: cur.y + dy } });
  }, [setTarget]);

  const step = React.useCallback(() => {
    const t = targetRef.current;
    setRender((prev) => {
      const nextZoom = prev.zoom + (t.zoom - prev.zoom) * lerp;
      const nextPan = {
        x: prev.pan.x + (t.pan.x - prev.pan.x) * lerp,
        y: prev.pan.y + (t.pan.y - prev.pan.y) * lerp,
      };

      const dz = Math.abs(nextZoom - prev.zoom);
      const dp = Math.abs(nextPan.x - prev.pan.x) + Math.abs(nextPan.y - prev.pan.y);
      if (dz < 0.0004 && dp < 0.08) return prev;
      return { zoom: nextZoom, pan: nextPan };
    });

    // Apply inertia toward target when not dragging
    if (inertia.enabled && !draggingRef.current) {
      const v = velocityRef.current;
      if (Math.abs(v.x) + Math.abs(v.y) > inertia.stopSpeed) {
        v.x *= inertia.decay;
        v.y *= inertia.decay;
        nudgeTargetPan(v.x, v.y);
      } else {
        velocityRef.current = { x: 0, y: 0 };
      }
    }

    rafRef.current = window.requestAnimationFrame(step);
  }, [inertia.decay, inertia.enabled, inertia.stopSpeed, lerp, nudgeTargetPan]);

  React.useEffect(() => {
    rafRef.current = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(rafRef.current);
  }, [step]);

  const beginDrag = React.useCallback((clientX, clientY) => {
    draggingRef.current = true;
    velocityRef.current = { x: 0, y: 0 };
    lastMoveRef.current = { t: performance.now(), x: clientX, y: clientY };
  }, []);

  const dragTo = React.useCallback((clientX, clientY) => {
    if (!draggingRef.current) return;
    const prev = lastMoveRef.current;
    const now = performance.now();
    const dt = Math.max(8, now - prev.t);
    const dx = clientX - prev.x;
    const dy = clientY - prev.y;
    lastMoveRef.current = { t: now, x: clientX, y: clientY };

    // Velocity in px/frame-ish (kept stable via dt normalization)
    velocityRef.current = { x: (dx / dt) * 16, y: (dy / dt) * 16 };
    nudgeTargetPan(dx, dy);
  }, [nudgeTargetPan]);

  const endDrag = React.useCallback(() => {
    draggingRef.current = false;
  }, []);

  return {
    renderZoom: render.zoom,
    renderPan: render.pan,
    targetZoom: targetRef.current.zoom,
    targetPan: targetRef.current.pan,
    setTargetZoom,
    setTargetPan,
    nudgeTargetPan,
    beginDrag,
    dragTo,
    endDrag,
  };
};

