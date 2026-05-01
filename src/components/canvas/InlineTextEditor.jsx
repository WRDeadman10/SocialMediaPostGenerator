import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { popVariants } from "../../motion/variants.js";

const isMultiLineField = (kind, field) => {
  if (kind !== "row") return false;
  if (field === "paragraph") return true;
  return String(field).includes("_paragraph");
};

export const InlineTextEditor = ({
  selection,
  value,
  onChange,
  onCommit,
  onCancel,
}) => {
  const inputRef = React.useRef(null);

  React.useEffect(() => {
    if (!selection) return;
    const id = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [selection]);

  if (!selection?.rect) return null;
  const rect = selection.rect;

  const style = {
    position: "fixed",
    left: Math.max(12, rect.left - 6),
    top: Math.max(12, rect.top - 6),
    width: Math.min(window.innerWidth - 24, Math.max(220, rect.width + 12)),
    zIndex: 50,
  };

  const multi = isMultiLineField(selection.kind, selection.field);

  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onCancel?.();
      return;
    }
    if (!multi && e.key === "Enter") {
      e.preventDefault();
      onCommit?.();
    }
    if (multi && (e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      onCommit?.();
    }
  };

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={`${selection.kind}:${selection.field}:${selection.postIndex ?? ""}:${selection.slideIndex ?? ""}`}
        className="inline-editor"
        style={style}
        role="dialog"
        aria-label="Inline text editor"
        variants={popVariants}
        initial="initial"
        animate="animate"
        exit="exit"
      >
        {multi ? (
          <textarea
            ref={inputRef}
            className="inline-editor-input"
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={Math.max(3, Math.min(10, Math.round((rect.height + 16) / 24)))}
          />
        ) : (
          <input
            ref={inputRef}
            className="inline-editor-input"
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        )}
        <div className="inline-editor-actions">
          <button type="button" className="inline-btn" onClick={onCancel}>Cancel</button>
          <button type="button" className="inline-btn primary" onClick={onCommit}>Apply</button>
        </div>
        <div className="inline-editor-hint" aria-hidden="true">
          {multi ? "Cmd/Ctrl+Enter to apply · Esc to cancel" : "Enter to apply · Esc to cancel"}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

