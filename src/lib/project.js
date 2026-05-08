import { defaultConfig } from "./constants.js";
import { slidesFor } from "./slideHtml.js";

export const isAssetUrl = (value) => typeof value === "string" && (
  value.startsWith("https://storage.googleapis.com/") ||
  value.startsWith("https://firebasestorage.googleapis.com/")
);

export const projectSnapshot = (project, config, rows, generated, visible) => {
  if (!project) return null;
  
  // New structured metadata
  const metadata = {
    branding: {
      logoDataUrl: config.logoDataUrl,
      logoH: config.logoH,
      lastLogoDataUrl: config.lastLogoDataUrl,
      lastLogoH: config.lastLogoH,
      lastLogoX: config.lastLogoX,
      lastLogoY: config.lastLogoY,
      domain: config.domain,
      bgDataUrl: config.bgDataUrl,
    },
    typography: {
      fontTitle: config.fontTitle,
      fontPara: config.fontPara,
      fontCta: config.fontCta,
      wtTitle: config.wtTitle,
      wtPara: config.wtPara,
      wtCta: config.wtCta,
      titleSize: config.titleSize,
      paraSize: config.paraSize,
      ctaSize: config.ctaSize,
      gapTP: config.gapTP,
      gapPC: config.gapPC,
    },
    colors: {
      bgColor: config.bgColor,
      titleColor: config.titleColor,
      paraColor: config.paraColor,
      domainColor: config.domainColor,
      ctaBg: config.ctaBg,
      ctaTxt: config.ctaTxt,
      titleGrad: config.titleGrad,
      titleG1: config.titleG1,
      titleG2: config.titleG2,
      ctaGrad: config.ctaGrad,
      ctaG1: config.ctaG1,
      ctaG2: config.ctaG2,
    },
    layout: {
      postType: config.postType,
      hAlign: config.hAlign,
      vAlign: config.vAlign,
      contentWidth: config.contentWidth,
      bars: config.bars,
      barMode: config.barMode,
      indicators: config.indicators,
      slideNumbers: config.slideNumbers,
      indicatorPos: config.indicatorPos,
      alignScope: config.alignScope,
      slide1HAlign: config.slide1HAlign,
      slide1VAlign: config.slide1VAlign,
      ctaHAlign: config.ctaHAlign,
      ctaVAlign: config.ctaVAlign,
      ctaDomainPos: config.ctaDomainPos,
    },
    data: {
      rows: rows,
    }
  };

  return { 
    ...project, 
    metadata,
    // Keep top-level for compatibility if needed, but primary is metadata
    config, 
    rows, 
    posts: generated, 
    visible, 
    theme: config.theme,
    updatedAt: new Date().toISOString() 
  };
};

export const collectAssetUrls = (project) => {
  const urls = [];
  const cfg = project?.metadata?.branding || project?.config;
  const rows = project?.metadata?.data?.rows || project?.rows || [];

  for (const value of [cfg?.bgDataUrl, cfg?.logoDataUrl, cfg?.lastLogoDataUrl]) {
    if (isAssetUrl(value)) urls.push(value);
  }
  for (const row of rows) {
    if (isAssetUrl(row.firstSlideImage)) urls.push(row.firstSlideImage);
  }
  return [...new Set(urls)];
};

export const validateProjectAssets = async (project, showToast) => {
  const urls = collectAssetUrls(project);
  if (!urls.length) return;

  const missing = [];
  for (const url of urls) {
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
  // Merge from metadata if available, otherwise fallback to legacy config
  const meta = project?.metadata;
  const legacyConfig = project?.config || {};
  
  const configFromMeta = meta ? {
    ...meta.branding,
    ...meta.typography,
    ...meta.colors,
    ...meta.layout,
  } : {};

  const nextConfig = { 
    ...defaultConfig, 
    ...legacyConfig, 
    ...configFromMeta,
    theme: project?.theme || legacyConfig.theme || defaultConfig.theme
  };

  const nextRows = meta?.data?.rows || project?.rows || [];
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
