import React from "react";

export const StepBasics = ({ data, updateData, updateConfig }) => {
  const presets = [
    { id: "linkedin", name: "LinkedIn Carousel", ratio: "4:5", type: "carousel" },
    { id: "insta-post", name: "Instagram Post", ratio: "1:1", type: "single" },
    { id: "insta-story", name: "Instagram Story", ratio: "9:16", type: "single" },
    { id: "twitter", name: "Twitter/X Post", ratio: "16:9", type: "single" },
  ];

  return (
    <div className="wizard-step-basics">
      <div className="wizard-form-group">
        <label>Project Name</label>
        <input 
          type="text" 
          placeholder="e.g. Summer Campaign 2024"
          value={data.name}
          onChange={(e) => updateData({ name: e.target.value })}
        />
      </div>

      <div className="wizard-form-group">
        <label>Platform Preset</label>
        <div className="preset-grid">
          {presets.map((p) => (
            <button
              key={p.id}
              className={`preset-card ${data.config.postType === p.type ? "active" : ""}`}
              onClick={() => updateConfig({ postType: p.type })}
            >
              <div className="preset-icon">📱</div>
              <div className="preset-info">
                <span className="preset-name">{p.name}</span>
                <span className="preset-ratio">{p.ratio}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="wizard-form-row">
        <div className="wizard-form-group">
          <label>Post Type</label>
          <select 
            value={data.config.postType} 
            onChange={(e) => updateConfig({ postType: e.target.value })}
          >
            <option value="single">Single Post</option>
            <option value="carousel">Carousel</option>
          </select>
        </div>
        
        <div className="wizard-form-group">
          <label>Aspect Ratio</label>
          <select defaultValue="4:5">
            <option value="1:1">Square (1:1)</option>
            <option value="4:5">Portrait (4:5)</option>
            <option value="16:9">Landscape (16:9)</option>
            <option value="9:16">Story (9:16)</option>
          </select>
        </div>
      </div>
    </div>
  );
};
