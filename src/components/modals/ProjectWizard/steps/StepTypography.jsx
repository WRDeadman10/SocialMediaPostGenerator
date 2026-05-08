import React from "react";
import { FontWeight, Range } from "../../../ui/FormBits.jsx";

export const StepTypography = ({ config, updateConfig }) => {
  return (
    <div className="wizard-step-typography">
      <div className="typo-section">
        <span className="typo-title">Title Text</span>
        <div className="typo-controls">
          <FontWeight 
            label="Title" 
            font={config.fontTitle} 
            weight={config.wtTitle}
            onFont={(v) => updateConfig({ fontTitle: v })}
            onWeight={(v) => updateConfig({ wtTitle: v })}
          />
          <Range 
            label="Size" 
            value={config.titleSize} 
            min={20} max={120} 
            onChange={(v) => updateConfig({ titleSize: v })} 
          />
        </div>
      </div>

      <div className="typo-section">
        <span className="typo-title">Paragraph Text</span>
        <div className="typo-controls">
          <FontWeight 
            label="Para" 
            font={config.fontPara} 
            weight={config.wtPara}
            onFont={(v) => updateConfig({ fontPara: v })}
            onWeight={(v) => updateConfig({ wtPara: v })}
          />
          <Range 
            label="Size" 
            value={config.paraSize} 
            min={12} max={48} 
            onChange={(v) => updateConfig({ paraSize: v })} 
          />
        </div>
      </div>

      <div className="typo-section">
        <span className="typo-title">Spacing & Flow</span>
        <div className="typo-grid">
           <Range label="Title to Para" value={config.gapTP} min={0} max={100} onChange={(v) => updateConfig({ gapTP: v })} />
           <Range label="Para to CTA" value={config.gapPC} min={0} max={100} onChange={(v) => updateConfig({ gapPC: v })} />
        </div>
      </div>
    </div>
  );
};
