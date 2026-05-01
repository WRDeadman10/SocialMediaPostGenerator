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
  const [showNewProjectModal, setShowNewProjectModal] = React.useState(false);
  const [creatingProject, setCreatingProject] = React.useState(false);
  const [animateSeed, setAnimateSeed] = React.useState(0);
  const renderRef = React.useRef(null);

  const showToast = React.useCallback((message) => {
    setToast(message);
    setTimeout(() => setToast(""), 2600);
  }, []);

  const validateProjectAssets = React.useCallback((project) => {
    validateProjectAssetsLib(project, showToast);
  }, [showToast]);

  const playSfx = useSfx();

  const {
    imagePicker,
    setImagePicker,
    pickerAssets,
    pickerPage,
    setPickerPage,
    pickerTotal,
    pickerHasMore,
    pickerLoading,
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

  return (
    <div className="shell">
      <header>
        <div className="brand"><div className="brand-icon">✦</div><div><b>Post Generator</b><span>VIITORCLOUD</span></div></div>
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
          generateAll={generateAll}
          downloadZip={() => downloadZip(generated)}
        />
        <main>
          <div className="main-head">
            <div>
              <h2>Generated Posts</h2>
              <p>{activeProjectId ? `Project: ${activeProject?.name} · ${rows.length} posts ready` : "No project selected"}</p>
            </div>
            <div className="actions">
              <button type="button" onClick={generateAll} disabled={!rows.length}>Generate All Posts</button>
              <button type="button" onClick={() => downloadZip(generated)} disabled={!Object.keys(generated).length}>Download All as ZIP</button>
            </div>
          </div>
          <PostGrid
            animateSeed={animateSeed}
            generated={generated}
            visible={visible}
            setVisible={setVisible}
            onDownload={(idx) => downloadPost(generated, idx)}
            onEdit={(index) => setEditing({ index, row: generated[String(index)]?.rowData })}
            uploadLoading={uploadLoading}
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
      {editing && <EditModal row={editing.row} config={config} onClose={() => setEditing(null)} onSave={applyEdit} />}
      {showNewProjectModal && <NewProjectModal onClose={() => setShowNewProjectModal(false)} onCreate={createNewProject} creating={creatingProject} />}
      {imagePicker && (
        <AssetPickerModal
          title={imagePicker.title}
          projects={projects}
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
          onPageChange={setPickerPage}
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
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
};
