import React from "react";
import { createRoot } from "react-dom/client";
import * as XLSX from "xlsx";
import html2canvas from "html2canvas";
import JSZip from "jszip";
import "./styles.css";

const FUNCTIONS_URL = import.meta.env.VITE_FUNCTIONS_URL || "http://127.0.0.1:5001/YOUR_PROJECT_ID/us-central1";

const fonts = ["DM Sans", "Inter", "Poppins", "Montserrat", "Lato", "Raleway", "Oswald", "Merriweather", "Nunito", "Playfair Display", "Aptos"];
const defaultConfig = {
  theme: "dark", postType: "carousel", bgColor: "#000000", bgDataUrl: "", logoDataUrl: "", logoH: 60,
  titleColor: "#4770ff", paraColor: "#64748b", domainColor: "#94a3b8", ctaBg: "#6366f1", ctaTxt: "#ffffff",
  titleGrad: false, titleG1: "#6366f1", titleG2: "#14b8a6", ctaGrad: false, ctaG1: "#6366f1", ctaG2: "#14b8a6",
  fontTitle: "DM Sans", fontPara: "DM Sans", fontCta: "DM Sans", wtTitle: 700, wtPara: 400, wtCta: 600,
  titleSize: 46, paraSize: 20, ctaSize: 20, gapTP: 20, gapPC: 28, contentWidth: 640,
  hAlign: "center", vAlign: "top", domain: "www.viitorcloud.com",
  bars: [{ enabled: true, color: "#6d5dfc", height: 7, weight: 25 }, { enabled: true, color: "#14b8a6", height: 7, weight: 25 }, { enabled: false, color: "#38bdf8", height: 7, weight: 25 }, { enabled: false, color: "#f59e0b", height: 7, weight: 25 }],
  barMode: "side", indicators: true, slideNumbers: true, indicatorPos: "cb",
  alignScope: "all", slide1HAlign: "center", slide1VAlign: "top", ctaHAlign: "center", ctaVAlign: "top",
  ctaDomainPos: "default", lastLogoDataUrl: "", lastLogoH: 110, lastLogoX: 345, lastLogoY: 690
};

function escapeHtml(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}
function justify(h) { return h === "left" ? "flex-start" : h === "right" ? "flex-end" : "center"; }
function vJust(v) { return v === "top" ? "flex-start" : v === "bottom" ? "flex-end" : "center"; }
function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
function downloadBlob(blob, name) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}
function projectSnapshot(project, config, rows, generated, visible) {
  if (!project) return null;
  return { ...project, config, rows, posts: generated, visible, updatedAt: new Date().toISOString() };
}
// Firebase Storage URLs are already absolute HTTPS URLs
function isAssetUrl(value) {
  return typeof value === "string" && (
    value.startsWith("https://storage.googleapis.com/") ||
    value.startsWith("https://firebasestorage.googleapis.com/")
  );
}
function absoluteAssetUrl(value) {
  return value || "";
}
function applyProject(project, setters) {
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
}
function collectAssetUrls(project) {
  const urls = [];
  for (const value of [project?.config?.bgDataUrl, project?.config?.logoDataUrl, project?.config?.lastLogoDataUrl]) {
    if (isAssetUrl(value)) urls.push(value);
  }
  for (const row of project?.rows || []) {
    if (isAssetUrl(row.firstSlideImage)) urls.push(row.firstSlideImage);
  }
  return [...new Set(urls)];
}

