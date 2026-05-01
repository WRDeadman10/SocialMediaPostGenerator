import { defaultConfig } from "./constants.js";
import { slidesFor } from "./slideHtml.js";

export const isAssetUrl = (value) => typeof value === "string" && (
  value.startsWith("https://storage.googleapis.com/") ||
  value.startsWith("https://firebasestorage.googleapis.com/")
);

export const projectSnapshot = (project, config, rows, generated, visible) => {
  if (!project) return null;
  return { ...project, config, rows, posts: generated, visible, updatedAt: new Date().toISOString() };
};

export const collectAssetUrls = (project) => {
  const urls = [];
  for (const value of [project?.config?.bgDataUrl, project?.config?.logoDataUrl, project?.config?.lastLogoDataUrl]) {
    if (isAssetUrl(value)) urls.push(value);
  }
  for (const row of project?.rows || []) {
    if (isAssetUrl(row.firstSlideImage)) urls.push(row.firstSlideImage);
  }
  return [...new Set(urls)];
};

export const validateProjectAssets = async (project, showToast) => {
  const missing = [];
  for (const url of collectAssetUrls(project)) {
    try {
      const res = await fetch(url, { method: "HEAD" });
      if (!res.ok) missing.push(url);
    } catch {
      missing.push(url);
    }
  }
  if (missing.length) showToast(`Missing ${missing.length} saved image(s) from project`);
};

export const applyProject = (project, setters) => {
  const nextConfig = { ...defaultConfig, ...(project?.config || {}) };
  const nextRows = project?.rows || [];
  const savedPosts = project?.posts && Object.keys(project.posts).length ? project.posts : null;
  const seedPosts = savedPosts || Object.fromEntries(nextRows.map((row, idx) => ([
    String(idx),
    { type: (row.post_type || "single").toLowerCase().trim(), rowData: row, slides: [] },
  ])));
  const nextPosts = Object.fromEntries(Object.entries(seedPosts).map(([idx, post]) => {
    const row = post?.rowData || nextRows[Number(idx)] || {};
    return [idx, { ...post, rowData: row, slides: slidesFor(row, nextConfig) }];
  }));
  setters.setConfig(nextConfig);
  setters.setRows(nextRows);
  setters.setGenerated(nextPosts);
  setters.setVisible(project?.visible || {});
};
