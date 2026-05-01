# Social Media Post Generator

Generate branded single-post and carousel images from Excel data. Built with React + Vite, powered by Firebase (Hosting, Cloud Functions, Firestore, Storage).

## Features

- Create named projects, then load Excel files into them
- Re-uploading Excel to the same project updates rows — no duplicate projects
- Generate single posts or 6-slide carousels with live preview
- Upload background, logo, and per-row first-slide images (stored in Firebase Storage)
- Edit post content and alignment inline
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
│   └── main.jsx          # React app (single file)
├── functions/
│   └── index.js          # Cloud Functions: getProjects, createProject, saveProject, uploadAsset
├── firebase.json         # Hosting + Functions config
├── firestore.rules       # Firestore security rules
├── storage.rules         # Storage security rules
├── vite.config.js
└── .env.example          # Required environment variables
```

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

Edit `.firebaserc`:
```json
{
  "projects": {
    "default": "YOUR_PROJECT_ID"
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

## Usage

1. Click **+ New Project** and enter a project name
2. Upload an Excel file into the project
3. Configure theme, colors, fonts, and branding in the sidebar
4. Click **Generate All Posts**
5. Download individual PNGs or all as ZIP

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
