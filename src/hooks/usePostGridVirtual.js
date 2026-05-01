import React from "react";

const DEFAULT_ESTIMATE = 860;

export const usePostGridVirtual = ({ enabled, itemCount }) => {
  const [sizes, setSizes] = React.useState(() => ({}));
  const sizesRef = React.useRef(sizes);

  React.useEffect(() => {
    sizesRef.current = sizes;
  }, [sizes]);

  const prefixHeights = React.useMemo(() => {
    const pref = new Array(itemCount + 1).fill(0);
    for (let i = 0; i < itemCount; i++) {
      const h = sizes[i] ?? DEFAULT_ESTIMATE;
      pref[i + 1] = pref[i] + h;
    }
    return pref;
  }, [itemCount, sizes]);

  const totalHeight = prefixHeights[itemCount] || 0;

  const setMeasuredHeight = React.useCallback((index, height) => {
    const h = Math.max(120, Math.round(height));
    setSizes((prev) => {
      if (prev[index] === h) return prev;
      return { ...prev, [index]: h };
    });
  }, []);

  const [range, setRange] = React.useState({ start: 0, end: Math.max(itemCount - 1, 0) });

  const recompute = React.useCallback(() => {
    if (!enabled || itemCount <= 0) {
      setRange({ start: 0, end: Math.max(itemCount - 1, 0) });
      return;
    }

    const margin = 900;
    const viewTop = window.scrollY;
    const viewBottom = viewTop + window.innerHeight;

    let y = 0;
    let start = 0;
    let end = itemCount - 1;

    for (let i = 0; i < itemCount; i++) {
      const h = sizesRef.current[i] ?? DEFAULT_ESTIMATE;
      const top = y;
      const bottom = y + h;
      if (bottom >= viewTop - margin) {
        start = i;
        break;
      }
      y += h;
    }

    y = 0;
    for (let i = 0; i < itemCount; i++) {
      const h = sizesRef.current[i] ?? DEFAULT_ESTIMATE;
      const top = y;
      const bottom = y + h;
      if (top > viewBottom + margin) {
        end = Math.max(0, i - 1);
        break;
      }
      if (i === itemCount - 1) end = i;
      y += h;
    }

    setRange((prev) => (prev.start === start && prev.end === end ? prev : { start, end }));
  }, [enabled, itemCount]);

  React.useLayoutEffect(() => {
    if (!enabled) return;
    recompute();
    const onScroll = () => window.requestAnimationFrame(recompute);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [enabled, itemCount, recompute, totalHeight]);

  const topSpacer = prefixHeights[range.start] || 0;
  const bottomSpacer = Math.max(0, totalHeight - (prefixHeights[range.end + 1] || totalHeight));

  return {
    start: range.start,
    end: range.end,
    topSpacer,
    bottomSpacer,
    setMeasuredHeight,
    totalHeight,
  };
};
