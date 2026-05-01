export const RAW_FUNCTIONS_URL = String(import.meta.env.VITE_FUNCTIONS_URL || "");
export const FORCE_CROSS_ORIGIN = String(import.meta.env.VITE_FORCE_CROSS_ORIGIN_FUNCTIONS_URL || "") === "1";

export const isFirebaseHostingOrigin = () => {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname || "";
  return host.endsWith(".web.app") || host.endsWith(".firebaseapp.com");
};

export const resolveFunctionsBaseUrl = () => {
  if (typeof window !== "undefined" && isFirebaseHostingOrigin() && !FORCE_CROSS_ORIGIN) return "";
  return RAW_FUNCTIONS_URL;
};

export const FUNCTIONS_URL = resolveFunctionsBaseUrl();

export const fnUrl = (endpoint) => {
  const base = String(FUNCTIONS_URL || "").replace(/\/+$/, "");
  const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  return base ? `${base}${path}` : path;
};
