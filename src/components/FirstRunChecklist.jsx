import React from "react";

const STORAGE_KEY = "smpg:firstRunChecklist:v1";

const readState = () => {
  if (typeof window === "undefined") return { dismissed: false };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { dismissed: false };
  } catch {
    return { dismissed: false };
  }
};

const writeState = (next) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
};

export const FirstRunChecklist = ({
  hydrated,
  activeProjectId,
  rowsLength,
  hasBranding,
  generatedCount,
}) => {
  const [ui, setUi] = React.useState({ dismissed: false });

  React.useEffect(() => {
    setUi(readState());
  }, [hydrated]);

  if (!hydrated || ui.dismissed) return null;
  if (!activeProjectId) return null;

  const items = [
    { id: "project", label: "Active project selected", done: !!activeProjectId },
    { id: "excel", label: "Excel rows loaded", done: rowsLength > 0 },
    { id: "brand", label: "Branding images set (recommended)", done: !!hasBranding },
    { id: "gen", label: "Posts generated at least once", done: generatedCount > 0 },
  ];

  const doneCount = items.filter((i) => i.done).length;

  return (
    <section className="first-run" aria-label="Getting started checklist">
      <div className="first-run-head">
        <div>
          <div className="first-run-title">Getting started</div>
          <div className="first-run-sub">{doneCount}/{items.length} complete</div>
        </div>
        <button type="button" className="first-run-dismiss" onClick={() => { writeState({ dismissed: true }); setUi({ dismissed: true }); }}>
          Dismiss
        </button>
      </div>
      <ul className="first-run-list">
        {items.map((it) => (
          <li key={it.id} className={it.done ? "done" : ""}>
            <span className="first-run-check" aria-hidden="true">{it.done ? "✓" : "○"}</span>
            <span>{it.label}</span>
          </li>
        ))}
      </ul>
    </section>
  );
};
