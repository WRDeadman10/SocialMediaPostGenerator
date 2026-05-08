import React from "react";
import { ImageBox } from "../../../ImageBox.jsx";
import { Color } from "../../../ui/FormBits.jsx";

export const StepBackgrounds = ({ config, updateConfig, onOpenPicker, onUploadFile, uploadLoading }) => {
  return (
    <div className="wizard-step-backgrounds">
      <div className="bg-hero">
        <ImageBox 
          label="Main Background" 
          value={config.bgDataUrl} 
          onOpen={() => onOpenPicker("background")}
          onFile={(file) => onUploadFile("background", file)}
          onClear={() => updateConfig({ bgDataUrl: "" })}
          busy={uploadLoading["background"]}
        />
        <div className="bg-hero-info">
          <h3>Project Background</h3>
          <p>This image will be used as the base for all slides. You can use a solid color fallback or generate a unique background using AI.</p>
          <div className="bg-actions">
             <button className="ai-gen-btn" onClick={() => onOpenPicker("background")}>
               <span>✨</span> Generate with AI
             </button>
             <Color label="Fallback Solid" value={config.bgColor} onChange={(v) => updateConfig({ bgColor: v })} />
          </div>
        </div>
      </div>

      <div className="bg-presets">
        <span className="presets-label">Preset Textures</span>
        <div className="bg-preset-grid">
          {["Gradient", "Mesh", "Grain", "Minimal"].map((p) => (
            <button key={p} className="bg-preset-item">
              <div className={`bg-thumb ${p.toLowerCase()}`} />
              <span>{p}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
