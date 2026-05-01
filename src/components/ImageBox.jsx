import React from "react";
import { absoluteAssetUrl } from "../lib/slideHtml.js";

export const ImageBox = ({ value, onFile, onClear, label, onOpen, busy }) => {
  const fileRef = React.useRef(null);
  const displayUrl = absoluteAssetUrl(value);
  return (
    <div className={`image-box-wrap ${busy ? "busy" : ""}`}>
      <button
        type="button"
        className={`image-box ${value ? "has-image" : ""}`}
        style={value ? { backgroundImage: `url(${displayUrl})` } : {}}
        onClick={() => onOpen?.()}
        aria-label={`Choose ${label}`}
      >
        {busy && <div className="image-busy" aria-live="polite"><span className="spinner" /></div>}
        <span>{label}</span>
      </button>
      <input ref={fileRef} hidden type="file" accept="image/*" onChange={(e) => onFile?.(e.target.files[0])} />
      <button type="button" className="image-upload" onClick={() => fileRef.current?.click()} aria-label={`Upload new ${label}`}>↑</button>
      {value && (
        <button type="button" className="image-clear" onClick={(e) => { e.preventDefault(); onClear?.(); }} aria-label={`Clear ${label}`}>×</button>
      )}
    </div>
  );
};