function buildBg(config, isFirst, row) {
  const image = isFirst && row.firstSlideImage ? row.firstSlideImage : config.bgDataUrl;
  if (image) return `<div class="post-bg" style="background-image:url(${absoluteAssetUrl(image)})"></div>`;
  return `<div class="post-bg" style="background:${config.bgColor}"></div>`;
}
function buildLogo(config, isLast) {
  const src = isLast && config.lastLogoDataUrl ? config.lastLogoDataUrl : config.logoDataUrl;
  if (!src) return "";
  const h = isLast ? config.lastLogoH : config.logoH;
  const x = isLast ? config.lastLogoX : 80;
  const y = isLast ? config.lastLogoY : 80;
  return `<img src="${absoluteAssetUrl(src)}" style="position:absolute;left:${x}px;top:${y}px;height:${h}px;width:auto;max-width:300px;object-fit:contain;z-index:2">`;
}
function domainHtml(config, isLast) {
  if (!config.domain) return "";
  let pos = "left:80px;bottom:80px;";
  if (isLast && config.ctaDomainPos !== "default") {
    pos = { tl: "left:80px;top:80px;", tr: "right:80px;top:80px;", bl: "left:80px;bottom:80px;", br: "right:80px;bottom:80px;", cb: "left:50%;transform:translateX(-50%);bottom:80px;" }[config.ctaDomainPos] || pos;
  }
  return `<div style="position:absolute;${pos}font-size:13px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:${config.domainColor};font-family:${config.fontPara};z-index:2">${escapeHtml(config.domain)}</div>`;
}
function accentBars(config) {
  const active = config.bars.filter((b) => b.enabled);
  if (!active.length) return "";
  if (config.barMode === "stack") return active.map((b) => `<div style="width:100%;height:${b.height}px;background:${b.color};flex-shrink:0;z-index:1"></div>`).join("");
  const total = active.reduce((sum, b) => sum + Number(b.weight || 25), 0);
  const height = Math.max(...active.map((b) => Number(b.height || 7)));
  return `<div style="display:flex;width:100%;flex-shrink:0;z-index:1">${active.map((b) => `<div style="flex:0 0 ${((b.weight / total) * 100).toFixed(2)}%;height:${height}px;background:${b.color}"></div>`).join("")}</div>`;
}
function titleDiv(config, text, size, gap, width, align) {
  const hl = config.highlight ? `background:${config.highlightColor};padding:6px 12px;border-radius:6px;` : "";
  const base = `font-size:${size}px;font-family:${config.fontTitle};font-weight:${config.wtTitle};line-height:1.15;text-align:${align};margin-bottom:${gap}px;width:100%;max-width:${width}px;${hl}`;
  if (config.titleGrad) return `<div style="${base}"><span style="background:linear-gradient(90deg,${config.titleG1},${config.titleG2});-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">${escapeHtml(text)}</span></div>`;
  return `<div style="${base}color:${config.titleColor}">${escapeHtml(text)}</div>`;
}
function ctaSpan(config, text) {
  const bg = config.ctaGrad ? `linear-gradient(90deg,${config.ctaG1},${config.ctaG2})` : config.ctaBg;
  return `<span class="post-cta" style="background:${bg};color:${config.ctaTxt};font-family:${config.fontCta};font-size:${config.ctaSize}px;font-weight:${config.wtCta};padding:${Math.max(14, config.ctaSize * 0.75)}px ${Math.max(30, config.ctaSize * 2)}px">${escapeHtml(text || "Learn More")}</span>`;
}
function buildSlide(row, config, slideType, slideNum, total) {
  const isFirst = slideType === "first";
  const isLast = slideType === "last";
  const isMid = !isFirst && !isLast;
  const title = isFirst ? row.slide1_title || row.title || "" : isLast ? row[`slide${total}_title`] || row.last_title || "" : row[`slide${slideNum}_title`] || "";
  const paragraph = isMid ? row[`slide${slideNum}_paragraph`] || "" : "";
  const cta = isLast ? row.cta_text || "Learn More" : "";
  let h = config.hAlign, v = config.vAlign;
  if (config.alignScope === "first" && isFirst) { h = config.slide1HAlign; v = config.slide1VAlign; }
  if (config.alignScope === "last" && isLast) { h = config.ctaHAlign; v = config.ctaVAlign; }
  const dotColor = config.bars.find((b) => b.enabled)?.color || "#6366f1";
  const dots = config.indicators ? `<div class="slide-indicator ${config.indicatorPos}">${Array.from({ length: total }, (_, i) => `<span style="width:${i === slideNum - 1 ? 28 : 16}px;background:${dotColor};opacity:${i === slideNum - 1 ? 1 : 0.35}"></span>`).join("")}</div>` : "";
  const number = isMid && config.slideNumbers ? `<div class="slide-number">${String(slideNum - 1).padStart(2, "0")}</div>` : "";
  const swipe = isFirst ? `<div class="swipe-note">Swipe to explore -></div>` : "";
  const paraHighlight = config.highlight ? `background:${config.highlightColor};padding:6px 12px;border-radius:6px;` : "";
  const paraHtml = paragraph ? `<div style="font-size:${config.paraSize}px;font-family:${config.fontPara};font-weight:${config.wtPara};color:${config.paraColor};text-align:${h};margin-bottom:${config.gapPC}px;width:100%;max-width:${config.contentWidth}px;line-height:1.65;${paraHighlight}">${escapeHtml(paragraph)}</div>` : "";
  return `<div class="brand-post">${buildBg(config, isFirst, row)}${buildLogo(config, isLast)}${dots}${number}${swipe}<div class="post-content-area" style="justify-content:${vJust(v)};align-items:${justify(h)}">${titleDiv(config, title, isFirst ? Math.min(Number(config.titleSize) + 6, 86) : Number(config.titleSize) - 4, config.gapTP, config.contentWidth, h)}${paraHtml}${isLast ? `<div class="post-cta-wrap" style="justify-content:${justify(h)};width:100%;margin-top:${config.gapPC}px">${ctaSpan(config, cta)}</div>` : ""}</div>${domainHtml(config, isLast)}${accentBars(config)}</div>`;
}
function buildSingle(row, config) {
  const h = config.hAlign;
  return `<div class="brand-post">${buildBg(config, true, {})}${buildLogo(config, false)}<div class="post-content-area" style="justify-content:${vJust(config.vAlign)};align-items:${justify(h)}">${titleDiv(config, row.title || "", config.titleSize, config.gapTP, config.contentWidth, h)}<div style="font-size:${config.paraSize}px;font-family:${config.fontPara};font-weight:${config.wtPara};color:${config.paraColor};text-align:${h};margin-bottom:${config.gapPC}px;width:100%;max-width:${config.contentWidth}px;line-height:1.65;${config.highlight ? `background:${config.highlightColor};padding:6px 12px;border-radius:6px;` : ""}">${escapeHtml(row.paragraph || "")}</div><div class="post-cta-wrap" style="justify-content:${justify(h)};width:100%">${ctaSpan(config, row.cta_text)}</div></div>${domainHtml(config, false)}${accentBars(config)}</div>`;
}
function slidesFor(row, config) {
  const type = (row.post_type || "single").toLowerCase().trim();
  if (type !== "carousel") return [buildSingle(row, config)];
  return ["first", "mid", "mid", "mid", "mid", "last"].map((type, i) => buildSlide(row, config, type, i + 1, 6));
}

