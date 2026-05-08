import React from "react";
import { ImageBox } from "../../../ImageBox.jsx";
import { Range, Field } from "../../../ui/FormBits.jsx";

export const StepBranding = ({ data, config, updateConfig, onOpenPicker, onUploadFile, uploadLoading }) => {
  return (
    <div className="wizard-step-branding">
      <div className="branding-section">
        <span className="branding-title">Main Identity</span>
        <div className="branding-grid">
          <div className="branding-item">
            <ImageBox 
              label="Primary Logo" 
              value={config.logoDataUrl} 
              onOpen={() => onOpenPicker("logo")}
              onFile={(file) => onUploadFile("logo", file)}
              onClear={() => updateConfig({ logoDataUrl: "" })}
              busy={uploadLoading["logo"]}
            />
            <Range 
              label="Logo Size" 
              value={config.logoH} 
              min={20} max={200} 
              onChange={(v) => updateConfig({ logoH: v })} 
            />
          </div>
          <div className="branding-item">
             <Field label="Brand Domain">
               <input 
                 value={config.domain} 
                 placeholder="www.yourbrand.com" 
                 onChange={(e) => updateConfig({ domain: e.target.value })} 
               />
             </Field>
          </div>
        </div>
      </div>

      <div className="branding-section">
        <span className="branding-title">Carousel Extras</span>
        <div className="branding-grid">
          <div className="branding-item">
            <ImageBox 
              label="Last Slide Logo" 
              value={config.lastLogoDataUrl} 
              onOpen={() => onOpenPicker("last-slide-logo")}
              onFile={(file) => onUploadFile("last-slide-logo", file)}
              onClear={() => updateConfig({ lastLogoDataUrl: "" })}
              busy={uploadLoading["last-slide-logo"]}
            />
            <Range 
              label="Last Logo Size" 
              value={config.lastLogoH} 
              min={20} max={200} 
              onChange={(v) => updateConfig({ lastLogoH: v })} 
            />
          </div>
        </div>
      </div>
    </div>
  );
};
