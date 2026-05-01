import React from "react";
import { Field } from "../ui/FormBits.jsx";
import { useFocusTrap } from "../../hooks/useFocusTrap.js";

export const NewProjectModal = ({ onClose, onCreate, creating }) => {
  const [name, setName] = React.useState("");
  const nameRef = React.useRef(null);
  const { containerRef } = useFocusTrap({ enabled: true, onClose, initialFocusRef: nameRef });

  const handleSubmit = () => {
    if (name.trim() && !creating) onCreate(name);
  };

  return (
    <div className="modal" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div
        ref={containerRef}
        className="dialog"
        style={{ maxWidth: 420 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-project-title"
      >
        <div className="dialog-head">
          <h2 id="new-project-title">New Project</h2>
          <button type="button" onClick={onClose} aria-label="Close new project dialog">
            ×
          </button>
        </div>
        <div className="dialog-body" style={{ display: "block", padding: "24px" }}>
          <Field label="Project Name">
            <input
              ref={nameRef}
              value={name}
              placeholder="e.g. Q2 Campaign"
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
          </Field>
          <p className="hint" style={{ marginTop: 8 }}>After creating, upload an Excel file to add posts.</p>
        </div>
        <div className="dialog-foot">
          <button type="button" onClick={onClose}>Cancel</button>
          <button type="button" onClick={handleSubmit} disabled={!name.trim() || creating}>{creating ? "Creating…" : "Create Project"}</button>
        </div>
      </div>
    </div>
  );
};
