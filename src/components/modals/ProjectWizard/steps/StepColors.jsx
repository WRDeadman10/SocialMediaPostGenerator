import React from "react";
import { Color, GradientColor } from "../../../ui/FormBits.jsx";

export const StepColors = ({ config, updateConfig }) => {
  return (
    <div className="wizard-step-colors">
      <div className="color-section">
        <span className="color-title">Brand Canvas</span>
        <div className="color-grid">
          <Color label="Background" value={config.bgColor} onChange={(v) => updateConfig({ bgColor: v })} />
          <Color label="Paragraph" value={config.paraColor} onChange={(v) => updateConfig({ paraColor: v })} />
        </div>
      </div>

      <div className="color-section">
        <span className="color-title">Typography Gradients</span>
        <GradientColor 
          label="Title" 
          enabled={config.titleGrad}
          solid={config.titleColor}
          g1={config.titleG1}
          g2={config.titleG2}
          onToggle={(v) => updateConfig({ titleGrad: v })}
          onSolid={(v) => updateConfig({ titleColor: v })}
          onG1={(v) => updateConfig({ titleG1: v })}
          onG2={(v) => updateConfig({ titleG2: v })}
        />
      </div>

      <div className="color-section">
        <span className="color-title">Call to Action (CTA)</span>
        <div className="cta-color-controls">
          <GradientColor 
            label="Button BG" 
            enabled={config.ctaGrad}
            solid={config.ctaBg}
            g1={config.ctaG1}
            g2={config.ctaG2}
            onToggle={(v) => updateConfig({ ctaGrad: v })}
            onSolid={(v) => updateConfig({ ctaBg: v })}
            onG1={(v) => updateConfig({ ctaG1: v })}
            onG2={(v) => updateConfig({ ctaG2: v })}
          />
          <Color label="Button Text" value={config.ctaTxt} onChange={(v) => updateConfig({ ctaTxt: v })} />
        </div>
      </div>
    </div>
  );
};
