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
  const k = normalizeKind(kind).toLowerCase();
  if (k === "background" || k === "logo" || k === "last-slide-logo") return k;
  if (k.startsWith("first-slide")) return "first-slide";
  return k;
}

/** Filename from uploadAsset: `{ms}-{safeKind}.{ext}` — derive kind segment for matching. */
function kindSegmentFromStorageFileName(fileName) {
  const noExt = String(fileName || "").replace(/\.[^.]+$/i, "");
  const m = noExt.match(/^(\d+)-(.+)$/);
  return m ? m[2] : "";
}

function storageObjectMatchesBaseKind(fileName, baseKind) {
  const segment = kindSegmentFromStorageFileName(fileName);
  if (!segment) return false;
  return baseKindFromKind(segment) === baseKind;
}

function storageFolderForBaseKind(baseKind) {
  if (baseKind === "logo") return "logo";
  if (baseKind === "first-slide") return "first-slide-image";
  if (baseKind === "background") return "background";
  if (baseKind === "last-slide-logo") return "last-slide-logo";
  return "other";
}

function publicGsUrl(bucketName, storagePath) {
  return `https://storage.googleapis.com/${bucketName}/${storagePath}`;
}

function mainToThumbStoragePath(mainStoragePath) {
  const s = String(mainStoragePath || "");
  const i = s.lastIndexOf(".");
  if (i <= 0) return `${s}.thumb.jpg`;
  return `${s.slice(0, i)}.thumb.jpg`;
}

function isThumbObjectName(name) {
  return /\.thumb\.(jpg|jpeg)$/i.test(String(name || ""));
}

async function listBucketAssetsMerged(bucket, baseKind, firestoreAssets) {
  const bucketName = bucket.name;
  const seenUrls = new Set(firestoreAssets.map((a) => a.url).filter(Boolean));
  const folder = storageFolderForBaseKind(baseKind);
  const projSnap = await db.collection("projects").get();
  const projectIds = projSnap.docs.map((d) => d.id);
  const extra = [];

  const pushMainFile = (projectId, storagePath, name) => {
    if (!name || name.startsWith(".") || isThumbObjectName(name)) return;
    if (!storageObjectMatchesBaseKind(name, baseKind)) return;
    const url = publicGsUrl(bucketName, storagePath);
    if (seenUrls.has(url)) return;
    seenUrls.add(url);
    const segment = kindSegmentFromStorageFileName(name);
    const tsMatch = name.match(/^(\d+)-/);
    const tsMs = tsMatch ? Number(tsMatch[1]) : 0;
    extra.push({
      id: `__storage__:${storagePath}`,
      libraryBacked: false,
      projectId,
      url,
      storagePath,
      fileName: name,
      fullKind: segment,
      baseKind,
      createdAt: { _seconds: Math.floor(tsMs / 1000), _nanoseconds: 0 },
    });
  };

  await Promise.all(projectIds.map(async (projectId) => {
    const typedPrefix = `projects/${projectId}/assets/${folder}/`;
    try {
      const [typedFiles] = await bucket.getFiles({ prefix: typedPrefix, maxResults: 400 });
      for (const f of typedFiles) {
        if (!f.name.startsWith(typedPrefix)) continue;
        const rel = f.name.slice(typedPrefix.length);
        if (!rel || rel.includes("/")) continue;
        pushMainFile(projectId, f.name, rel);
      }
    } catch (err) {
      console.warn("listBucket typed", typedPrefix, err?.message || err);
    }

    const legacyPrefix = `projects/${projectId}/assets/`;
    try {
      const [legacyFiles] = await bucket.getFiles({ prefix: legacyPrefix, maxResults: 500 });
      for (const f of legacyFiles) {
        const parts = f.name.split("/");
        if (parts.length !== 4) continue;
        const name = parts[3] || "";
        pushMainFile(projectId, f.name, name);
      }
    } catch (err) {
      console.warn("listBucket legacy", legacyPrefix, err?.message || err);
    }
  }));

  return extra;
}

async function attachThumbUrlsForPage(bucket, assets) {
  const bucketName = bucket.name;
  return Promise.all(assets.map(async (asset) => {
    const next = { ...asset };
    if (next.thumbUrl) return next;
    if (!next.storagePath) return next;
    if (/\.svg$/i.test(next.storagePath)) {
      next.thumbUrl = next.url;
      return next;
    }
    const thumbPath = mainToThumbStoragePath(next.storagePath);
    try {
      const [exists] = await bucket.file(thumbPath).exists();
      if (exists) {
        next.thumbUrl = publicGsUrl(bucketName, thumbPath);
        next.thumbStoragePath = thumbPath;
      }
    } catch {
      // ignore missing thumb
    }
    return next;
  }));
}

