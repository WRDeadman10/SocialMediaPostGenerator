import React from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type=\"hidden\"])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex=\"-1\"])",
].join(",");

const isTextField = (el) => {
  if (!el) return false;
  const tag = el.tagName;
  if (tag === "TEXTAREA") return true;
  if (tag === "SELECT") return true;
  if (tag !== "INPUT") return false;
  const type = String(el.getAttribute("type") || "text").toLowerCase();
  return !["button", "submit", "reset", "checkbox", "radio", "file", "image"].includes(type);
};

const getFocusableElements = (root) => {
  if (!root) return [];
  return Array.from(root.querySelectorAll(FOCUSABLE_SELECTOR)).filter((el) => {
    if (!(el instanceof HTMLElement)) return false;
    if (el.hasAttribute("disabled")) return false;
    if (el.getAttribute("aria-hidden") === "true") return false;
    if (el.tabIndex === -1) return false;
    return el.offsetParent !== null || el === document.activeElement;
  });
};

/** Focus trap for modal dialogs: cycles Tab, restores focus, optional Escape close. */
export const useFocusTrap = ({ enabled, onClose, initialFocusRef }) => {
  const containerRef = React.useRef(null);
  const openerRef = React.useRef(null);

  React.useEffect(() => {
    if (!enabled) return;
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose?.();
        return;
      }

      if (event.key !== "Tab") return;
      const root = containerRef.current;
      if (!root || !root.contains(document.activeElement)) return;

      const active = document.activeElement;
      if (active && isTextField(active)) return;

      const focusables = getFocusableElements(root);
      if (!focusables.length) return;

      const idx = focusables.indexOf(document.activeElement);
      if (idx === -1) return;

      event.preventDefault();
      const next = event.shiftKey
        ? focusables[(idx - 1 + focusables.length) % focusables.length]
        : focusables[(idx + 1) % focusables.length];
      next?.focus();
    };

    const handleFocusIn = (event) => {
      const root = containerRef.current;
      if (!root) return;
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (root.contains(target)) return;
      const focusables = getFocusableElements(root);
      focusables[0]?.focus();
    };

    document.addEventListener("keydown", handleKeyDown, true);
    document.addEventListener("focusin", handleFocusIn, true);

    const raf = window.requestAnimationFrame(() => {
      if (initialFocusRef?.current) {
        initialFocusRef.current.focus();
        return;
      }
      getFocusableElements(containerRef.current)[0]?.focus();
    });

    return () => {
      window.cancelAnimationFrame(raf);
      document.removeEventListener("keydown", handleKeyDown, true);
      document.removeEventListener("focusin", handleFocusIn, true);
      const opener = openerRef.current;
      if (opener && document.body.contains(opener)) opener.focus();
    };
  }, [enabled, onClose, initialFocusRef]);

  return { containerRef };
};