function App() {
  const [config, setConfig] = React.useState(defaultConfig);
  const [rows, setRows] = React.useState([]);
  const [generated, setGenerated] = React.useState({});
  const [visible, setVisible] = React.useState({});
  const [projects, setProjects] = React.useState({});
  const [activeProjectId, setActiveProjectId] = React.useState("");
  const [hydrated, setHydrated] = React.useState(false);
  const [editing, setEditing] = React.useState(null);
  const [toast, setToast] = React.useState("");
  const [showNewProjectModal, setShowNewProjectModal] = React.useState(false);
  const [creatingProject, setCreatingProject] = React.useState(false);
  const [animateSeed, setAnimateSeed] = React.useState(0);
  const renderRef = React.useRef(null);
  const lastGeneratedCountRef = React.useRef(0);
  const audioCtxRef = React.useRef(null);

  React.useEffect(() => {
    document.documentElement.dataset.theme = config.theme;
  }, [config.theme]);

  // Load all projects from Firestore on mount
  React.useEffect(() => {
    fetch(`${FUNCTIONS_URL}/getProjects`)
      .then((r) => r.json())
      .then((data) => {
        if (!data?.projects) { setHydrated(true); return; }
        const restored = data.projects;
        const savedActive = localStorage.getItem("activeProjectId") || "";
        const active = (savedActive && restored[savedActive]) ? savedActive : Object.keys(restored)[0] || "";
        setProjects(restored);
        setActiveProjectId(active);
        if (active) {
          applyProject(restored[active], { setConfig, setRows, setGenerated, setVisible });
          validateProjectAssets(restored[active]);
          showToast(`Loaded: ${restored[active].name}`);
        }
        setHydrated(true);
      })
      .catch(() => setHydrated(true));
  }, []);

  // Keep projects object in sync with active project state
  React.useEffect(() => {
    if (!hydrated || !activeProjectId) return;
    setProjects((prev) => {
      const current = prev[activeProjectId];
      if (!current) return prev;
      return { ...prev, [activeProjectId]: projectSnapshot(current, config, rows, generated, visible) };
    });
  }, [hydrated, activeProjectId, config, rows, generated, visible]);

  // Debounced save of active project to Firestore
  React.useEffect(() => {
    if (!hydrated || !activeProjectId) return;
    const id = setTimeout(() => {
      const project = projects[activeProjectId];
      if (!project) return;
      fetch(`${FUNCTIONS_URL}/saveProject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: activeProjectId, project }),
      }).catch(() => {});
    }, 250);
    return () => clearTimeout(id);
  }, [hydrated, activeProjectId, projects]);

  // Persist active project selection in localStorage
  React.useEffect(() => {
    if (activeProjectId) localStorage.setItem("activeProjectId", activeProjectId);
  }, [activeProjectId]);

  function showToast(message) {
    setToast(message);
    setTimeout(() => setToast(""), 2600);
  }
  function updateConfig(patch) {
    setConfig((prev) => ({ ...prev, ...patch }));
  }
  function updateBar(index, patch) {
    setConfig((prev) => ({ ...prev, bars: prev.bars.map((bar, i) => i === index ? { ...bar, ...patch } : bar) }));
  }

  const playSfx = React.useCallback((type) => {
    if (typeof window === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") ctx.resume().catch(() => {});

      const now = ctx.currentTime;
      const master = ctx.createGain();
      master.gain.setValueAtTime(0.0001, now);
      master.gain.exponentialRampToValueAtTime(0.08, now + 0.01);
      master.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
      master.connect(ctx.destination);

      const o1 = ctx.createOscillator();
      const o2 = ctx.createOscillator();
      o1.type = "triangle";
      o2.type = "sine";

      const base = type === "apply" ? 220 : type === "generate" ? 196 : 174;
      o1.frequency.setValueAtTime(base * 2.0, now);
      o1.frequency.exponentialRampToValueAtTime(base * 2.8, now + 0.12);
      o2.frequency.setValueAtTime(base * 3.2, now);
      o2.frequency.exponentialRampToValueAtTime(base * 2.4, now + 0.16);

      const g1 = ctx.createGain();
      const g2 = ctx.createGain();
      g1.gain.value = 0.55;
      g2.gain.value = 0.35;
      o1.connect(g1);
      o2.connect(g2);
      g1.connect(master);
      g2.connect(master);

      o1.start(now);
      o2.start(now);
      o1.stop(now + 0.24);
      o2.stop(now + 0.24);
    } catch {
      // Ignore audio failures (autoplay policy, unsupported, etc.)
    }
  }, []);

  async function createNewProject(name) {
    if (!name?.trim()) return;
    setCreatingProject(true);
    try {
      const res = await fetch(`${FUNCTIONS_URL}/createProject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to create project");
      const project = result.project;
      setProjects((prev) => ({ ...prev, [project.id]: project }));
      setActiveProjectId(project.id);
      setRows([]);
      setGenerated({});
      setVisible({});
      setConfig(defaultConfig);
      showToast(`Project "${project.name}" created`);
      setShowNewProjectModal(false);
    } catch (e) {
      showToast(e.message);
    } finally {
      setCreatingProject(false);
    }
  }

  // Loads Excel rows into the active project — does NOT create a new project
  async function handleUpload(file) {
    if (!file) return;
    if (!activeProjectId) {
      showToast("Create a project first, then upload Excel");
      return;
    }
    const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet, { defval: "" }).map((row, i) => ({ ...row, _index: i }));
    setProjects((prev) => {
      const current = prev[activeProjectId];
      if (!current) return prev;
      return { ...prev, [activeProjectId]: { ...current, sourceFileName: file.name, rows: data, posts: {}, visible: {}, updatedAt: new Date().toISOString() } };
    });
    setRows(data);
    setGenerated({});
    setVisible({});
    showToast(`Loaded ${data.length} rows from ${file.name}`);
  }

  function loadProject(id) {
    const project = projects[id];
    if (!project) return;
    setActiveProjectId(id);
    applyProject(project, { setConfig, setRows, setGenerated, setVisible });
    validateProjectAssets(project);
    showToast(`Loaded: ${project.name}`);
  }

  async function validateProjectAssets(project) {
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
  }

  function generateAll() {
    const next = {};
    rows.forEach((row, i) => {
      next[i] = { type: (row.post_type || "single").toLowerCase().trim(), rowData: row, slides: slidesFor(row, config) };
    });
    setGenerated(next);
    setAnimateSeed(Date.now());
    playSfx("generate");
    showToast(`${rows.length} posts generated`);
  }
  function regenerateGenerated(nextRows = rows, nextConfig = config) {
    setGenerated((prev) => Object.fromEntries(Object.entries(prev).map(([idx, post]) => {
      const row = nextRows[idx] || post.rowData;
      return [idx, { ...post, rowData: row, slides: slidesFor(row, nextConfig) }];
    })));
  }
  React.useEffect(() => {
    const id = setTimeout(() => regenerateGenerated(rows, config), 130);
    return () => clearTimeout(id);
  }, [config]);

  async function postJson(url, body) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const text = await response.text();
      let parsed = null;
      try { parsed = text ? JSON.parse(text) : null; } catch { parsed = null; }
      if (!response.ok) {
        const message = parsed?.error || `Request failed (${response.status})`;
        throw new Error(message);
      }
      return parsed;
    } catch (error) {
      const isNetwork = error instanceof TypeError && String(error.message || "").toLowerCase().includes("fetch");
      if (!isNetwork) throw error;
      const hint =
        FUNCTIONS_URL.includes("socialmediapostgenerator-007")
          ? "Set VITE_FUNCTIONS_URL (project id) in .env.local"
          : (window.location.protocol === "https:" && FUNCTIONS_URL.startsWith("http:"))
            ? "Your app is HTTPS but VITE_FUNCTIONS_URL is HTTP (mixed content). Use HTTPS Cloud Functions URL."
            : "If using emulators, run `npm run emulate` and ensure VITE_FUNCTIONS_URL matches emulator project id.";
      throw new Error(`Failed to fetch. ${hint}`);
    }
  }

  async function storeImageAsset(file, kind) {
    if (!file) return "";
    if (!activeProjectId) {
      showToast("Create or load a project before selecting images");
      return "";
    }
    const dataUrl = await fileToDataUrl(file);
    const result = await postJson(`${FUNCTIONS_URL}/uploadAsset`, { projectId: activeProjectId, kind, fileName: file.name, dataUrl });
    if (!result?.url) throw new Error("Could not save image");
    return result.url;
  }

  async function setConfigImage(key, kind, file) {
    try {
      const url = await storeImageAsset(file, kind);
      if (url) updateConfig({ [key]: url });
    } catch (error) {
      showToast(error.message);
    }
  }
  async function setFirstSlideImage(index, file) {
    if (!file) return;
    try {
      const url = await storeImageAsset(file, `first-slide-${index + 1}`);
      if (!url) return;
      const nextRows = rows.map((row, i) => i === index ? { ...row, firstSlideImage: url, firstSlideImageName: file.name } : row);
      setRows(nextRows);
      setGenerated((prev) => ({ ...prev, [index]: { ...prev[index], rowData: nextRows[index], slides: slidesFor(nextRows[index], config) } }));
      showToast("First slide image saved to Firebase Storage");
    } catch (error) {
      showToast(error.message);
    }
  }

  async function renderPng(html) {
    renderRef.current.innerHTML = html;
    await new Promise((r) => setTimeout(r, 80));
    const canvas = await html2canvas(renderRef.current.firstElementChild, { scale: 2, useCORS: true, backgroundColor: null, width: 800, height: 1000, logging: false });
    renderRef.current.innerHTML = "";
    return canvas;
  }
  async function downloadPost(index) {
    const post = generated[index];
    if (!post) return;
    for (let i = 0; i < post.slides.length; i++) {
      const canvas = await renderPng(post.slides[i]);
      canvas.toBlob((blob) => downloadBlob(blob, `post_${Number(index) + 1}${post.slides.length > 1 ? `_slide${i + 1}` : ""}.png`));
    }
  }
  async function downloadZip() {
    const zip = new JSZip();
    for (const [idx, post] of Object.entries(generated)) {
      for (let i = 0; i < post.slides.length; i++) {
        const canvas = await renderPng(post.slides[i]);
        zip.file(`post_${Number(idx) + 1}${post.slides.length > 1 ? `_slide${i + 1}` : ""}.png`, canvas.toDataURL("image/png").split(",")[1], { base64: true });
      }
    }
    downloadBlob(await zip.generateAsync({ type: "blob" }), "social_posts.zip");
  }
  function downloadTemplate(type) {
    const headers = type === "single" ? ["post_type", "title", "paragraph", "cta_text"] : ["post_type", "slide1_title", "slide2_title", "slide2_paragraph", "slide3_title", "slide3_paragraph", "slide4_title", "slide4_paragraph", "slide5_title", "slide5_paragraph", "slide6_title", "cta_text"];
    const sample = type === "single" ? [["single", "Your Post Title Here", "Write your paragraph text.", "Learn More"]] : [["carousel", "Intro Slide Title", "Slide 2 Title", "Slide 2 paragraph text here.", "Slide 3 Title", "Slide 3 paragraph text here.", "Slide 4 Title", "Slide 4 paragraph text.", "Slide 5 Title", "Slide 5 paragraph text.", "Final Slide Title", "Learn More"]];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([headers, ...sample]), "Posts");
    XLSX.writeFile(wb, `template_${type}.xlsx`);
  }
  function applyEdit(row, modalConfig = config) {
    const nextRows = rows.map((r, i) => i === editing.index ? row : r);
    setRows(nextRows);
    setConfig(modalConfig);
    setGenerated((prev) => ({ ...prev, [editing.index]: { ...prev[editing.index], rowData: row, slides: slidesFor(row, modalConfig) } }));
    setEditing(null);
    setAnimateSeed(Date.now());
    playSfx("apply");
  }
  const stats = { total: rows.length, done: Object.keys(generated).length, pending: Math.max(rows.length - Object.keys(generated).length, 0) };
  const activeProject = projects[activeProjectId];

  React.useEffect(() => {
    const count = Object.keys(generated).length;
    const prev = lastGeneratedCountRef.current;
    lastGeneratedCountRef.current = count;
    if (!hydrated) return;
    if (count && count !== prev) {
      setAnimateSeed(Date.now());
      playSfx("distribute");
    }
  }, [generated, hydrated, playSfx]);

  return <div className="shell">
    <header><div className="brand"><div className="brand-icon">✦</div><div><b>Post Generator</b><span>VIITORCLOUD</span></div></div><button className="theme-btn" onClick={() => updateConfig({ theme: config.theme === "dark" ? "light" : "dark" })}>{config.theme === "dark" ? "☀" : "☾"}</button></header>
    <div className="app">
      <aside className="sidebar">
        <Panel title="Project" defaultOpen>
          <Field label="Active project">
            <select value={activeProjectId} onChange={(e) => loadProject(e.target.value)}>
              <option value="">No project selected</option>
              {Object.values(projects).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt))).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <button className="btn-primary" style={{ marginTop: 8 }} onClick={() => setShowNewProjectModal(true)}>+ New Project</button>
          <p className="hint">
            {activeProjectId
              ? `${activeProject?.rows?.length || rows.length} rows · ${activeProject?.sourceFileName || "No Excel loaded yet"}`
              : "Create a project, then upload an Excel file."}
          </p>
        </Panel>
        <Panel title="Post Type"><div className="seg"><button className={config.postType === "single" ? "active" : ""} onClick={() => updateConfig({ postType: "single" })}>Single Post</button><button className={config.postType === "carousel" ? "active" : ""} onClick={() => updateConfig({ postType: "carousel" })}>Carousel</button></div></Panel>
        <Panel title="Upload Excel">
          {!activeProjectId && <p className="hint" style={{ marginBottom: 8 }}>Create a project first before uploading Excel.</p>}
          <label className={`drop ${rows.length ? "has-file" : ""} ${!activeProjectId ? "disabled" : ""}`}>
            <input hidden type="file" accept=".xlsx,.xls,.csv" disabled={!activeProjectId} onChange={(e) => handleUpload(e.target.files[0])} />
            <strong>Click to upload</strong>
            <small>{config.postType === "carousel" ? "post_type · slide1_title · ... · slide6_title · cta_text" : "post_type · title · paragraph · cta_text"}</small>
            <em>{rows.length ? `${rows.length} rows loaded` : "or drag & drop"}</em>
          </label>
          <div className="tpls"><button onClick={() => downloadTemplate("single")}>Single Template</button><button onClick={() => downloadTemplate("carousel")}>Carousel Template</button></div>
        </Panel>
        <Panel title="Progress"><div className="stats"><Stat label="Total" value={stats.total} /><Stat label="Done" value={stats.done} /><Stat label="Pending" value={stats.pending} /><Stat label="Error" value={0} /></div><div className="bar"><span style={{ width: `${stats.total ? stats.done / stats.total * 100 : 0}%` }} /></div></Panel>
        <Panel title="Background"><ImageBox label="Background image" value={config.bgDataUrl} onFile={(file) => setConfigImage("bgDataUrl", "background", file)} onClear={() => updateConfig({ bgDataUrl: "" })} /><Field label="Fallback Color"><input type="color" value={config.bgColor} onChange={(e) => updateConfig({ bgColor: e.target.value })} /></Field></Panel>
        <Panel title="Logo"><ImageBox label="Logo" value={config.logoDataUrl} onFile={(file) => setConfigImage("logoDataUrl", "logo", file)} onClear={() => updateConfig({ logoDataUrl: "" })} /><Range label="Logo H" value={config.logoH} min="20" max="200" onChange={(v) => updateConfig({ logoH: v })} /></Panel>
        <Panel title="Domain"><Field label="Domain text (optional)"><input value={config.domain} placeholder="e.g. VIITORCLOUD.COM" onChange={(e) => updateConfig({ domain: e.target.value })} /></Field><Color label="Domain color" value={config.domainColor} onChange={(v) => updateConfig({ domainColor: v })} /><p className="hint">X:80px · bottom:80px</p></Panel>
        <Panel title="Typography"><FontWeight label="Title" font={config.fontTitle} weight={config.wtTitle} onFont={(v) => updateConfig({ fontTitle: v })} onWeight={(v) => updateConfig({ wtTitle: v })} /><FontWeight label="Paragraph" font={config.fontPara} weight={config.wtPara} onFont={(v) => updateConfig({ fontPara: v })} onWeight={(v) => updateConfig({ wtPara: v })} /><FontWeight label="CTA" font={config.fontCta} weight={config.wtCta} onFont={(v) => updateConfig({ fontCta: v })} onWeight={(v) => updateConfig({ wtCta: v })} /></Panel>
        <Panel title="Colors"><GradientColor label="Title Color" enabled={config.titleGrad} solid={config.titleColor} g1={config.titleG1} g2={config.titleG2} onToggle={(v) => updateConfig({ titleGrad: v })} onSolid={(v) => updateConfig({ titleColor: v })} onG1={(v) => updateConfig({ titleG1: v })} onG2={(v) => updateConfig({ titleG2: v })} /><div className="color-grid"><Color label="Paragraph" value={config.paraColor} onChange={(v) => updateConfig({ paraColor: v })} /><Color label="CTA Text" value={config.ctaTxt} onChange={(v) => updateConfig({ ctaTxt: v })} /></div><GradientColor label="CTA Background" enabled={config.ctaGrad} solid={config.ctaBg} g1={config.ctaG1} g2={config.ctaG2} onToggle={(v) => updateConfig({ ctaGrad: v })} onSolid={(v) => updateConfig({ ctaBg: v })} onG1={(v) => updateConfig({ ctaG1: v })} onG2={(v) => updateConfig({ ctaG2: v })} /><label className="toggle-row"><span>Text Highlight BG</span><input type="checkbox" checked={config.highlight} onChange={(e) => updateConfig({ highlight: e.target.checked })} /></label>{config.highlight && <Color label="Highlight Color" value={config.highlightColor} onChange={(v) => updateConfig({ highlightColor: v })} />}</Panel>
        <Panel title="Decorative Bars"><div className="seg"><button className={config.barMode === "stack" ? "active" : ""} onClick={() => updateConfig({ barMode: "stack" })}>Stacked</button><button className={config.barMode === "side" ? "active" : ""} onClick={() => updateConfig({ barMode: "side" })}>Side by Side</button></div>{config.bars.map((bar, i) => <div className="bar-row" key={i}><input type="checkbox" checked={bar.enabled} onChange={(e) => updateBar(i, { enabled: e.target.checked })} /><input type="color" value={bar.color} onChange={(e) => updateBar(i, { color: e.target.value })} /><input type="number" value={bar.height} onChange={(e) => updateBar(i, { height: Number(e.target.value) })} /><input type="number" value={bar.weight} onChange={(e) => updateBar(i, { weight: Number(e.target.value) })} /></div>)}</Panel>
        <Panel title="Alignment"><div className="seg three">{["left", "center", "right"].map((v) => <button key={v} className={config.hAlign === v ? "active" : ""} onClick={() => updateConfig({ hAlign: v })}>{v}</button>)}</div><div className="seg three">{["top", "middle", "bottom"].map((v) => <button key={v} className={config.vAlign === v ? "active" : ""} onClick={() => updateConfig({ vAlign: v })}>{v}</button>)}</div></Panel>
        <Panel title="Sizing & Spacing"><Range label="Title Size" value={config.titleSize} min="28" max="80" onChange={(v) => updateConfig({ titleSize: v })} /><Range label="Para Size" value={config.paraSize} min="14" max="32" onChange={(v) => updateConfig({ paraSize: v })} /><Range label="CTA Size" value={config.ctaSize} min="13" max="32" onChange={(v) => updateConfig({ ctaSize: v })} /><Range label="Content W" value={config.contentWidth} min="200" max="800" onChange={(v) => updateConfig({ contentWidth: v })} /><p className="hint">Max width for title and paragraph</p><Range label="T to P Gap" value={config.gapTP} min="8" max="80" onChange={(v) => updateConfig({ gapTP: v })} /><Range label="P to CTA Gap" value={config.gapPC} min="8" max="80" onChange={(v) => updateConfig({ gapPC: v })} /></Panel>
        {config.postType === "carousel" && <Panel title="Last Slide Logo"><p className="hint">Override logo specifically for the last carousel slide.</p><ImageBox label="Last slide logo" value={config.lastLogoDataUrl} onFile={(file) => setConfigImage("lastLogoDataUrl", "last-slide-logo", file)} onClear={() => updateConfig({ lastLogoDataUrl: "" })} /><Range label="Logo H" value={config.lastLogoH} min="20" max="200" onChange={(v) => updateConfig({ lastLogoH: v })} /><div className="two"><Field label="X pos"><input type="number" value={config.lastLogoX} min="0" max="700" onChange={(e) => updateConfig({ lastLogoX: Number(e.target.value) })} /></Field><Field label="Y pos"><input type="number" value={config.lastLogoY} min="0" max="900" onChange={(e) => updateConfig({ lastLogoY: Number(e.target.value) })} /></Field></div></Panel>}
        {config.postType === "carousel" && <Panel title="Carousel Features"><label className="toggle-row"><span>Slide Indicator</span><input type="checkbox" checked={config.indicators} onChange={(e) => updateConfig({ indicators: e.target.checked })} /></label>{config.indicators && <PosGrid value={config.indicatorPos} onChange={(v) => updateConfig({ indicatorPos: v })} includeDefault={false} />}<label className="toggle-row"><span>Slide Numbering <small>(Slides 2-5 only)</small></span><input type="checkbox" checked={config.slideNumbers} onChange={(e) => updateConfig({ slideNumbers: e.target.checked })} /></label><p className="hint">Shows 01, 02, 03, 04 on mid slides</p><Field label="Alignment Scope"><div className="seg three">{["all", "first", "last"].map((v) => <button key={v} className={config.alignScope === v ? "active" : ""} onClick={() => updateConfig({ alignScope: v })}>{v === "all" ? "All Slides" : v === "first" ? "Slide 1" : "CTA Slide"}</button>)}</div></Field>{config.alignScope === "first" && <AlignOverride title="Slide 1 Alignment" h={config.slide1HAlign} v={config.slide1VAlign} onH={(v) => updateConfig({ slide1HAlign: v })} onV={(v) => updateConfig({ slide1VAlign: v })} />}{config.alignScope === "last" && <AlignOverride title="CTA Slide Alignment" h={config.ctaHAlign} v={config.ctaVAlign} onH={(v) => updateConfig({ ctaHAlign: v })} onV={(v) => updateConfig({ ctaVAlign: v })} />}<Field label="CTA Slide Domain Position"><PosGrid value={config.ctaDomainPos} onChange={(v) => updateConfig({ ctaDomainPos: v })} includeDefault /></Field></Panel>}
        <Panel title="Actions"><button className="btn-primary" onClick={generateAll} disabled={!rows.length}>Generate All Posts</button><button className="btn-secondary" onClick={downloadZip} disabled={!Object.keys(generated).length}>Download All as ZIP</button></Panel>
      </aside>
      <main><div className="main-head"><div><h2>Generated Posts</h2><p>{activeProjectId ? `Project: ${activeProject?.name} · ${rows.length} posts ready` : "No project selected"}</p></div><div className="actions"><button onClick={generateAll} disabled={!rows.length}>Generate All Posts</button><button onClick={downloadZip} disabled={!Object.keys(generated).length}>Download All as ZIP</button></div></div><PostGrid animateSeed={animateSeed} generated={generated} visible={visible} setVisible={setVisible} onDownload={downloadPost} onEdit={(index) => setEditing({ index, row: generated[index].rowData })} onImage={setFirstSlideImage} /></main>
    </div>
    {editing && <EditModal row={editing.row} config={config} onClose={() => setEditing(null)} onSave={applyEdit} />}
    {showNewProjectModal && <NewProjectModal onClose={() => setShowNewProjectModal(false)} onCreate={createNewProject} creating={creatingProject} />}
    <div ref={renderRef} className="render-area" />
    {toast && <div className="toast">{toast}</div>}
  </div>;
}

