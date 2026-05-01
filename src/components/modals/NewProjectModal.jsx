import React from "react";
import { Field } from "../ui/FormBits.jsx";

export const NewProjectModal = ({ onClose, onCreate, creating }) => {
  const [name, setName] = React.useState("");
  const handleSubmit = () => {
    if (name.trim() && !creating) onCreate(name);
  };
  return (
    <div className="modal">
      <div className="dialog" style={{ maxWidth: 420 }}>
        <div className="dialog-head"><h2>New Project</h2><button type="button" onClick={onClose}>×</button></div>
        <div className="dialog-body" style={{ display: "block", padding: "24px" }}>
          <Field label="Project Name">
            <input
              autoFocus
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
