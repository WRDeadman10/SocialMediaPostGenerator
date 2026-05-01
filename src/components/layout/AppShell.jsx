import React from "react";
import { motion } from "framer-motion";
import { panelVariants } from "../../motion/variants.js";

export const AppShell = ({
  top,
  left,
  center,
  right,
  footer,
  leftOpen = true,
  rightOpen = true,
}) => {
  return (
    <div className="app-shell">
      <header className="app-topbar">
        {top}
      </header>
      <div className="app-shell-body">
        <motion.aside
          className="app-panel app-panel-left"
          aria-label="Configuration"
          initial={false}
          animate={leftOpen ? "openLeft" : "closedLeft"}
          variants={panelVariants}
          style={{ width: leftOpen ? 280 : 0 }}
          transition={{ duration: 0.36, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="app-panel-inner" aria-hidden={!leftOpen}>
            {left}
          </div>
        </motion.aside>
        <section className="app-canvas" aria-label="Live canvas">
          {center}
        </section>
        <motion.aside
          className="app-panel app-panel-right"
          aria-label="Output and actions"
          initial={false}
          animate={rightOpen ? "openRight" : "closedRight"}
          variants={panelVariants}
          style={{ width: rightOpen ? 300 : 0 }}
          transition={{ duration: 0.36, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="app-panel-inner" aria-hidden={!rightOpen}>
            {right}
          </div>
        </motion.aside>
      </div>
      {footer ? (
        <div className="app-shell-footer">
          {footer}
        </div>
      ) : null}
    </div>
  );
};