function NewProjectModal({ onClose, onCreate, creating }) {
  const [name, setName] = React.useState("");
  function submit() { if (name.trim() && !creating) onCreate(name); }
  return <div className="modal"><div className="dialog" style={{ maxWidth: 420 }}>
    <div className="dialog-head"><h2>New Project</h2><button onClick={onClose}>×</button></div>
    <div className="dialog-body" style={{ display: "block", padding: "24px" }}>
      <Field label="Project Name">
        <input autoFocus value={name} placeholder="e.g. Q2 Campaign" onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} />
      </Field>
      <p className="hint" style={{ marginTop: 8 }}>After creating, upload an Excel file to add posts.</p>
    </div>
    <div className="dialog-foot">
      <button onClick={onClose}>Cancel</button>
      <button onClick={submit} disabled={!name.trim() || creating}>{creating ? "Creating…" : "Create Project"}</button>
    </div>
  </div></div>;
}

function Panel({ title, children, defaultOpen = false }) {
  const [open, setOpen] = React.useState(defaultOpen);
  return <section className={`panel ${open ? "open" : "closed"}`}><button type="button" className="panel-head" onClick={() => setOpen((v) => !v)}><span><i />{title}</span><b>{open ? "−" : "+"}</b></button>{open && <div className="panel-body">{children}</div>}</section>;
}
function Stat({ label, value }) { return <div className="stat"><b>{value}</b><span>{label}</span></div>; }
function Field({ label, children }) { return <label className="field"><span>{label}</span>{children}</label>; }
function Color({ label, value, onChange }) { return <Field label={label}><input type="color" value={value} onChange={(e) => onChange(e.target.value)} /></Field>; }
function Range({ label, value, min, max, onChange }) { return <Field label={label}><div className="range"><input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} /><em>{value}px</em></div></Field>; }
function Select({ label, value, onChange }) { return <Field label={label}><select value={value} onChange={(e) => onChange(e.target.value)}>{fonts.map((f) => <option key={f}>{f}</option>)}</select></Field>; }
function FontWeight({ label, font, weight, onFont, onWeight }) {
  return <div className="font-row"><Select label={`${label} Font`} value={font} onChange={onFont} /><Field label="Weight"><select value={weight} onChange={(e) => onWeight(Number(e.target.value))}><option value={400}>Regular</option><option value={500}>Medium</option><option value={600}>Semi-Bold</option><option value={700}>Bold</option></select></Field></div>;
}
function GradientColor({ label, enabled, solid, g1, g2, onToggle, onSolid, onG1, onG2 }) {
  return <div className="grad-block"><label className="toggle-row"><span>{label}</span><em>Gradient</em><input type="checkbox" checked={enabled} onChange={(e) => onToggle(e.target.checked)} /></label>{enabled ? <div className="grad-colors"><input type="color" value={g1} onChange={(e) => onG1(e.target.value)} /><b>to</b><input type="color" value={g2} onChange={(e) => onG2(e.target.value)} /><small>Gradient</small></div> : <div className="grad-colors"><input type="color" value={solid} onChange={(e) => onSolid(e.target.value)} /><small>Solid</small></div>}</div>;
}
function PosGrid({ value, onChange, includeDefault }) {
  const options = includeDefault ? [["default", "Default"], ["tl", "Top Left"], ["tr", "Top Right"], ["bl", "Bot Left"], ["br", "Bot Right"], ["cb", "Center Bot"]] : [["tl", "Top Left"], ["tr", "Top Right"], ["bl", "Bot Left"], ["br", "Bot Right"], ["cb", "Center Bot"]];
  return <div className="pos-grid">{options.map(([key, label]) => <button key={key} className={value === key ? "active" : ""} onClick={() => onChange(key)}>{label}</button>)}</div>;
}
function AlignOverride({ title, h, v, onH, onV }) {
  return <div className="override"><b>{title}</b><span>Horizontal</span><div className="seg three">{["left", "center", "right"].map((x) => <button key={x} className={h === x ? "active" : ""} onClick={() => onH(x)}>{x}</button>)}</div><span>Vertical</span><div className="seg three">{["top", "middle", "bottom"].map((x) => <button key={x} className={v === x ? "active" : ""} onClick={() => onV(x)}>{x}</button>)}</div></div>;
}
function ImageBox({ value, onFile, onClear, label }) {
  const displayUrl = absoluteAssetUrl(value);
  return <label className={`image-box ${value ? "has-image" : ""}`} style={value ? { backgroundImage: `url(${displayUrl})` } : {}}><input hidden type="file" accept="image/*" onChange={(e) => onFile?.(e.target.files[0])} />{value && <button type="button" onClick={(e) => { e.preventDefault(); onClear?.(); }}>×</button>}<span>{label}</span></label>;
}
function PostGrid({ generated, visible, setVisible, onDownload, onEdit, onImage, animateSeed }) {
  const entries = Object.entries(generated);
  if (!entries.length) return <div className="empty"><div>✦</div><h3>Upload an Excel file and generate posts</h3><p>Your rendered cards will appear here.</p></div>;
  return <div className="posts-grid" data-anim={animateSeed}>{entries.map(([idx, post], i) => {
    const current = visible[idx] || 0;
    return <article className="post-card anim-in" style={{ "--stagger": `${Math.min(i, 18) * 45}ms` }} key={idx}><div className="card-head"><span>{post.type}</span><small>#{Number(idx) + 1} · {(post.rowData.title || post.rowData.slide1_title || "Untitled").slice(0, 24)}</small></div><div className="status">● Ready</div><Preview html={post.slides[current]} />{post.slides.length > 1 && <div className="dots">{post.slides.map((_, i) => <button key={i} className={i === current ? "active" : ""} onClick={() => setVisible((prev) => ({ ...prev, [idx]: i }))} />)}</div>}<div className="card-actions"><button onClick={() => onEdit(idx)}>✎ Edit</button>{post.type === "carousel" && current === 0 && <label className="img-btn"><input hidden type="file" accept="image/*" onChange={(e) => onImage(Number(idx), e.target.files[0])} />{post.rowData.firstSlideImage ? "✓ Image" : "▣ Image"}</label>}<button onClick={() => onDownload(idx)}>⬇ PNG</button></div></article>;
  })}</div>;
}
function Preview({ html }) {
  const ref = React.useRef(null);
  const [width, setWidth] = React.useState(0);
  React.useEffect(() => {
    if (!ref.current) return;
    const update = () => setWidth(ref.current?.clientWidth || 0);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  const scale = width ? width / 800 : 0.3;
  return <div ref={ref} className="preview" style={{ height: `${1000 * scale}px` }}><div style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: 800, height: 1000 }} dangerouslySetInnerHTML={{ __html: html }} /></div>;
}
function EditModal({ row, onSave, onClose, config }) {
  const [draft, setDraft] = React.useState(row);
  const [localConfig, setLocalConfig] = React.useState(config);
  const isCarousel = (draft.post_type || "single").toLowerCase().trim() === "carousel";
  const [slide, setSlide] = React.useState(0);
  const keys = isCarousel ? Array.from({ length: 6 }, (_, i) => i) : [0];
  const html = slidesFor(draft, localConfig)[slide] || slidesFor(draft, localConfig)[0];
  function set(key, value) { setDraft((prev) => ({ ...prev, [key]: value })); }
  function setLocal(patch) { setLocalConfig((prev) => ({ ...prev, ...patch })); }
  return <div className="modal"><div className="dialog">
    <div className="dialog-head"><h2>Edit Post</h2><button onClick={onClose}>×</button></div>
    <div className="dialog-body">
      <div className="edit-fields">
        <div className="modal-section-title">Slide Content</div>
        {isCarousel && <div className="tabs">{keys.map((i) => <button key={i} className={slide === i ? "active" : ""} onClick={() => setSlide(i)}>Slide {i + 1}</button>)}</div>}
        {isCarousel ? <>
          {slide === 0 && <Field label="Title"><textarea value={draft.slide1_title || ""} onChange={(e) => set("slide1_title", e.target.value)} /></Field>}
          {slide > 0 && slide < 5 && <><Field label="Title"><textarea value={draft[`slide${slide + 1}_title`] || ""} onChange={(e) => set(`slide${slide + 1}_title`, e.target.value)} /></Field><Field label="Paragraph"><textarea value={draft[`slide${slide + 1}_paragraph`] || ""} onChange={(e) => set(`slide${slide + 1}_paragraph`, e.target.value)} /></Field></>}
          {slide === 5 && <><Field label="Title"><textarea value={draft.slide6_title || ""} onChange={(e) => set("slide6_title", e.target.value)} /></Field><Field label="CTA Text"><input value={draft.cta_text || ""} onChange={(e) => set("cta_text", e.target.value)} /></Field></>}
        </> : <>
          <Field label="Title"><textarea value={draft.title || ""} onChange={(e) => set("title", e.target.value)} /></Field>
          <Field label="Paragraph"><textarea value={draft.paragraph || ""} onChange={(e) => set("paragraph", e.target.value)} /></Field>
          <Field label="CTA Text"><input value={draft.cta_text || ""} onChange={(e) => set("cta_text", e.target.value)} /></Field>
        </>}
        <div className="modal-section-title">Alignment</div>
        <Field label="Horizontal"><div className="seg three modal-seg">{["left", "center", "right"].map((v) => <button key={v} className={localConfig.hAlign === v ? "active" : ""} onClick={() => setLocal({ hAlign: v })}>{v === "left" ? "←" : v === "right" ? "→" : "↔"}</button>)}</div></Field>
        <Field label="Vertical"><div className="seg three modal-seg">{["top", "middle", "bottom"].map((v) => <button key={v} className={localConfig.vAlign === v ? "active" : ""} onClick={() => setLocal({ vAlign: v })}>{v === "top" ? "↑" : v === "bottom" ? "↓" : "↕"}</button>)}</div></Field>
        <div className="modal-section-title">Logo & Content Size</div>
        <Range label="Logo H" value={localConfig.logoH} min="20" max="200" onChange={(v) => setLocal({ logoH: v })} />
        <Range label="Content W" value={localConfig.contentWidth} min="200" max="800" onChange={(v) => setLocal({ contentWidth: v })} />
        <div className="modal-section-title">Spacing</div>
        <Range label="Title to Para" value={localConfig.gapTP} min="8" max="80" onChange={(v) => setLocal({ gapTP: v })} />
        <Range label="Para to CTA" value={localConfig.gapPC} min="8" max="80" onChange={(v) => setLocal({ gapPC: v })} />
      </div>
      <div className="modal-preview"><div className="modal-section-title">Live Preview</div><Preview html={html} /></div>
    </div>
    <div className="dialog-foot"><button onClick={onClose}>Cancel</button><button onClick={() => onSave(draft, localConfig)}>Apply Changes</button></div>
  </div></div>;
}
createRoot(document.getElementById("root")).render(<App />);
