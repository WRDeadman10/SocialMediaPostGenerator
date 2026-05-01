import React from "react";
import { postJson } from "../lib/api.js";
import { fnUrl } from "../lib/env.js";
import { fileToDataUrl, fileToThumbnailDataUrl } from "../lib/files.js";
import { applyProject } from "../lib/project.js";
import { slidesFor } from "../lib/slideHtml.js";

export const useImagePipeline = ({
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
}) => {
  const [imagePicker, setImagePicker] = React.useState(null);
  const [pickerAssets, setPickerAssets] = React.useState([]);
  const [pickerPage, setPickerPage] = React.useState(1);
  const [pickerTotal, setPickerTotal] = React.useState(0);
  const [pickerHasMore, setPickerHasMore] = React.useState(false);
  const [pickerLoading, setPickerLoading] = React.useState(false);
  const [uploadLoading, setUploadLoading] = React.useState({});
  const [busyDefaultAssetId, setBusyDefaultAssetId] = React.useState("");
  const pickerUploadRef = React.useRef(null);

  const mergeClientRowsWithDefaults = React.useCallback((nextRows, defaults = assetDefaults) => {
    if (!defaults?.firstSlideImageUrl) return nextRows;
    return nextRows.map((row) => {
      if (row?.firstSlideImage) return row;
      return { ...row, firstSlideImage: defaults.firstSlideImageUrl, firstSlideImageName: row.firstSlideImageName || "default" };
    });
  }, [assetDefaults]);

  const mergeClientConfigWithDefaults = React.useCallback((nextConfig, defaults = assetDefaults) => {
    const next = { ...nextConfig };
    if (!next.bgDataUrl && defaults?.backgroundUrl) next.bgDataUrl = defaults.backgroundUrl;
    if (!next.logoDataUrl && defaults?.logoUrl) next.logoDataUrl = defaults.logoUrl;
    if (!next.lastLogoDataUrl && defaults?.lastSlideLogoUrl) next.lastLogoDataUrl = defaults.lastSlideLogoUrl;
    return next;
  }, [assetDefaults]);

  React.useEffect(() => {
    if (!imagePicker) {
      setPickerAssets([]);
      setPickerTotal(0);
      setPickerHasMore(false);
      return;
    }
    let cancelled = false;
    setPickerLoading(true);
    const pageSize = 10;
    postJson(fnUrl("/listAssets"), { kind: imagePicker.kind, page: pickerPage, pageSize })
      .then((data) => {
        if (cancelled) return;
        const raw = Array.isArray(data?.assets) ? data.assets : [];
        const seen = new Set();
        const deduped = [];
        for (const asset of raw) {
          const url = asset?.url;
          if (!url || seen.has(url)) continue;
          seen.add(url);
          deduped.push(asset);
        }
        deduped.sort((a, b) => {
          const ap = a.projectId === activeProjectId ? 1 : 0;
          const bp = b.projectId === activeProjectId ? 1 : 0;
          if (ap !== bp) return bp - ap;
          return 0;
        });
        setPickerAssets(deduped);
        setPickerTotal(Number(data?.total) || deduped.length);
        setPickerHasMore(!!data?.hasMore);
      })
      .catch((e) => {
        if (!cancelled) showToast(e.message || "Could not load image library");
      })
      .finally(() => {
        if (!cancelled) setPickerLoading(false);
      });
    return () => { cancelled = true; };
  }, [activeProjectId, imagePicker, pickerPage, showToast]);

  const storeImageAsset = React.useCallback(async (file, kind, loadingKey = "") => {
    if (!file) return "";
    if (!activeProjectId) {
      showToast("Create or load a project before selecting images");
      return "";
    }
    if (loadingKey) setUploadLoading((prev) => ({ ...prev, [loadingKey]: true }));
    try {
      const dataUrl = await fileToDataUrl(file);
      const thumbDataUrl = await fileToThumbnailDataUrl(file);
      const result = await postJson(fnUrl("/uploadAsset"), {
        projectId: activeProjectId,
        kind,
        fileName: file.name,
        dataUrl,
        ...(thumbDataUrl ? { thumbDataUrl } : {}),
      });
      if (!result?.url) throw new Error("Could not save image");
      return result.url;
    } finally {
      if (loadingKey) setUploadLoading((prev) => ({ ...prev, [loadingKey]: false }));
    }
  }, [activeProjectId, showToast]);

  const handleOpenImagePicker = React.useCallback((payload) => {
    if (!activeProjectId) {
      showToast("Create or load a project first");
      return;
    }
    setPickerPage(1);
    setImagePicker(payload);
  }, [activeProjectId, showToast]);

  const handlePickerUpload = React.useCallback(async (file) => {
    if (!file || !imagePicker) return;
    try {
      const url = await storeImageAsset(file, imagePicker.kind, `picker:${imagePicker.kind}`);
      if (!url) return;
      await imagePicker.applyUrl(url, file.name);
      if (pickerUploadRef.current) pickerUploadRef.current.value = "";
      setImagePicker(null);
      showToast("Image saved");
    } catch (error) {
      showToast(error.message);
    }
  }, [imagePicker, showToast, storeImageAsset]);

  const handleSetDefaultAsset = React.useCallback(async (asset) => {
    if (!asset?.id) return;
    const id = String(asset.id);
    setBusyDefaultAssetId(id);
    try {
      const body = id.startsWith("__storage__:")
        ? { defaultFromUrl: { url: asset.url, baseKind: asset.baseKind || asset.fullKind } }
        : { assetId: id };
      const data = await postJson(fnUrl("/setDefaultAsset"), body);
      if (data?.assetDefaults) setAssetDefaults(data.assetDefaults);
      if (data?.projects) {
        setProjects(data.projects);
        if (activeProjectId && data.projects[activeProjectId]) {
          applyProject(data.projects[activeProjectId], { setConfig, setRows, setGenerated, setVisible });
        }
      }
      showToast("Default image updated for all projects");
    } catch (error) {
      showToast(error.message);
    } finally {
      setBusyDefaultAssetId("");
    }
  }, [activeProjectId, setAssetDefaults, setConfig, setGenerated, setProjects, setRows, setVisible, showToast]);

  const setConfigImage = React.useCallback(async (key, kind, file) => {
    try {
      const url = await storeImageAsset(file, kind, `sidebar:${kind}`);
      if (url) setConfig((prev) => ({ ...prev, [key]: url }));
    } catch (error) {
      showToast(error.message);
    }
  }, [setConfig, showToast, storeImageAsset]);

  const setFirstSlideImage = React.useCallback(async (index, file) => {
    if (!file) return;
    try {
      const url = await storeImageAsset(file, `first-slide-${index + 1}`, `card:first-slide:${index}`);
      if (!url) return;
      const nextRows = rows.map((row, i) => (i === index ? { ...row, firstSlideImage: url, firstSlideImageName: file.name } : row));
      const merged = mergeClientRowsWithDefaults(nextRows);
      setRows(merged);
      setGenerated((prev) => ({
        ...prev,
        [index]: { ...prev[index], rowData: merged[index], slides: slidesFor(merged[index], config) },
      }));
      showToast("First slide image saved to Firebase Storage");
    } catch (error) {
      showToast(error.message);
    }
  }, [config, mergeClientRowsWithDefaults, rows, setGenerated, setRows, showToast, storeImageAsset]);

  return {
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
    setFirstSlideImage,
  };
};
