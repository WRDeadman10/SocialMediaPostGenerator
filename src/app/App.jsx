import React from "react";
import { defaultConfig } from "../lib/constants.js";
import { downloadTemplate } from "../lib/excelTemplates.js";
import { createPostExporter } from "../lib/postExport.js";
import { validateProjectAssets as validateProjectAssetsLib } from "../lib/project.js";
import { defaultAssetUrlForPickerKind } from "../lib/assetKindDefaults.js";
import { slidesFor } from "../lib/slideHtml.js";
import { useImagePipeline } from "../hooks/useImagePipeline.js";
import { usePostGeneration } from "../hooks/usePostGeneration.js";
import { useProjectActions } from "../hooks/useProjectActions.js";
import { useProjectPersistence } from "../hooks/useProjectPersistence.js";
import { useSfx } from "../hooks/useSfx.js";
import { AppSidebar } from "../components/layout/AppSidebar.jsx";
import { PostGrid } from "../components/PostGrid.jsx";
import { AssetPickerModal } from "../components/modals/AssetPickerModal.jsx";
import { EditModal } from "../components/modals/EditModal.jsx";
import { NewProjectModal } from "../components/modals/NewProjectModal.jsx";
import { FirstRunChecklist } from "../components/FirstRunChecklist.jsx";