function assetSortMs(a) {
  const c = a.createdAt;
  if (c && typeof c.toMillis === "function") return c.toMillis();
  if (c && typeof c._seconds === "number") return c._seconds * 1000;
  const m = String(a.fileName || "").match(/^(\d+)-/);
  return m ? Number(m[1]) : 0;
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
      const folder = storageFolderForBaseKind(baseKind);
      const ts = Date.now();
      const assetName = `${ts}-${safeKind}${ext}`;
      const storagePath = `projects/${projectId}/assets/${folder}/${assetName}`;

      const bucket = getStorage().bucket();
      const file = bucket.file(storagePath);
      await file.save(buffer, { contentType: mime });
      await file.makePublic();

      const url = publicGsUrl(bucket.name, storagePath);

      let thumbUrl = null;
      let thumbStoragePath = null;
      const thumbRaw = req.body?.thumbDataUrl;
      if (typeof thumbRaw === "string" && thumbRaw.length > 30) {
        const tm = thumbRaw.match(/^data:([^;]+);base64,(.+)$/);
        if (tm) {
          const thumbBuf = Buffer.from(tm[2], "base64");
          thumbStoragePath = `projects/${projectId}/assets/${folder}/${ts}-${safeKind}.thumb.jpg`;
          const thumbFile = bucket.file(thumbStoragePath);
          await thumbFile.save(thumbBuf, { contentType: "image/jpeg" });
          await thumbFile.makePublic();
          thumbUrl = publicGsUrl(bucket.name, thumbStoragePath);
        }
      }

      const assetRef = await db.collection("assetLibrary").add({
        projectId,
        fullKind,
        baseKind,
        fileName: String(fileName || assetName),
        url,
        thumbUrl: thumbUrl || null,
        storagePath,
        thumbStoragePath: thumbStoragePath || null,
        createdAt: FieldValue.serverTimestamp(),
      });
      res.json({ ok: true, url, thumbUrl: thumbUrl || null, mime, assetId: assetRef.id });
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
    const { kind } = req.body || {};
    const page = Math.max(1, Number(req.body?.page) || 1);
    const pageSize = Math.min(50, Math.max(1, Number(req.body?.pageSize) || 10));
    const baseKind = baseKindFromKind(kind);

    const fsLimit = 500;
    const query = db.collection("assetLibrary").where("baseKind", "==", baseKind).orderBy("createdAt", "desc").limit(fsLimit);

    const snapshot = await query.get();
    const assets = [];
    snapshot.forEach((doc) => {
      const data = doc.data() || {};
      assets.push({ ...data, id: doc.id, libraryBacked: true });
    });

    const bucket = getStorage().bucket();
    const fromBucket = await listBucketAssetsMerged(bucket, baseKind, assets);
    assets.push(...fromBucket);

    const seen = new Set();
    const deduped = [];
    for (const a of assets) {
      const u = a.url;
      if (!u || seen.has(u)) continue;
      seen.add(u);
      deduped.push(a);
    }
    deduped.sort((a, b) => assetSortMs(b) - assetSortMs(a));

    const total = deduped.length;
    const start = (page - 1) * pageSize;
    const pageSlice = deduped.slice(start, start + pageSize);
    const withThumbs = await attachThumbUrlsForPage(bucket, pageSlice);

    res.json({
      ok: true,
      assets: withThumbs,
      total,
      page,
      pageSize,
      hasMore: start + pageSize < total,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

async function applyDefaultImageToSettingsAndProjects(url, baseKindRaw) {
  const baseKind = baseKindFromKind(baseKindRaw);
  if (!url || !baseKind) throw new Error("asset missing url/baseKind");

  const prev = await readAssetDefaults();
  const patch = { ...prev, updatedAt: FieldValue.serverTimestamp() };
  if (baseKind === "background") patch.backgroundUrl = url;
  else if (baseKind === "logo") patch.logoUrl = url;
  else if (baseKind === "last-slide-logo") patch.lastSlideLogoUrl = url;
  else if (baseKind === "first-slide") patch.firstSlideImageUrl = url;
  else throw new Error("unsupported asset type");

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
  return { assetDefaults: defaults, projects };
}

export const setDefaultAsset = onRequest({ cors, invoker }, async (req, res) => {
  setCors(res);
  if (req.method === "OPTIONS") return res.sendStatus(204);
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  try {
    const { assetId, defaultFromUrl } = req.body || {};
    const fromUrl = defaultFromUrl?.url && defaultFromUrl?.baseKind
      ? { url: String(defaultFromUrl.url), baseKind: defaultFromUrl.baseKind }
      : null;

    let url;
    let baseKindRaw;
    if (fromUrl) {
      url = fromUrl.url;
      baseKindRaw = fromUrl.baseKind;
    } else if (assetId) {
      const snap = await db.collection("assetLibrary").doc(String(assetId)).get();
      if (!snap.exists) return res.status(404).json({ error: "asset not found" });
      const asset = snap.data() || {};
      url = asset.url;
      baseKindRaw = asset.baseKind || asset.fullKind;
    } else {
      return res.status(400).json({ error: "assetId or defaultFromUrl required" });
    }

    const { assetDefaults, projects } = await applyDefaultImageToSettingsAndProjects(url, baseKindRaw);
    res.json({ ok: true, assetDefaults, projects });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
