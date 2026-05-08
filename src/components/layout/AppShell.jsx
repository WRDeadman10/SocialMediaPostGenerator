import React from "react";
import { motion } from "framer-motion";
import { panelVariants } from "../../motion/variants.js";

export const AppShell = ({
  top,
  left,
  center,
  right,
  bottom,
  leftOpen = true,
  rightOpen = true,
}) => {
  return (
    <div className="app-shell">
      <header className="app-topbar">
        {top}
      </header>
      <div className="app-shell-main">
        <div className="app-shell-body">
          <motion.aside
            className="app-panel app-panel-left"
            aria-label="Slide Navigator"
            initial={false}
            animate={leftOpen ? "openLeft" : "closedLeft"}
            variants={panelVariants}
            style={{ width: leftOpen ? 240 : 0 }}
            transition={{ duration: 0.36, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="app-panel-inner" aria-hidden={!leftOpen}>
              {left}
            </div>
          </motion.aside>

          <section className="app-canvas" aria-label="Main editing canvas">
            {center}
          </section>

          <motion.aside
            className="app-panel app-panel-right"
            aria-label="Production Pipeline"
            initial={false}
            animate={rightOpen ? "openRight" : "closedRight"}
            variants={panelVariants}
            style={{ width: rightOpen ? 320 : 0 }}
            transition={{ duration: 0.36, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="app-panel-inner" aria-hidden={!rightOpen}>
              {right}
            </div>
          </motion.aside>
        </div>

        {bottom && (
          <div className="app-shell-timeline">
            {bottom}
          </div>
        )}
      </div>
    </div>
  );
};

