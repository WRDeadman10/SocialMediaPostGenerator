import { onRequest } from "firebase-functions/v2/https";
import { initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

initializeApp();
const db = getFirestore();
const cors = true;
const invoker = "public";
const SETTINGS_DEFAULTS_DOC = "settings/assetDefaults";

function setCors(res) {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");
}

function normalizeKind(kind) {
  return String(kind || "image").replace(/[^a-z0-9-]/gi, "-").slice(0, 80);
}

function baseKindFromKind(kind) {
  const k = normalizeKind(kind);
  if (k === "background" || k === "logo" || k === "last-slide-logo") return k;
  if (k.startsWith("first-slide")) return "first-slide";
  return k;
}

async function readAssetDefaults() {
  const snap = await db.doc(SETTINGS_DEFAULTS_DOC).get();
  return snap.exists ? (snap.data() || {}) : {};
}

function mergeConfigWithDefaults(config = {}, defaults = {}) {
  const next = { ...config };
  if (!next.bgDataUrl && defaults.backgroundUrl) next.bgDataUrl = defaults.backgroundUrl;
  if (!next.logoDataUrl && defaults.logoUrl) next.logoDataUrl = defaults.logoUrl;
  if (!next.lastLogoDataUrl && defaults.lastSlideLogoUrl) next.lastLogoDataUrl = defaults.lastSlideLogoUrl;
  return next;
}

function mergeRowsWithDefaults(rows = [], defaults = {}) {
  if (!defaults.firstSlideImageUrl) return rows;
  return rows.map((row) => {
    if (row?.firstSlideImage) return row;
    return { ...row, firstSlideImage: defaults.firstSlideImageUrl, firstSlideImageName: row.firstSlideImageName || "default" };
  });
}

async function buildProjectsResponse(defaults) {
  const snapshot = await db.collection("projects").orderBy("updatedAt", "desc").get();
  const projects = {};
  snapshot.forEach((doc) => {
    const data = doc.data() || {};
    const mergedConfig = mergeConfigWithDefaults(data.config || {}, defaults);
    const mergedRows = mergeRowsWithDefaults(data.rows || [], defaults);
    projects[doc.id] = { ...data, config: mergedConfig, rows: mergedRows };
  });
  return projects;
}

export const getProjects = onRequest({ cors, invoker }, async (req, res) => {
  setCors(res);
  if (req.method === "OPTIONS") return res.sendStatus(204);
  try {
    const defaults = await readAssetDefaults();
    const projects = await buildProjectsResponse(defaults);
    res.json({ version: 2, projects, assetDefaults: defaults });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export const createProject = onRequest({ cors, invoker }, async (req, res) => {
  setCors(res);
  if (req.method === "OPTIONS") return res.sendStatus(204);
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  try {
    const defaults = await readAssetDefaults();
    const { name } = req.body || {};
    if (!name?.trim()) return res.status(400).json({ error: "name required" });
    const safeName = name.trim();
    const slug = safeName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "project";
    const id = `${slug}-${Date.now()}`;
    const now = new Date().toISOString();
    const project = {
      id,
      name: safeName,
      sourceFileName: "",
      createdAt: now,
      updatedAt: now,
      config: mergeConfigWithDefaults({}, defaults),
      rows: mergeRowsWithDefaults([], defaults),
      visible: {},
    };
    await db.collection("projects").doc(id).set(project);
    res.json({ ok: true, project, assetDefaults: defaults });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export const saveProject = onRequest({ cors, invoker }, async (req, res) => {
  setCors(res);
  if (req.method === "OPTIONS") return res.sendStatus(204);
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  try {
    const { projectId, project } = req.body || {};
    if (!projectId) return res.status(400).json({ error: "projectId required" });
    // Strip posts — regenerated from rows+config on load, too large for Firestore
    const { posts, ...toSave } = project;
    await db.collection("projects").doc(projectId).set({
      ...toSave,
      updatedAt: new Date().toISOString(),
    });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export const deleteProject = onRequest({ cors, invoker }, async (req, res) => {
  setCors(res);
  if (req.method === "OPTIONS") return res.sendStatus(204);
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  try {
    const { projectId } = req.body || {};
    if (!projectId) return res.status(400).json({ error: "projectId required" });
    await db.collection("projects").doc(projectId).delete();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const EXT_MAP = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/svg+xml": ".svg",
};

export const uploadAsset = onRequest(
  { timeoutSeconds: 120, memory: "512MiB", cors, invoker },
  async (req, res) => {
    setCors(res);
    if (req.method === "OPTIONS") return res.sendStatus(204);
    if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
    try {
      const { projectId, kind, fileName, dataUrl } = req.body || {};
      if (!projectId) return res.status(400).json({ error: "projectId required" });

      const match = String(dataUrl || "").match(/^data:([^;]+);base64,(.+)$/);
      if (!match) return res.status(400).json({ error: "Invalid image data" });
      const mime = match[1];
      const buffer = Buffer.from(match[2], "base64");

      const ext = EXT_MAP[mime] || ".png";
      const fullKind = normalizeKind(kind);
      const baseKind = baseKindFromKind(fullKind);
      const safeKind = fullKind.slice(0, 40);
      const assetName = `${Date.now()}-${safeKind}${ext}`;
      const storagePath = `projects/${projectId}/assets/${assetName}`;

      const bucket = getStorage().bucket();
      const file = bucket.file(storagePath);
      await file.save(buffer, { contentType: mime });
      await file.makePublic();

      const url = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;
      const assetRef = await db.collection("assetLibrary").add({
        projectId,
        fullKind,
        baseKind,
        fileName: String(fileName || assetName),
        url,
        storagePath,
        createdAt: FieldValue.serverTimestamp(),
      });
      res.json({ ok: true, url, mime, assetId: assetRef.id });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }
);

export const listAssets = onRequest({ cors, invoker }, async (req, res) => {
  setCors(res);
  if (req.method === "OPTIONS") return res.sendStatus(204);
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  try {
    const { kind, limit = 60 } = req.body || {};
    const baseKind = baseKindFromKind(kind);
    const max = Math.min(Number(limit) || 60, 120);

    const query = db.collection("assetLibrary").where("baseKind", "==", baseKind).orderBy("createdAt", "desc").limit(max);

    const snapshot = await query.get();
    const assets = [];
    snapshot.forEach((doc) => assets.push({ id: doc.id, ...(doc.data() || {}) }));
    res.json({ ok: true, assets });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export const setDefaultAsset = onRequest({ cors, invoker }, async (req, res) => {
  setCors(res);
  if (req.method === "OPTIONS") return res.sendStatus(204);
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  try {
    const { assetId } = req.body || {};
    if (!assetId) return res.status(400).json({ error: "assetId required" });

    const snap = await db.collection("assetLibrary").doc(String(assetId)).get();
    if (!snap.exists) return res.status(404).json({ error: "asset not found" });
    const asset = snap.data() || {};
    const url = asset.url;
    const baseKind = asset.baseKind || baseKindFromKind(asset.fullKind);
    if (!url || !baseKind) return res.status(400).json({ error: "asset missing url/baseKind" });

    const prev = await readAssetDefaults();
    const patch = { ...prev, updatedAt: FieldValue.serverTimestamp() };
    if (baseKind === "background") patch.backgroundUrl = url;
    else if (baseKind === "logo") patch.logoUrl = url;
    else if (baseKind === "last-slide-logo") patch.lastSlideLogoUrl = url;
    else if (baseKind === "first-slide") patch.firstSlideImageUrl = url;
    else return res.status(400).json({ error: "unsupported asset type" });

    await db.doc(SETTINGS_DEFAULTS_DOC).set(patch, { merge: true });

    const defaults = await readAssetDefaults();
    const projectsSnap = await db.collection("projects").get();
    const batch = db.batch();
    projectsSnap.forEach((doc) => {
      const data = doc.data() || {};
      const mergedConfig = mergeConfigWithDefaults(data.config || {}, defaults);
      const mergedRows = mergeRowsWithDefaults(data.rows || [], defaults);
      batch.set(doc.ref, { ...data, config: mergedConfig, rows: mergedRows, updatedAt: new Date().toISOString() }, { merge: true });
    });
    await batch.commit();

    const projects = await buildProjectsResponse(defaults);
    res.json({ ok: true, assetDefaults: defaults, projects });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
