import React, { useRef, useEffect } from 'react';

export const useFocusTrap = ({ enabled, onClose, initialFocusRef }) => {
  const containerRef = useRef(null);
  const openerRef = useRef(document.activeElement);

  useEffect(() => {
    if (!enabled) return;

    const focusFirstFocusable = () => {
      const firstFocusable = containerRef.current.querySelector('[tabindex="0"]');
      if (firstFocusable) {
        firstFocusable.focus();
      }
    };

    const trapFocus = (event) => {
      if (!containerRef.current.contains(event.target)) return;

      const focusables = Array.from(containerRef.current.querySelectorAll('[tabindex="0"]'));
      const index = focusables.indexOf(document.activeElement);

      if (event.key === 'Tab' && !event.shiftKey) {
        event.preventDefault();
        focusables[(index + 1) % focusables.length].focus();
      } else if (event.key === 'Tab' && event.shiftKey) {
        event.preventDefault();
        focusables[(index - 1 + focusables.length) % focusables.length].focus();
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', trapFocus);
    document.addEventListener('keydown', handleEscape);

    if (initialFocusRef.current) {
      initialFocusRef.current.focus();
    } else {
      focusFirstFocusable();
    }

    return () => {
      document.removeEventListener('keydown', trapFocus);
      document.removeEventListener('keydown', handleEscape);
      if (openerRef.current && document.body.contains(openerRef.current)) {
        openerRef.current.focus();
      }
    };
  }, [enabled, onClose, initialFocusRef]);

  return { containerRef };
};
