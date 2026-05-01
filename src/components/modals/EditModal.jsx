import React from "react";
import { slidesFor } from "../../lib/slideHtml.js";
import { Field, Range } from "../ui/FormBits.jsx";
import { Preview } from "../Preview.jsx";

export const EditModal = ({ row, onSave, onClose, config }) => {
  const [draft, setDraft] = React.useState(row);
  const [localConfig, setLocalConfig] = React.useState(config);
  const isCarousel = (draft.post_type || "single").toLowerCase().trim() === "carousel";
  const [slide, setSlide] = React.useState(0);
  const keys = isCarousel ? Array.from({ length: 6 }, (_, i) => i) : [0];
  const html = slidesFor(draft, localConfig)[slide] || slidesFor(draft, localConfig)[0];
  const set = (key, value) => { setDraft((prev) => ({ ...prev, [key]: value })); };
  const setLocal = (patch) => { setLocalConfig((prev) => ({ ...prev, ...patch })); };

  return (
    <div className="modal">
      <div className="dialog">
        <div className="dialog-head"><h2>Edit Post</h2><button type="button" onClick={onClose}>×</button></div>
        <div className="dialog-body">
          <div className="edit-fields">
            <div className="modal-section-title">Slide Content</div>
            {isCarousel && (
              <div className="tabs">
                {keys.map((i) => (
                  <button type="button" key={i} className={slide === i ? "active" : ""} onClick={() => setSlide(i)}>Slide {i + 1}</button>
                ))}
              </div>
            )}
            {isCarousel ? <>
              {slide === 0 && <Field label="Title"><textarea value={draft.slide1_title || ""} onChange={(e) => set("slide1_title", e.target.value)} /></Field>}
              {slide > 0 && slide < 5 && <>
                <Field label="Title"><textarea value={draft[`slide${slide + 1}_title`] || ""} onChange={(e) => set(`slide${slide + 1}_title`, e.target.value)} /></Field>
                <Field label="Paragraph"><textarea value={draft[`slide${slide + 1}_paragraph`] || ""} onChange={(e) => set(`slide${slide + 1}_paragraph`, e.target.value)} /></Field>
              </>}
              {slide === 5 && <>
                <Field label="Title"><textarea value={draft.slide6_title || ""} onChange={(e) => set("slide6_title", e.target.value)} /></Field>
                <Field label="CTA Text"><input value={draft.cta_text || ""} onChange={(e) => set("cta_text", e.target.value)} /></Field>
              </>}
            </> : <>
              <Field label="Title"><textarea value={draft.title || ""} onChange={(e) => set("title", e.target.value)} /></Field>
              <Field label="Paragraph"><textarea value={draft.paragraph || ""} onChange={(e) => set("paragraph", e.target.value)} /></Field>
              <Field label="CTA Text"><input value={draft.cta_text || ""} onChange={(e) => set("cta_text", e.target.value)} /></Field>
            </>}
            <div className="modal-section-title">Alignment</div>
            <Field label="Horizontal">
              <div className="seg three modal-seg">
                {["left", "center", "right"].map((v) => (
                  <button type="button" key={v} className={localConfig.hAlign === v ? "active" : ""} onClick={() => setLocal({ hAlign: v })}>
                    {v === "left" ? "←" : v === "right" ? "→" : "↔"}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Vertical">
              <div className="seg three modal-seg">
                {["top", "middle", "bottom"].map((v) => (
                  <button type="button" key={v} className={localConfig.vAlign === v ? "active" : ""} onClick={() => setLocal({ vAlign: v })}>
                    {v === "top" ? "↑" : v === "bottom" ? "↓" : "↕"}
                  </button>
                ))}
              </div>
            </Field>
            <div className="modal-section-title">Logo & Content Size</div>
            <Range label="Logo H" value={localConfig.logoH} min="20" max="200" onChange={(v) => setLocal({ logoH: v })} />
            <Range label="Content W" value={localConfig.contentWidth} min="200" max="800" onChange={(v) => setLocal({ contentWidth: v })} />
            <div className="modal-section-title">Spacing</div>
            <Range label="Title to Para" value={localConfig.gapTP} min="8" max="80" onChange={(v) => setLocal({ gapTP: v })} />
            <Range label="Para to CTA" value={localConfig.gapPC} min="8" max="80" onChange={(v) => setLocal({ gapPC: v })} />
          </div>
          <div className="modal-preview"><div className="modal-section-title">Live Preview</div><Preview html={html} /></div>
        </div>
        <div className="dialog-foot">
          <button type="button" onClick={onClose}>Cancel</button>
          <button type="button" onClick={() => onSave(draft, localConfig)}>Apply Changes</button>
        </div>
      </div>
    </div>
  );
};
