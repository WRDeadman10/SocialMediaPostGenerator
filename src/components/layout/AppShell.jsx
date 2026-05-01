import React from "react";

export const AppShell = ({
  top,
  left,
  center,
  right,
  footer,
}) => {
  return (
    <div className="app-shell">
      <header className="app-topbar">
        {top}
      </header>
      <div className="app-shell-body">
        <aside className="app-panel app-panel-left" aria-label="Configuration">
          {left}
        </aside>
        <section className="app-canvas" aria-label="Live canvas">
          {center}
        </section>
        <aside className="app-panel app-panel-right" aria-label="Output and actions">
          {right}
        </aside>
      </div>
      {footer ? (
        <div className="app-shell-footer">
          {footer}
        </div>
      ) : null}
    </div>
  );
};

