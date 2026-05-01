const normalizeKind = (kind) => String(kind || "image").replace(/[^a-z0-9-]/gi, "-").slice(0, 80);

export const baseKindFromPickerKind = (kind) => {
  const k = normalizeKind(kind).toLowerCase();
  if (k === "background" || k === "logo" || k === "last-slide-logo") return k;
  if (k.startsWith("first-slide")) return "first-slide";
  return k;
};

/** URL of global default image for this picker kind (for modal header preview). */
export const defaultAssetUrlForPickerKind = (kind, assetDefaults = {}) => {
  const bk = baseKindFromPickerKind(kind);
  if (bk === "background") return assetDefaults.backgroundUrl || "";
  if (bk === "logo") return assetDefaults.logoUrl || "";
  if (bk === "last-slide-logo") return assetDefaults.lastSlideLogoUrl || "";
  if (bk === "first-slide") return assetDefaults.firstSlideImageUrl || "";
  return "";
};
