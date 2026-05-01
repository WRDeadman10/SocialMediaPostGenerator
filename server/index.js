import express from "express";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const app = express();
const port = process.env.PORT || 4321;
const appDataRoot = process.env.APPDATA || path.join(process.env.USERPROFILE || process.cwd(), "AppData", "Roaming");
const dataDir = path.join(appDataRoot, "SocialMediaPostGenerator");
const dataFile = path.join(dataDir, "data.json");
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, "..", "dist");

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});
app.use(express.json({ limit: "200mb" }));

function safeFolderName(value) {
  return String(value || "project")
    .replace(/\.[^.]+$/, "")
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100) || "project";
}
function safeFileName(value) {
  return String(value || "image")
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120) || "image";
}
function dataUrlToBuffer(dataUrl) {
  const match = String(dataUrl || "").match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error("Invalid image data");
  return { mime: match[1], buffer: Buffer.from(match[2], "base64") };
}
function extFromMime(mime, fallback = ".png") {
  return ({ "image/png": ".png", "image/jpeg": ".jpg", "image/jpg": ".jpg", "image/webp": ".webp", "image/gif": ".gif", "image/svg+xml": ".svg" }[mime] || fallback);
}

async function readProjectFolders() {
  const entries = await fs.readdir(dataDir, { withFileTypes: true }).catch(() => []);
  const projects = {};
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const projectFile = path.join(dataDir, entry.name, "project.json");
    try {
      const project = JSON.parse(await fs.readFile(projectFile, "utf8"));
      if (project?.id) projects[project.id] = project;
    } catch {
      // Ignore non-project folders.
    }
  }
  return projects;
}

async function writeProjectFolders(projects = {}) {
  await fs.mkdir(dataDir, { recursive: true });
  for (const project of Object.values(projects)) {
    const folder = safeFolderName(project.sourceFileName || project.name || project.id);
    const projectDir = path.join(dataDir, folder);
    await fs.mkdir(projectDir, { recursive: true });
    await fs.writeFile(path.join(projectDir, "project.json"), JSON.stringify(project, null, 2), "utf8");
  }
}
function getProjectFolder(projectId, projectName) {
  return safeFolderName(projectName || projectId || "project");
}

app.get("/api/app-data", async (_req, res) => {
  try {
    const raw = await fs.readFile(dataFile, "utf8");
    const data = JSON.parse(raw);
    if (data.projects) return res.json(data);
    res.json(data);
  } catch (error) {
    if (error.code === "ENOENT") {
      const projects = await readProjectFolders();
      return res.json({ version: 2, activeProjectId: Object.keys(projects)[0] || "", projects });
    }
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/app-data", async (req, res) => {
  try {
    await fs.mkdir(dataDir, { recursive: true });
    const payload = { ...req.body, savedAt: new Date().toISOString() };
    await fs.writeFile(dataFile, JSON.stringify(payload, null, 2), "utf8");
    await writeProjectFolders(payload.projects || {});
    res.json({ ok: true, path: dataFile, projectRoot: dataDir });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/assets", async (req, res) => {
  try {
    const { projectId, projectName, kind, fileName, dataUrl } = req.body || {};
    if (!projectId) return res.status(400).json({ error: "projectId is required" });
    const { mime, buffer } = dataUrlToBuffer(dataUrl);
    const projectFolder = getProjectFolder(projectId, projectName);
    const assetDir = path.join(dataDir, projectFolder, "assets");
    await fs.mkdir(assetDir, { recursive: true });
    const parsed = path.parse(safeFileName(fileName));
    const ext = parsed.ext || extFromMime(mime);
    const base = (parsed.name || kind || "image").replace(/[^a-z0-9._ -]/gi, "-");
    const assetName = `${Date.now()}-${safeFileName(kind || "image")}-${base}${ext}`;
    const assetPath = path.join(assetDir, assetName);
    await fs.writeFile(assetPath, buffer);
    res.json({
      ok: true,
      path: assetPath,
      relativePath: path.join(projectFolder, "assets", assetName),
      url: `/api/assets/${encodeURIComponent(projectFolder)}/${encodeURIComponent(assetName)}`,
      mime
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

async function sendAsset(req, res, headOnly = false) {
  const assetPath = path.join(dataDir, safeFolderName(req.params.projectFolder), "assets", safeFileName(req.params.assetName));
  try {
    await fs.access(assetPath);
    if (headOnly) return res.sendStatus(200);
    res.sendFile(assetPath);
  } catch {
    res.status(404).json({ error: "Image file is missing from saved path", path: assetPath });
  }
}

app.head("/api/assets/:projectFolder/:assetName", (req, res) => sendAsset(req, res, true));
app.get("/api/assets/:projectFolder/:assetName", (req, res) => sendAsset(req, res, false));

app.get("/api/app-data/path", (_req, res) => {
  res.json({ path: dataFile, projectRoot: dataDir });
});

app.use(express.static(distDir));
app.use((_req, res) => {
  res.sendFile(path.join(distDir, "index.html"));
});

app.listen(port, () => {
  console.log(`Persistence server listening on http://127.0.0.1:${port}`);
  console.log(`Saving JSON to ${dataFile}`);
});
