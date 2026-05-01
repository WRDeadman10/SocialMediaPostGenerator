# Social Media Post Generator

Generate branded single-post and carousel images from Excel data. Built with React + Vite, powered by Firebase (Hosting, Cloud Functions, Firestore, Storage).

## Features

- Create named projects, then load Excel files into them
- Re-uploading Excel to the same project updates rows — no duplicate projects
- Generate single posts or 6-slide carousels with live preview
- Upload background, logo, last-slide logo, and per-row first-slide images (Firebase Storage)
- **Asset library modal:** paginated inventory (10 per page), default preview in the header, low-res thumbnails in the grid, full-resolution preview on hover/focus, “Upload new” as the first card
- **Storage layout (new uploads):** images are stored under typed folders per project — `assets/logo/`, `assets/background/`, `assets/last-slide-logo/`, `assets/first-slide-image/` (legacy flat `assets/` files are still listed)
- Client-generated **JPEG thumbnails** on upload; listings prefer `thumbUrl` when present
- Edit post content and alignment inline
- Smooth UI animations + “card deal” animation when posts populate (with subtle SFX)
- Download individual posts or all as ZIP

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
│   ├── components/              # UI (sidebar, grid, modals, preview)
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

## Usage

1. Click **+ New Project** and enter a project name
2. Upload an Excel file into the project
3. Configure theme, colors, fonts, and branding in the sidebar
4. Use image pickers (background, logo, etc.) to choose from the library or upload new assets
5. Click **Generate All Posts**
6. Download individual PNGs or all as ZIP

## Troubleshooting

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
| post_type | slide1_title | slide2_title | slide2_paragraph | ... | slide6_title | cta_text |
|---|---|---|---|---|---|---|
| carousel | Intro | Slide 2 | Body | ... | Final | Learn More |

Download templates from the Upload Excel panel in the app.

## Security Notes

Current Firestore and Storage rules are **open** (no authentication). Before making this app public, add Firebase Authentication and restrict rules accordingly.
