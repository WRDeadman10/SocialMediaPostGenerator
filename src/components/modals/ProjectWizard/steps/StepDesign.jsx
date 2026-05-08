import React from "react";
import { PosGrid, AlignOverride } from "../../../ui/FormBits.jsx";

export const StepDesign = ({ config, updateConfig, updateBar }) => {
  return (
    <div className="wizard-step-design">
      <div className="design-section">
        <span className="design-title">Decorative Bars</span>
        <div className="design-seg">
          <button className={config.barMode === "stack" ? "active" : ""} onClick={() => updateConfig({ barMode: "stack" })}>Stacked</button>
          <button className={config.barMode === "side" ? "active" : ""} onClick={() => updateConfig({ barMode: "side" })}>Side by Side</button>
        </div>
        <div className="bars-config">
          {config.bars.map((bar, i) => (
            <div className="bar-row-item" key={i}>
              <input type="checkbox" checked={bar.enabled} onChange={(e) => updateBar(i, { enabled: e.target.checked })} />
              <input type="color" value={bar.color} onChange={(e) => updateBar(i, { color: e.target.value })} />
              <div className="bar-val">H: {bar.height}</div>
              <div className="bar-val">W: {bar.weight}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="design-section">
        <span className="design-title">Canvas Alignment</span>
        <div className="alignment-layout">
          <div className="align-scope-selector">
            {["all", "first", "last"].map((v) => (
              <button 
                key={v} 
                className={`scope-btn ${config.alignScope === v ? "active" : ""}`}
                onClick={() => updateConfig({ alignScope: v })}
              >
                {v === "all" ? "Global" : v === "first" ? "Slide 1" : "CTA Slide"}
              </button>
            ))}
          </div>
          
          <div className="align-overrides">
            {config.alignScope === "all" && <AlignOverride title="Global Alignment" h={config.hAlign} v={config.vAlign} onH={(v) => updateConfig({ hAlign: v })} onV={(v) => updateConfig({ vAlign: v })} />}
            {config.alignScope === "first" && <AlignOverride title="Slide 1 Override" h={config.slide1HAlign} v={config.slide1VAlign} onH={(v) => updateConfig({ slide1HAlign: v })} onV={(v) => updateConfig({ slide1VAlign: v })} />}
            {config.alignScope === "last" && <AlignOverride title="CTA Slide Override" h={config.ctaHAlign} v={config.ctaVAlign} onH={(v) => updateConfig({ ctaHAlign: v })} onV={(v) => updateConfig({ ctaVAlign: v })} />}
          </div>
        </div>
      </div>

      {config.postType === "carousel" && (
        <div className="design-section">
          <span className="design-title">Carousel Navigation</span>
          <div className="carousel-toggles">
            <label className="wizard-toggle">
              <span>Indicators</span>
              <input type="checkbox" checked={config.indicators} onChange={(e) => updateConfig({ indicators: e.target.checked })} />
            </label>
            <label className="wizard-toggle">
              <span>Slide Numbers</span>
              <input type="checkbox" checked={config.slideNumbers} onChange={(e) => updateConfig({ slideNumbers: e.target.checked })} />
            </label>
          </div>
          {config.indicators && (
            <div className="indicator-pos-picker">
              <span className="picker-label">Indicator Position</span>
              <PosGrid value={config.indicatorPos} onChange={(v) => updateConfig({ indicatorPos: v })} includeDefault={false} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
