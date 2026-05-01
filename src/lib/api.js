import {
  FORCE_CROSS_ORIGIN,
  FUNCTIONS_URL,
  RAW_FUNCTIONS_URL,
  isFirebaseHostingOrigin,
} from "./env.js";

export const postJson = async (url, body) => {
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
      isFirebaseHostingOrigin() && RAW_FUNCTIONS_URL.includes("cloudfunctions.net") && !FORCE_CROSS_ORIGIN
        ? "Production build has VITE_FUNCTIONS_URL pointing at cloudfunctions.net. Remove it from build env (recommended) so Hosting rewrites use same-origin /uploadAsset, then redeploy hosting."
        : String(FUNCTIONS_URL || "").includes("YOUR_PROJECT_ID")
          ? "Set VITE_FUNCTIONS_URL (project id) in .env.local"
          : (window.location.protocol === "https:" && String(FUNCTIONS_URL || "").startsWith("http:"))
            ? "Your app is HTTPS but VITE_FUNCTIONS_URL is HTTP (mixed content). Use HTTPS Cloud Functions URL."
            : "If using emulators, run `npm run emulate` and ensure VITE_FUNCTIONS_URL matches emulator project id.";
    throw new Error(`Failed to fetch. ${hint}`);
  }
};
