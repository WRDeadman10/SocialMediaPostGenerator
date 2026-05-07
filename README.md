# Social Media Post Generator

Generate branded single-post and carousel images from Excel data. Built with React + Vite, powered by Firebase (Hosting, Cloud Functions, Firestore, Storage).

## Features

- Create named projects, then load Excel files into them (re-upload updates rows — no duplicate projects)
- Step-by-step workflow: Upload Data → Configure Branding → Adjust Layout → Preview → Export
- 3-panel editor UI:
  - Left: project + Excel + branding + layout controls
  - Center: live canvas with pan/zoom/fit + slide thumbnails + inline text editing
  - Right: outputs list + batch export tools
- Generate single posts or 6-slide carousels with live preview
- Upload background, logo, last-slide logo, and per-row first-slide images (Firebase Storage)
- **Asset library modal:** paginated inventory (10 per page), default preview in the header, low-res thumbnails in the grid, full-resolution preview on hover/focus, "Upload new" as the first card, and a new **"Generate" tab** for AI image generation with model selection (Claude, Gemini, Codex) and an interactive thumbnail gallery.
- **Desktop Application (Tauri):** Wrapped with Tauri to build native Windows executables (requires Rust and MSVC tools).
- **AI Image Generation (Desktop Only):** Generate high-quality images directly in the Asset Picker via agentic CLI tools. Supports **Claude Code**, **Gemini CLI**, and **Codex**.
- **Storage layout (new uploads):** images are stored under typed folders per project — `assets/logo/`, `assets/background/`, `assets/last-slide-logo/`, `assets/first-slide-image/` (legacy flat `assets/` files are still listed)
- Client-generated **JPEG thumbnails** on upload; listings prefer `thumbUrl` when present
- Edit post content inline (click text on the canvas to edit)
- Edit full post fields via the **Edit** button (modal editor)
- Smooth UI animations + “card deal” animation when posts populate (with subtle SFX)
- Export PNG/JPG per slide, export selected slides, or download all as ZIP

## AI Image Generation Setup

To enable AI image generation in the desktop app, you should install at least one of the supported CLI tools globally:

### 1. Claude Code (Recommended)
No API key required if already logged in via CLI.
```bash
npm i -g @anthropic-ai/claude-code
```

### 2. Gemini CLI
```bash
npm i -g @google/gemini-cli
```

### 3. Codex
Requires `OPENAI_API_KEY` environment variable.
```bash
npm i -g @openai/codex
# Windows: set OPENAI_API_KEY=sk-...
```

## Tech Stack

| Layer | Service |
|---|---|
| Frontend | React 19 + Vite |
| Hosting | Firebase Hosting |
| Backend | Firebase Cloud Functions (Node 20) |
| Database | Firestore |
| Images | Firebase Storage |

## Project Structure

```
├── src/
│   ├── main.jsx                 # App bootstrap (root + styles)
│   ├── app/App.jsx              # Shell: state, hooks, layout
│   ├── components/              # UI (shell, panels, canvas editor, modals, preview)
│   ├── hooks/                   # useImagePipeline, usePostGeneration, persistence, etc.
│   └── lib/                     # API helpers, slide HTML, constants, asset defaults
├── functions/
│   └── index.js                 # Cloud Functions (see below)
├── firebase.json                # Hosting + Functions rewrites
├── firestore.rules
├── storage.rules
├── vite.config.js
└── .env.example                 # Environment variables
```

### Cloud Functions (HTTP)

| Endpoint | Purpose |
|---|---|
| `getProjects` | Load all projects + merged `assetDefaults` |
| `createProject` | Create project document |
| `saveProject` | Persist project (posts stripped) |
| `deleteProject` | Remove project |
| `uploadAsset` | Save image under typed folder + optional thumbnail; writes `assetLibrary` |
| `listAssets` | List assets by kind (Firestore + Storage), pagination (`page`, `pageSize`), thumb URLs |
| `setDefaultAsset` | Set global default from library id or `{ defaultFromUrl }` |

## Setup

### Prerequisites

- Node.js 20+
- Firebase CLI: `npm install -g firebase-tools`

### 1. Firebase project

```bash
firebase login
# Use existing project or create one at https://console.firebase.google.com
```

Enable these services in the Firebase console:
- Firestore Database
- Firebase Storage
- Cloud Functions

### 2. Configure

```bash
# Set your project ID in .firebaserc
# Copy env example and fill in your project ID
cp .env.example .env.local
```

Edit `.env.local`:
```
# Local emulator
VITE_FUNCTIONS_URL=http://127.0.0.1:5001/YOUR_PROJECT_ID/us-central1

# Production
# VITE_FUNCTIONS_URL=https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net
```