export const App = () => {
  const [config, setConfig] = React.useState(defaultConfig);
  const [rows, setRows] = React.useState([]);
  const [generated, setGenerated] = React.useState({});
  const [visible, setVisible] = React.useState({});
  const [projects, setProjects] = React.useState({});
  const [activeProjectId, setActiveProjectId] = React.useState("");
  const [assetDefaults, setAssetDefaults] = React.useState({});
  const [hydrated, setHydrated] = React.useState(false);
  const [editing, setEditing] = React.useState(null);
  const [toast, setToast] = React.useState("");
  const [toastTone, setToastTone] = React.useState("info");
  const [toastAction, setToastAction] = React.useState(null);
  const [showNewProjectModal, setShowNewProjectModal] = React.useState(false);
  const [creatingProject, setCreatingProject] = React.useState(false);
  const [animateSeed, setAnimateSeed] = React.useState(0);
  const [generateBusy, setGenerateBusy] = React.useState(false);
  const [genProgress, setGenProgress] = React.useState({ current: 0, total: 0 });
  const [exportBaseName, setExportBaseName] = React.useState("social_post");
  const [exportZipName, setExportZipName] = React.useState("social_posts");
  const renderRef = React.useRef(null);
  const toastTimerRef = React.useRef(null);

  const showToast = React.useCallback((input) => {
    const message = typeof input === "string" ? input : String(input?.message || "");
    const tone = typeof input === "object" && input?.tone ? String(input.tone) : "info";
    const actionLabel = typeof input === "object" && input?.actionLabel ? String(input.actionLabel) : "";
    const onAction = typeof input === "object" ? input.onAction : null;

    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    setToast(message);
    setToastTone(tone);
    setToastAction(actionLabel && typeof onAction === "function" ? { label: actionLabel, onClick: onAction } : null);

    toastTimerRef.current = window.setTimeout(() => {
      setToast("");
      setToastTone("info");
      setToastAction(null);
      toastTimerRef.current = null;
    }, 5200);
  }, []);

  const validateProjectAssets = React.useCallback((project) => {
    validateProjectAssetsLib(project, showToast);
  }, [showToast]);

  const { play: playSfx, muted: sfxMuted, setMuted: setSfxMuted } = useSfx();

  const {
    imagePicker,
    setImagePicker,
    pickerAssets,
    pickerPage,
    setPickerPage,
    pickerTotal,
    pickerHasMore,
    pickerHasPrev,
    pickerLoading,
    pickerSearch,
    setPickerSearch,
    pickerProjectOnly,
    setPickerProjectOnly,
    handlePrefetchNext,
    uploadLoading,
    busyDefaultAssetId,
    pickerUploadRef,
    mergeClientConfigWithDefaults,
    mergeClientRowsWithDefaults,
    handleOpenImagePicker,
    handlePickerUpload,
    handleSetDefaultAsset,
    setConfigImage,
  } = useImagePipeline({
    activeProjectId,
    assetDefaults,
    setAssetDefaults,
    config,
    setConfig,
    rows,
    setRows,
    setGenerated,
    setProjects,
    setVisible,
    showToast,
  });

  useProjectPersistence({
    config,
    rows,
    generated,
    visible,
    projects,
    setProjects,
    activeProjectId,
    setActiveProjectId,
    setAssetDefaults,
    hydrated,
    setHydrated,
    setConfig,
    setRows,
    setGenerated,
    setVisible,
    validateProjectAssets,
    showToast,
  });

  const { createNewProject, handleUpload, loadProject } = useProjectActions({
    activeProjectId,
    projects,
    setProjects,
    setActiveProjectId,
    setAssetDefaults,
    setRows,
    setGenerated,
    setVisible,
    setConfig,
    setCreatingProject,
    setShowNewProjectModal,
    showToast,
    validateProjectAssets,
  });

  const { generateAll, applyEdit, onGeneratedCountSfx } = usePostGeneration({
    rows,
    config,
    setRows,
    setConfig,
    setGenerated,
    setEditing,
    setAnimateSeed,
    playSfx,
    showToast,
    hydrated,
    editing,
    setGenerateBusy,
    setGenProgress,
  });

  React.useEffect(() => {
    onGeneratedCountSfx(generated);
  }, [generated, onGeneratedCountSfx]);

  const { downloadPost, downloadZip } = React.useMemo(() => createPostExporter(renderRef), []);

  React.useEffect(() => {
    document.documentElement.dataset.theme = config.theme;
  }, [config.theme]);

  const updateConfig = React.useCallback((patch) => {
    setConfig((prev) => ({ ...prev, ...patch }));
  }, []);

  const updateBar = React.useCallback((index, patch) => {
    setConfig((prev) => ({ ...prev, bars: prev.bars.map((bar, i) => (i === index ? { ...bar, ...patch } : bar)) }));
  }, []);

  const stats = React.useMemo(() => ({
    total: rows.length,
    done: Object.keys(generated).length,
    pending: Math.max(rows.length - Object.keys(generated).length, 0),
  }), [generated, rows.length]);

  const activeProject = projects[activeProjectId];

  const hasBranding = React.useMemo(() => (
    !!(config.bgDataUrl && String(config.bgDataUrl).trim() && config.logoDataUrl && String(config.logoDataUrl).trim())
  ), [config.bgDataUrl, config.logoDataUrl]);

  const missingBrandingBits = React.useMemo(() => {
    const missing = [];
    if (!config.bgDataUrl || !String(config.bgDataUrl).trim()) missing.push("background");
    if (!config.logoDataUrl || !String(config.logoDataUrl).trim()) missing.push("logo");
    if (String(config.postType || "").toLowerCase().includes("carousel")) {
      if (!config.lastLogoDataUrl || !String(config.lastLogoDataUrl).trim()) missing.push("last slide logo");
    }
    return missing;
  }, [config.bgDataUrl, config.logoDataUrl, config.lastLogoDataUrl, config.postType]);

  const handleGenerateAll = React.useCallback(async () => {
    if (!rows.length) return;
    if (missingBrandingBits.length) {
      const ok = window.confirm(
        `Missing branding: ${missingBrandingBits.join(", ")}.\n\nGenerate anyway? (You can still edit later.)`,
      );
      if (!ok) return;
    }
    await generateAll();
  }, [generateAll, missingBrandingBits, rows.length]);

  const handleSaveEdit = React.useCallback((draft, localConfig) => {
    if (editing == null) return;
    const index = editing.index;
    const snapshot = {
      rows: rows.map((r) => ({ ...r })),
      config: { ...config },
      generated: { ...generated },
    };

    applyEdit(draft, localConfig);

    showToast({
      message: "Changes applied",
      tone: "success",
      actionLabel: "Undo",
      onAction: () => {
        setRows(snapshot.rows);
        setConfig(snapshot.config);
        setGenerated(snapshot.generated);
        showToast({ message: "Restored previous version", tone: "info" });
      },
    });
  }, [applyEdit, config, editing, generated, rows, showToast]);

  const handleApplyBrandingDefaults = React.useCallback(() => {
    const next = mergeClientConfigWithDefaults({ ...config });
    updateConfig({
      bgDataUrl: next.bgDataUrl,
      logoDataUrl: next.logoDataUrl,
      lastLogoDataUrl: next.lastLogoDataUrl,
    });
    showToast({ message: "Branding fields filled from defaults (where empty)", tone: "success" });
  }, [config, mergeClientConfigWithDefaults, showToast, updateConfig]);

  const handleResetBrandingOverrides = React.useCallback(() => {
    updateConfig({ bgDataUrl: "", logoDataUrl: "", lastLogoDataUrl: "" });
    showToast({ message: "Cleared branding image overrides for this project", tone: "info" });
  }, [showToast, updateConfig]);

  return (
    <div className="shell">
      <header>
        <div className="brand"><div className="brand-icon">✦</div><div><b>Post Generator</b><span>VIITORCLOUD</span></div></div>
        <button
          type="button"
          className="theme-btn"
          onClick={() => setSfxMuted(!sfxMuted)}
          aria-pressed={!sfxMuted}
          aria-label={sfxMuted ? "Unmute interface sounds" : "Mute interface sounds"}
          title={sfxMuted ? "Sound off" : "Sound on"}
        >
          {sfxMuted ? "🔇" : "🔊"}
        </button>
        <button type="button" className="theme-btn" onClick={() => updateConfig({ theme: config.theme === "dark" ? "light" : "dark" })}>{config.theme === "dark" ? "☀" : "☾"}</button>
      </header>
      <div className="app">
        <AppSidebar
          projects={projects}
          activeProjectId={activeProjectId}
          loadProject={loadProject}
          setShowNewProjectModal={setShowNewProjectModal}
          activeProject={activeProject}
          rows={rows}
          config={config}
          updateConfig={updateConfig}
          updateBar={updateBar}
          handleUpload={handleUpload}
          downloadTemplate={downloadTemplate}
          stats={stats}
          generated={generated}
          uploadLoading={uploadLoading}
          mergeClientConfigWithDefaults={mergeClientConfigWithDefaults}
          handleOpenImagePicker={handleOpenImagePicker}
          setConfigImage={setConfigImage}
          onGenerateAll={handleGenerateAll}
          generateBusy={generateBusy}
          downloadZip={() => downloadZip(generated, { baseName: exportBaseName, zipName: exportZipName })}
          onApplyBrandingDefaults={handleApplyBrandingDefaults}
          onResetBrandingOverrides={handleResetBrandingOverrides}
        />
        <main>
          <div className="main-head">
            <div>
              <h2>Generated Posts</h2>
              <p>{activeProjectId ? `Project: ${activeProject?.name} · ${rows.length} posts ready` : "No project selected"}</p>
              {generateBusy && genProgress.total ? (
                <p className="gen-progress" aria-live="polite">
                  Generating {genProgress.current}/{genProgress.total}…
                </p>
              ) : null}
            </div>
            <div className="actions">
              <button type="button" onClick={handleGenerateAll} disabled={!rows.length || generateBusy}>
                {generateBusy ? "Generating…" : "Generate All Posts"}
              </button>
              <button type="button" onClick={() => downloadZip(generated, { baseName: exportBaseName, zipName: exportZipName })} disabled={!Object.keys(generated).length}>
                Download All as ZIP
              </button>
            </div>
          </div>

          <div className="export-row" aria-label="Export naming">
            <label className="export-field">
              <span>PNG prefix</span>
              <input value={exportBaseName} onChange={(e) => setExportBaseName(e.target.value)} />
            </label>
            <label className="export-field">
              <span>ZIP name</span>
              <input value={exportZipName} onChange={(e) => setExportZipName(e.target.value)} />
            </label>
          </div>

          <FirstRunChecklist
            hydrated={hydrated}
            activeProjectId={activeProjectId}
            rowsLength={rows.length}
            hasBranding={hasBranding}
            generatedCount={Object.keys(generated).length}
          />

          <PostGrid
            animateSeed={animateSeed}
            generated={generated}
            visible={visible}
            setVisible={setVisible}
            onDownload={(idx, opts) => downloadPost(generated, idx, { ...opts, baseName: exportBaseName })}
            onEdit={(index) => setEditing({ index, row: generated[String(index)]?.rowData })}
            uploadLoading={uploadLoading}
            virtualize
            onOpenFirstSlideImage={(index) => handleOpenImagePicker({
              title: `First slide image · Post #${index + 1}`,
              kind: `first-slide-${index + 1}`,
              mode: "row-first-slide",
              rowIndex: index,
              applyUrl: async (url, name) => {
                const nextRows = rows.map((row, i) => (i === index ? { ...row, firstSlideImage: url, firstSlideImageName: name || row.firstSlideImageName } : row));
                const merged = mergeClientRowsWithDefaults(nextRows);
                setRows(merged);
                setGenerated((prev) => ({
                  ...prev,
                  [index]: { ...prev[index], rowData: merged[index], slides: slidesFor(merged[index], config) },
                }));
              },
            })}
          />
        </main>
      </div>
      {editing && <EditModal row={editing.row} config={config} onClose={() => setEditing(null)} onSave={handleSaveEdit} />}
      {showNewProjectModal && <NewProjectModal onClose={() => setShowNewProjectModal(false)} onCreate={createNewProject} creating={creatingProject} />}
      {imagePicker && (
        <AssetPickerModal
          title={imagePicker.title}
          pickerKind={imagePicker.kind}
          projects={projects}
          activeProjectId={activeProjectId}
          assets={pickerAssets}
          loadingList={pickerLoading}
          loadingUpload={!!uploadLoading[`picker:${imagePicker.kind}`]}
          busyAssetId={busyDefaultAssetId}
          uploadInputRef={pickerUploadRef}
          defaultPreviewUrl={defaultAssetUrlForPickerKind(imagePicker.kind, assetDefaults)}
          page={pickerPage}
          pageSize={10}
          total={pickerTotal}
          hasMore={pickerHasMore}
          hasPrev={pickerHasPrev}
          onPageChange={setPickerPage}
          onPrefetchNext={handlePrefetchNext}
          search={pickerSearch}
          onSearchChange={setPickerSearch}
          projectOnly={pickerProjectOnly}
          onProjectOnlyChange={setPickerProjectOnly}
          onClose={() => setImagePicker(null)}
          onPick={async (asset) => {
            if (!asset?.url) return;
            await imagePicker.applyUrl(asset.url, asset.fileName);
            setImagePicker(null);
          }}
          onUploadClick={() => pickerUploadRef.current?.click()}
          onUploadFile={(file) => handlePickerUpload(file)}
          onSetDefault={(asset) => handleSetDefaultAsset(asset)}
        />
      )}
      <div ref={renderRef} className="render-area" />
      {toast && (
        <div
          className={`toast toast-${toastTone}`}
          role={toastTone === "error" ? "alert" : "status"}
          aria-live={toastTone === "error" ? "assertive" : "polite"}
          aria-atomic="true"
        >
          <div className="toast-row">
            <div className="toast-msg">{toast}</div>
            {toastAction ? (
              <button
                type="button"
                className="toast-action"
                onClick={() => {
                  toastAction.onClick?.();
                  if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
                  setToast("");
                  setToastAction(null);
                  setToastTone("info");
                }}
              >
                {toastAction.label}
              </button>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};
