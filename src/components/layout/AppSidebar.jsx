import { ImageBox } from "../ImageBox.jsx";
import {
  AlignOverride,
  Color,
  Field,
  FontWeight,
  GradientColor,
  Panel,
  PosGrid,
  Range,
  Stat,
} from "../ui/FormBits.jsx";

export const AppSidebar = ({
  projects,
  activeProjectId,
  loadProject,
  setShowNewProjectModal,
  activeProject,
  rows,
  config,
  updateConfig,
  updateBar,
  handleUpload,
  downloadTemplate,
  stats,
  generated,
  uploadLoading,
  mergeClientConfigWithDefaults,
  handleOpenImagePicker,
  setConfigImage,
  onGenerateAll,
  generateBusy,
  downloadZip,
  onApplyBrandingDefaults,
  onResetBrandingOverrides,
}) => (
  <aside className="sidebar">
    <Panel title="Project" defaultOpen>
      <Field label="Active project">
        <select value={activeProjectId} onChange={(e) => loadProject(e.target.value)}>
          <option value="">No project selected</option>
          {Object.values(projects).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt))).map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </Field>
      <button type="button" className="btn-primary" style={{ marginTop: 8 }} onClick={() => setShowNewProjectModal(true)}>+ New Project</button>
      <p className="hint">
        {activeProjectId
          ? `${activeProject?.rows?.length || rows.length} rows · ${activeProject?.sourceFileName || "No Excel loaded yet"}`
          : "Create a project, then upload an Excel file."}
      </p>
    </Panel>
    <Panel title="Post Type">
      <div className="seg">
        <button type="button" className={config.postType === "single" ? "active" : ""} onClick={() => updateConfig({ postType: "single" })}>Single Post</button>
        <button type="button" className={config.postType === "carousel" ? "active" : ""} onClick={() => updateConfig({ postType: "carousel" })}>Carousel</button>
      </div>
    </Panel>
    <Panel title="Upload Excel">
      {!activeProjectId && <p className="hint" style={{ marginBottom: 8 }}>Create a project first before uploading Excel.</p>}
      <label className={`drop ${rows.length ? "has-file" : ""} ${!activeProjectId ? "disabled" : ""}`}>
        <input hidden type="file" accept=".xlsx,.xls,.csv" disabled={!activeProjectId} onChange={(e) => handleUpload(e.target.files[0])} />
        <strong>Click to upload</strong>
        <small>{config.postType === "carousel" ? "post_type · slide1_title · ... · slide6_title · cta_text" : "post_type · title · paragraph · cta_text"}</small>
        <em>{rows.length ? `${rows.length} rows loaded` : "or drag & drop"}</em>
      </label>
      <div className="tpls">
        <button type="button" onClick={() => downloadTemplate("single")}>Single Template</button>
        <button type="button" onClick={() => downloadTemplate("carousel")}>Carousel Template</button>
      </div>
    </Panel>
    <Panel title="Branding quick actions" defaultOpen={false}>
      <p className="hint" style={{ marginBottom: 8 }}>
        Apply your saved defaults to this project’s config, or clear overrides to fall back to defaults / solid colors.
      </p>
      <div className="two" style={{ marginBottom: 8 }}>
        <button type="button" className="btn-secondary" onClick={onApplyBrandingDefaults}>Fill from defaults</button>
        <button type="button" className="btn-secondary" onClick={onResetBrandingOverrides}>Clear overrides</button>
      </div>
      <p className="hint">Defaults are edited from the image picker’s <b>Default</b> action.</p>
    </Panel>
    <Panel title="Progress">
      <div className="stats">
        <Stat label="Total" value={stats.total} /><Stat label="Done" value={stats.done} /><Stat label="Pending" value={stats.pending} /><Stat label="Error" value={0} />
      </div>
      <div className="bar"><span style={{ width: `${stats.total ? stats.done / stats.total * 100 : 0}%` }} /></div>
    </Panel>
    <Panel title="Background">
      <ImageBox
        label="Background image"
        value={config.bgDataUrl}
        busy={!!uploadLoading["sidebar:background"]}
        onOpen={() => handleOpenImagePicker({
          title: "Background image",
          kind: "background",
          mode: "config",
          applyUrl: async (url) => {
            const next = mergeClientConfigWithDefaults({ ...config, bgDataUrl: url });
            updateConfig({ bgDataUrl: next.bgDataUrl });
          },
        })}
        onFile={(file) => setConfigImage("bgDataUrl", "background", file)}
        onClear={() => updateConfig({ bgDataUrl: "" })}
      />
      <Field label="Fallback Color"><input type="color" value={config.bgColor} onChange={(e) => updateConfig({ bgColor: e.target.value })} /></Field>
    </Panel>
    <Panel title="Logo">
      <ImageBox
        label="Logo"
        value={config.logoDataUrl}
        busy={!!uploadLoading["sidebar:logo"]}
        onOpen={() => handleOpenImagePicker({
          title: "Logo",
          kind: "logo",
          mode: "config",
          applyUrl: async (url) => {
            const next = mergeClientConfigWithDefaults({ ...config, logoDataUrl: url });
            updateConfig({ logoDataUrl: next.logoDataUrl });
          },
        })}
        onFile={(file) => setConfigImage("logoDataUrl", "logo", file)}
        onClear={() => updateConfig({ logoDataUrl: "" })}
      />
      <Range label="Logo H" value={config.logoH} min="20" max="200" onChange={(v) => updateConfig({ logoH: v })} />
    </Panel>
    <Panel title="Domain">
      <Field label="Domain text (optional)"><input value={config.domain} placeholder="e.g. VIITORCLOUD.COM" onChange={(e) => updateConfig({ domain: e.target.value })} /></Field>
      <Color label="Domain color" value={config.domainColor} onChange={(v) => updateConfig({ domainColor: v })} />
      <p className="hint">X:80px · bottom:80px</p>
    </Panel>
    <Panel title="Typography">
      <FontWeight label="Title" font={config.fontTitle} weight={config.wtTitle} onFont={(v) => updateConfig({ fontTitle: v })} onWeight={(v) => updateConfig({ wtTitle: v })} />
      <FontWeight label="Paragraph" font={config.fontPara} weight={config.wtPara} onFont={(v) => updateConfig({ fontPara: v })} onWeight={(v) => updateConfig({ wtPara: v })} />
      <FontWeight label="CTA" font={config.fontCta} weight={config.wtCta} onFont={(v) => updateConfig({ fontCta: v })} onWeight={(v) => updateConfig({ wtCta: v })} />
    </Panel>
    <Panel title="Colors">
      <GradientColor label="Title Color" enabled={config.titleGrad} solid={config.titleColor} g1={config.titleG1} g2={config.titleG2} onToggle={(v) => updateConfig({ titleGrad: v })} onSolid={(v) => updateConfig({ titleColor: v })} onG1={(v) => updateConfig({ titleG1: v })} onG2={(v) => updateConfig({ titleG2: v })} />
      <div className="color-grid">
        <Color label="Paragraph" value={config.paraColor} onChange={(v) => updateConfig({ paraColor: v })} />
        <Color label="CTA Text" value={config.ctaTxt} onChange={(v) => updateConfig({ ctaTxt: v })} />
      </div>
      <GradientColor label="CTA Background" enabled={config.ctaGrad} solid={config.ctaBg} g1={config.ctaG1} g2={config.ctaG2} onToggle={(v) => updateConfig({ ctaGrad: v })} onSolid={(v) => updateConfig({ ctaBg: v })} onG1={(v) => updateConfig({ ctaG1: v })} onG2={(v) => updateConfig({ ctaG2: v })} />
      <label className="toggle-row"><span>Text Highlight BG</span><input type="checkbox" checked={config.highlight} onChange={(e) => updateConfig({ highlight: e.target.checked })} /></label>
      {config.highlight && <Color label="Highlight Color" value={config.highlightColor} onChange={(v) => updateConfig({ highlightColor: v })} />}
    </Panel>
    <Panel title="Decorative Bars">
      <div className="seg">
        <button type="button" className={config.barMode === "stack" ? "active" : ""} onClick={() => updateConfig({ barMode: "stack" })}>Stacked</button>
        <button type="button" className={config.barMode === "side" ? "active" : ""} onClick={() => updateConfig({ barMode: "side" })}>Side by Side</button>
      </div>
      {config.bars.map((bar, i) => (
        <div className="bar-row" key={i}>
          <input type="checkbox" checked={bar.enabled} onChange={(e) => updateBar(i, { enabled: e.target.checked })} />
          <input type="color" value={bar.color} onChange={(e) => updateBar(i, { color: e.target.value })} />
          <input type="number" value={bar.height} onChange={(e) => updateBar(i, { height: Number(e.target.value) })} />
          <input type="number" value={bar.weight} onChange={(e) => updateBar(i, { weight: Number(e.target.value) })} />
        </div>
      ))}
    </Panel>
    <Panel title="Alignment">
      <div className="seg three">{["left", "center", "right"].map((v) => (
        <button type="button" key={v} className={config.hAlign === v ? "active" : ""} onClick={() => updateConfig({ hAlign: v })}>{v}</button>
      ))}</div>
      <div className="seg three">{["top", "middle", "bottom"].map((v) => (
        <button type="button" key={v} className={config.vAlign === v ? "active" : ""} onClick={() => updateConfig({ vAlign: v })}>{v}</button>
      ))}</div>
    </Panel>
    <Panel title="Sizing & Spacing">
      <Range label="Title Size" value={config.titleSize} min="28" max="80" onChange={(v) => updateConfig({ titleSize: v })} />
      <Range label="Para Size" value={config.paraSize} min="14" max="32" onChange={(v) => updateConfig({ paraSize: v })} />
      <Range label="CTA Size" value={config.ctaSize} min="13" max="32" onChange={(v) => updateConfig({ ctaSize: v })} />
      <Range label="Content W" value={config.contentWidth} min="200" max="800" onChange={(v) => updateConfig({ contentWidth: v })} />
      <p className="hint">Max width for title and paragraph</p>
      <Range label="T to P Gap" value={config.gapTP} min="8" max="80" onChange={(v) => updateConfig({ gapTP: v })} />
      <Range label="P to CTA Gap" value={config.gapPC} min="8" max="80" onChange={(v) => updateConfig({ gapPC: v })} />
    </Panel>
    {config.postType === "carousel" && (
      <Panel title="Last Slide Logo">
        <p className="hint">Override logo specifically for the last carousel slide.</p>
        <ImageBox
          label="Last slide logo"
          value={config.lastLogoDataUrl}
          busy={!!uploadLoading["sidebar:last-slide-logo"]}
          onOpen={() => handleOpenImagePicker({
            title: "Last slide logo",
            kind: "last-slide-logo",
            mode: "config",
            applyUrl: async (url) => {
              const next = mergeClientConfigWithDefaults({ ...config, lastLogoDataUrl: url });
              updateConfig({ lastLogoDataUrl: next.lastLogoDataUrl });
            },
          })}
          onFile={(file) => setConfigImage("lastLogoDataUrl", "last-slide-logo", file)}
          onClear={() => updateConfig({ lastLogoDataUrl: "" })}
        />
        <Range label="Logo H" value={config.lastLogoH} min="20" max="200" onChange={(v) => updateConfig({ lastLogoH: v })} />
        <div className="two">
          <Field label="X pos"><input type="number" value={config.lastLogoX} min="0" max="700" onChange={(e) => updateConfig({ lastLogoX: Number(e.target.value) })} /></Field>
          <Field label="Y pos"><input type="number" value={config.lastLogoY} min="0" max="900" onChange={(e) => updateConfig({ lastLogoY: Number(e.target.value) })} /></Field>
        </div>
      </Panel>
    )}
    {config.postType === "carousel" && (
      <Panel title="Carousel Features">
        <label className="toggle-row"><span>Slide Indicator</span><input type="checkbox" checked={config.indicators} onChange={(e) => updateConfig({ indicators: e.target.checked })} /></label>
        {config.indicators && <PosGrid value={config.indicatorPos} onChange={(v) => updateConfig({ indicatorPos: v })} includeDefault={false} />}
        <label className="toggle-row"><span>Slide Numbering <small>(Slides 2-5 only)</small></span><input type="checkbox" checked={config.slideNumbers} onChange={(e) => updateConfig({ slideNumbers: e.target.checked })} /></label>
        <p className="hint">Shows 01, 02, 03, 04 on mid slides</p>
        <Field label="Alignment Scope">
          <div className="seg three">
            {["all", "first", "last"].map((v) => (
              <button type="button" key={v} className={config.alignScope === v ? "active" : ""} onClick={() => updateConfig({ alignScope: v })}>
                {v === "all" ? "All Slides" : v === "first" ? "Slide 1" : "CTA Slide"}
              </button>
            ))}
          </div>
        </Field>
        {config.alignScope === "first" && <AlignOverride title="Slide 1 Alignment" h={config.slide1HAlign} v={config.slide1VAlign} onH={(v) => updateConfig({ slide1HAlign: v })} onV={(v) => updateConfig({ slide1VAlign: v })} />}
        {config.alignScope === "last" && <AlignOverride title="CTA Slide Alignment" h={config.ctaHAlign} v={config.ctaVAlign} onH={(v) => updateConfig({ ctaHAlign: v })} onV={(v) => updateConfig({ ctaVAlign: v })} />}
        <Field label="CTA Slide Domain Position"><PosGrid value={config.ctaDomainPos} onChange={(v) => updateConfig({ ctaDomainPos: v })} includeDefault /></Field>
      </Panel>
    )}
    <Panel title="Actions">
      <button type="button" className="btn-primary" onClick={onGenerateAll} disabled={!rows.length || !!generateBusy}>
        {generateBusy ? "Generating…" : "Generate All Posts"}
      </button>
      <button type="button" className="btn-secondary" onClick={downloadZip} disabled={!Object.keys(generated).length}>Download All as ZIP</button>
    </Panel>
  </aside>
);
