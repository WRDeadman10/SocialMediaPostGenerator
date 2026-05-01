import React from "react";
import { AppSidebar } from "../layout/AppSidebar.jsx";

export const ConfigWorkspace = (props) => {
  // Phase A: reuse existing sidebar panels, but render it inside the new left panel shell.
  // Phase D will add validation status indicators and tighter grouping UX.
  return (
    <div className="config-workspace">
      <AppSidebar {...props} />
    </div>
  );
};