In production, you can also omit `VITE_FUNCTIONS_URL` entirely and let Firebase Hosting rewrites proxy requests (recommended to avoid CORS).

Important: Vite bakes `VITE_*` values at **build time**. If your CI sets `VITE_FUNCTIONS_URL` to `https://...cloudfunctions.net`, the browser will keep doing cross-origin calls and you can still hit CORS even with Hosting rewrites configured.

Edit `.firebaserc`:
```json
{
  "projects": {
    "default": "socialmediapostgenerator-007"
  }
}
```

### 3. Install dependencies

```bash
npm install
cd functions && npm install && cd ..
```

### 4. Local development

Terminal 1 — Firebase emulators:
```bash
npm run emulate
```

Terminal 2 — Vite dev server:
```bash
npm run dev
```

### 5. Deploy

```bash
# Deploy Firestore and Storage rules first
firebase deploy --only firestore:rules,storage:rules

# Build frontend and deploy everything
npm run deploy
```

After changing Storage paths or asset APIs, redeploy functions:

```bash
firebase deploy --only functions
```

### 6. Desktop Build (Tauri)

To run the desktop application locally:
```bash
npm run tauri dev
```

To build the executable (requires Rust and MSVC C++ build tools):
```bash
npm run tauri build
```
*(Note: If you encounter an Out of Memory (OOM) error like LNK1102 during the build process, you may need to increase your system's swap space or RAM availability.)*

## Usage

1. Click **+ New Project** and enter a project name
2. Upload an Excel file into the project
3. Configure branding (background/logo) + layout in the left panel
4. Click **Generate All Posts**
5. Select an output on the right to open it in the canvas
6. Edit text directly on the canvas (click text), or click **Edit** for full field editing
7. Export from the right panel (PNG/JPG, selected slides, or ZIP)

## Troubleshooting

### Fatal error LNK1207: incompatible PDB format
This can happen during `npm run tauri dev` or `build` if the debug database becomes corrupted.
**Fix:** Delete the `src-tauri/target` directory and rebuild:
```powershell
cd src-tauri; cargo clean; cd ..; npm run tauri dev
```

### Image upload fails with CORS / preflight error

If browser shows CORS preflight error like:
- `No 'Access-Control-Allow-Origin' header`

Recommended fix: route function calls through **Firebase Hosting rewrites** (same origin). Ensure `firebase.json` has rewrites for endpoints like `/uploadAsset`, `/listAssets`, then deploy:

```bash
firebase deploy --only functions,hosting
```

If you still call Cloud Functions directly across origins, make sure deployed functions include CORS enabled (Gen 2 `onRequest({ cors: true })`) and redeploy:

```bash
firebase deploy --only functions
```

If you must debug cross-origin calls anyway, set `VITE_FORCE_CROSS_ORIGIN_FUNCTIONS_URL=1` at build time (not recommended for production).

### Same-origin `/uploadAsset` returns 403

Gen2 HTTP functions run on Cloud Run. If Hosting rewrite hits the service but IAM blocks public access, you get **403**.

This repo sets `invoker: "public"` on the HTTP functions so deploy should grant unauthenticated invoke. If you still see 403 after deploy, open the function in Firebase console → **Cloud Run service** → **Security** → ensure **Allow unauthenticated invocations** is enabled (equivalent to `roles/run.invoker` for `allUsers`).

### Asset modal shows no files but objects exist in Storage

Older files may live directly under `projects/{id}/assets/` (flat). The app still lists those. New uploads go under typed subfolders. Firestore `assetLibrary` entries are created when uploads go through `uploadAsset`; bucket-only files are merged into `listAssets` by scanning Storage.

### Excel format

**Single post:**
| post_type | title | paragraph | cta_text |
|---|---|---|---|
| single | Your Title | Body text | Learn More |

**Carousel (6 slides):**
| post_type | slide1_image_prompt | slide1_title | slide2_title | slide2_paragraph | ... | slide6_title | cta_text |
|---|---|---|---|---|---|---|---|
| carousel | A futuristic city with flying cars | Intro | Slide 2 | Body | ... | Final | Learn More |

> [!TIP]
> The `slide1_image_prompt` column is automatically pre-filled in the **Generate** tab of the Asset Picker when you select a post, allowing for a seamless AI generation workflow.

Download templates from the Upload Excel panel in the app.

## Security Notes

Current Firestore and Storage rules are **open** (no authentication). Before making this app public, add Firebase Authentication and restrict rules accordingly.
