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
import { AppShell } from "../components/layout/AppShell.jsx";
import { ConfigWorkspace } from "../components/config/ConfigWorkspace.jsx";
import { OutputPanel } from "../components/output/OutputPanel.jsx";
import { CanvasEditor } from "../components/canvas/CanvasEditor.jsx";
import { InlineTextEditor } from "../components/canvas/InlineTextEditor.jsx";
import { TopStepper } from "../components/workflow/TopStepper.jsx";
import { AssetPickerModal } from "../components/modals/AssetPickerModal.jsx";
import { EditModal } from "../components/modals/EditModal.jsx";
import { NewProjectModal } from "../components/modals/NewProjectModal.jsx";
import { CLIWarningModal } from "../components/modals/CLIWarningModal.jsx";
import { FirstRunChecklist } from "../components/FirstRunChecklist.jsx";
import { getWizardStatus } from "../lib/validation.js";
import { detectCLIs, wasWarningDismissed, dismissWarning } from "../lib/cliService.js";
import { AnimatePresence, motion } from "framer-motion";
import { toastVariants } from "../motion/variants.js";

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
  const [exportFormat, setExportFormat] = React.useState("png");
  const [activePostIndex, setActivePostIndex] = React.useState(null);
  const [activeSlideIndex, setActiveSlideIndex] = React.useState(0);
  const [inlineSelection, setInlineSelection] = React.useState(null);
  const [inlineDraft, setInlineDraft] = React.useState("");
  const [wizardStep, setWizardStep] = React.useState("upload");
  const [leftOpen, setLeftOpen] = React.useState(true);
  const [rightOpen, setRightOpen] = React.useState(true);
  const [cliStatus, setCliStatus] = React.useState([]);
  const [showCliWarning, setShowCliWarning] = React.useState(false);
  const renderRef = React.useRef(null);
  const toastTimerRef = React.useRef(null);

  // Detect CLI tools on mount
  React.useEffect(() => {
    detectCLIs().then((status) => {
      setCliStatus(status);
      const anyMissing = status.some((c) => !c.available);
      if (anyMissing && !wasWarningDismissed()) {
        setShowCliWarning(true);
      }
    });
  }, []);

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
  const activePost = React.useMemo(() => {
    if (activePostIndex == null) return null;
    return generated[String(activePostIndex)] || null;
  }, [activePostIndex, generated]);

  React.useEffect(() => {
    // When a project loads (or Excel is already loaded) and we already have generated posts,
    // default to Post 1 / Slide 1 so the canvas isn't empty.
    const keys = Object.keys(generated || {});
    if (!keys.length) return;
    const firstIndex = Math.min(...keys.map((k) => Number(k)).filter((n) => Number.isFinite(n)));
    if (!Number.isFinite(firstIndex)) return;

    setActivePostIndex((prev) => {
      if (prev == null) return firstIndex;
      if (!generated[String(prev)]) return firstIndex;
      return prev;
    });
  }, [generated]);

  React.useEffect(() => {
    setActiveSlideIndex(0);
    setInlineSelection(null);
  }, [activePostIndex]);

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

  const wizard = React.useMemo(() => getWizardStatus({
    activeProjectId,
    rows,
    config,
    generated,
  }), [activeProjectId, config, generated, rows]);

  React.useEffect(() => {
    setWizardStep(wizard.currentStepId);
  }, [wizard.currentStepId]);

  const handleInlineEditRequest = React.useCallback((selection) => {
    if (!selection) return;
    setInlineSelection(selection);
    setInlineDraft(selection.currentValue || "");
  }, []);

  const commitInlineEdit = React.useCallback(() => {
    if (!inlineSelection) return;
    const nextValue = inlineDraft;
    if (inlineSelection.kind === "config") {
      updateConfig({ [inlineSelection.field]: nextValue });
      showToast({ message: "Updated config", tone: "success" });
      setInlineSelection(null);
      return;
    }
    if (inlineSelection.kind === "row") {
      const idx = inlineSelection.postIndex;
      if (idx == null) return;
      setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [inlineSelection.field]: nextValue } : r)));
      setGenerated((prev) => {
        const existing = prev[idx];
        if (!existing) return prev;
        const row = { ...(existing.rowData || {}), [inlineSelection.field]: nextValue };
        return {
          ...prev,
          [idx]: { ...existing, rowData: row, slides: slidesFor(row, config) },
        };
      });
      showToast({ message: "Updated text", tone: "success" });
      setInlineSelection(null);
    }
  }, [config, inlineDraft, inlineSelection, setGenerated, setRows, showToast, updateConfig]);

  const handleCanvasOpenEdit = React.useCallback(() => {
    if (activePostIndex == null) return;
    const row = rows[activePostIndex];
    if (!row) return;
    setEditing({ index: activePostIndex, row: mergeClientRowsWithDefaults([row])[0] });
  }, [activePostIndex, mergeClientRowsWithDefaults, rows]);

  const handleCanvasOpenFirstSlideImage = React.useCallback(() => {
    if (activePostIndex == null) return;
    if (String(config.postType || "").toLowerCase().trim() !== "carousel") return;

    handleOpenImagePicker({
      title: "First slide image",
      kind: `first-slide-${activePostIndex + 1}`,
      mode: "row",
      applyUrl: async (url, fileName) => {
        const nextRows = rows.map((row, i) => (
          i === activePostIndex
            ? { ...row, firstSlideImage: url, firstSlideImageName: fileName || row.firstSlideImageName || "image" }
            : row
        ));
        const merged = mergeClientRowsWithDefaults(nextRows);
        setRows(merged);
        setGenerated((prev) => ({
          ...prev,
          [activePostIndex]: { ...prev[activePostIndex], rowData: merged[activePostIndex], slides: slidesFor(merged[activePostIndex], config) },
        }));
        showToast({ message: "First slide image updated", tone: "success" });
      },
    });
  }, [activePostIndex, config, handleOpenImagePicker, mergeClientRowsWithDefaults, rows, setGenerated, setRows, showToast]);

  const handleExportSelectedSlides = React.useCallback(async (slideIndices) => {
    if (activePostIndex == null) return;
    const uniq = Array.from(new Set(slideIndices || [])).filter((n) => Number.isFinite(Number(n)));
    if (!uniq.length) return;
    for (const i of uniq) {
      // eslint-disable-next-line no-await-in-loop
      await downloadPost(generated, activePostIndex, { onlySlide: Number(i), baseName: exportBaseName, format: exportFormat });
    }
    showToast({ message: `Exported ${uniq.length} slide(s)`, tone: "success" });
  }, [activePostIndex, downloadPost, exportBaseName, exportFormat, generated, showToast]);

  return (
    <div className="shell">
      <AppShell
        top={(
          <>
            <div className="brand">
              <div className="brand-icon">✦</div>
              <div><b>Post Generator</b><span>VIITORCLOUD</span></div>
            </div>
            <TopStepper
              status={wizard}
              onSelectStep={(id) => setWizardStep(id)}
            />
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button
                type="button"
                className="theme-btn"
                onClick={() => setLeftOpen((v) => !v)}
                aria-pressed={leftOpen}
                aria-label={leftOpen ? "Collapse left panel" : "Expand left panel"}
                title={leftOpen ? "Collapse left panel" : "Expand left panel"}
              >
                ⟨
              </button>
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
              <button
                type="button"
                className="theme-btn"
                onClick={() => updateConfig({ theme: config.theme === "dark" ? "light" : "dark" })}
                aria-label="Toggle theme"
              >
                {config.theme === "dark" ? "☀" : "☾"}
              </button>
              <button
                type="button"
                className="theme-btn"
                onClick={() => setRightOpen((v) => !v)}
                aria-pressed={rightOpen}
                aria-label={rightOpen ? "Collapse right panel" : "Expand right panel"}
                title={rightOpen ? "Collapse right panel" : "Expand right panel"}
              >
                ⟩
              </button>
            </div>
          </>
        )}
        leftOpen={leftOpen}
        rightOpen={rightOpen}
        left={(
          <ConfigWorkspace
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
        )}
        center={(
          <div style={{ height: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}>
            <FirstRunChecklist
              hydrated={hydrated}
              activeProjectId={activeProjectId}
              rowsLength={rows.length}
              hasBranding={hasBranding}
              generatedCount={Object.keys(generated).length}
            />
            <CanvasEditor
              activeProjectId={activeProjectId}
              activePostIndex={activePostIndex}
              activeSlideIndex={activeSlideIndex}
              setActiveSlideIndex={setActiveSlideIndex}
              post={activePost}
              uploadLoading={uploadLoading}
              onInlineEditRequest={handleInlineEditRequest}
              onOpenEdit={handleCanvasOpenEdit}
              onOpenFirstSlideImage={handleCanvasOpenFirstSlideImage}
            />
          </div>
        )}
        right={(
          <OutputPanel
            activeProjectId={activeProjectId}
            activeProjectName={activeProject?.name || ""}
            rowsCount={rows.length}
            generated={generated}
            selectedPostIndex={activePostIndex}
            onSelectPost={(i) => setActivePostIndex(i)}
            generateBusy={generateBusy}
            genProgress={genProgress}
            exportBaseName={exportBaseName}
            setExportBaseName={setExportBaseName}
            exportZipName={exportZipName}
            setExportZipName={setExportZipName}
            exportFormat={exportFormat}
            setExportFormat={setExportFormat}
            onGenerateAll={handleGenerateAll}
            onDownloadZip={() => downloadZip(generated, { baseName: exportBaseName, zipName: exportZipName, format: exportFormat })}
            onExportSelectedSlides={handleExportSelectedSlides}
          />
        )}
      />
      {inlineSelection ? (
        <InlineTextEditor
          selection={inlineSelection}
          value={inlineDraft}
          onChange={setInlineDraft}
          onCancel={() => setInlineSelection(null)}
          onCommit={commitInlineEdit}
        />
      ) : null}
      {editing && <EditModal row={editing.row} config={config} onClose={() => setEditing(null)} onSave={handleSaveEdit} />}
      {showNewProjectModal && <NewProjectModal onClose={() => setShowNewProjectModal(false)} onCreate={createNewProject} creating={creatingProject} />}
      {showCliWarning && (
        <CLIWarningModal
          cliStatus={cliStatus}
          onDismiss={() => {
            setShowCliWarning(false);
            dismissWarning();
          }}
        />
      )}
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
          cliStatus={cliStatus}
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
      <AnimatePresence mode="wait" initial={false}>
        {toast ? (
          <motion.div
            key="toast"
            className={`toast toast-${toastTone}`}
            role={toastTone === "error" ? "alert" : "status"}
            aria-live={toastTone === "error" ? "assertive" : "polite"}
            aria-atomic="true"
            variants={toastVariants}
            initial="initial"
            animate="animate"
            exit="exit"
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
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};
