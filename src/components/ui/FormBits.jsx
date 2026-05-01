import React from "react";
import { fonts } from "../../lib/constants.js";

export const Panel = ({ title, children, defaultOpen = false }) => {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <section className={`panel ${open ? "open" : "closed"}`}>
      <button type="button" className="panel-head" onClick={() => setOpen((v) => !v)}>
        <span><i />{title}</span><b>{open ? "−" : "+"}</b>
      </button>
      {open && <div className="panel-body">{children}</div>}
    </section>
  );
};

export const Stat = ({ label, value }) => <div className="stat"><b>{value}</b><span>{label}</span></div>;

export const Field = ({ label, children }) => (
  <label className="field"><span>{label}</span>{children}</label>
);

export const Color = ({ label, value, onChange }) => (
  <Field label={label}><input type="color" value={value} onChange={(e) => onChange(e.target.value)} /></Field>
);

export const Range = ({ label, value, min, max, onChange }) => (
  <Field label={label}>
    <div className="range">
      <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} />
      <em>{value}px</em>
    </div>
  </Field>
);

export const Select = ({ label, value, onChange }) => (
  <Field label={label}>
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      {fonts.map((f) => <option key={f}>{f}</option>)}
    </select>
  </Field>
);

export const FontWeight = ({ label, font, weight, onFont, onWeight }) => (
  <div className="font-row">
    <Select label={`${label} Font`} value={font} onChange={onFont} />
    <Field label="Weight">
      <select value={weight} onChange={(e) => onWeight(Number(e.target.value))}>
        <option value={400}>Regular</option>
        <option value={500}>Medium</option>
        <option value={600}>Semi-Bold</option>
        <option value={700}>Bold</option>
      </select>
    </Field>
  </div>
);

export const GradientColor = ({ label, enabled, solid, g1, g2, onToggle, onSolid, onG1, onG2 }) => (
  <div className="grad-block">
    <label className="toggle-row">
      <span>{label}</span><em>Gradient</em>
      <input type="checkbox" checked={enabled} onChange={(e) => onToggle(e.target.checked)} />
    </label>
    {enabled ? (
      <div className="grad-colors">
        <input type="color" value={g1} onChange={(e) => onG1(e.target.value)} /><b>to</b>
        <input type="color" value={g2} onChange={(e) => onG2(e.target.value)} /><small>Gradient</small>
      </div>
    ) : (
      <div className="grad-colors">
        <input type="color" value={solid} onChange={(e) => onSolid(e.target.value)} /><small>Solid</small>
      </div>
    )}
  </div>
);

export const PosGrid = ({ value, onChange, includeDefault }) => {
  const options = includeDefault
    ? [["default", "Default"], ["tl", "Top Left"], ["tr", "Top Right"], ["bl", "Bot Left"], ["br", "Bot Right"], ["cb", "Center Bot"]]
    : [["tl", "Top Left"], ["tr", "Top Right"], ["bl", "Bot Left"], ["br", "Bot Right"], ["cb", "Center Bot"]];
  return (
    <div className="pos-grid">
      {options.map(([key, lbl]) => (
        <button key={key} type="button" className={value === key ? "active" : ""} onClick={() => onChange(key)}>{lbl}</button>
      ))}
    </div>
  );
};

export const AlignOverride = ({ title, h, v, onH, onV }) => (
  <div className="override">
    <b>{title}</b>
    <span>Horizontal</span>
    <div className="seg three">{["left", "center", "right"].map((x) => (
      <button key={x} type="button" className={h === x ? "active" : ""} onClick={() => onH(x)}>{x}</button>
    ))}</div>
    <span>Vertical</span>
    <div className="seg three">{["top", "middle", "bottom"].map((x) => (
      <button key={x} type="button" className={v === x ? "active" : ""} onClick={() => onV(x)}>{x}</button>
    ))}</div>
  </div>
);
