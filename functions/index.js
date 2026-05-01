import { onRequest } from "firebase-functions/v2/https";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

initializeApp();
const db = getFirestore();
const cors = true;

function setCors(res) {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");
}

export const getProjects = onRequest({ cors }, async (req, res) => {
  setCors(res);
  if (req.method === "OPTIONS") return res.sendStatus(204);
  try {
    const snapshot = await db.collection("projects").orderBy("updatedAt", "desc").get();
    const projects = {};
    snapshot.forEach((doc) => { projects[doc.id] = doc.data(); });
    res.json({ version: 2, projects });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export const createProject = onRequest({ cors }, async (req, res) => {
  setCors(res);
  if (req.method === "OPTIONS") return res.sendStatus(204);
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  try {
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
      config: {},
      rows: [],
      visible: {},
    };
    await db.collection("projects").doc(id).set(project);
    res.json({ ok: true, project });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export const saveProject = onRequest({ cors }, async (req, res) => {
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

export const deleteProject = onRequest({ cors }, async (req, res) => {
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
  { timeoutSeconds: 120, memory: "512MiB", cors },
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
      const safeKind = (kind || "image").replace(/[^a-z0-9-]/gi, "-").slice(0, 40);
      const assetName = `${Date.now()}-${safeKind}${ext}`;
      const storagePath = `projects/${projectId}/assets/${assetName}`;

      const bucket = getStorage().bucket();
      const file = bucket.file(storagePath);
      await file.save(buffer, { contentType: mime });
      await file.makePublic();

      const url = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;
      res.json({ ok: true, url, mime });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }
);
