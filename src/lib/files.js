export const fileToDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

/** Low-res JPEG data URL for grid thumbnails (skip SVG / non-raster). */
export const fileToThumbnailDataUrl = (file, { maxEdge = 240, quality = 0.78 } = {}) => new Promise((resolve) => {
  if (!file?.type?.startsWith("image/") || file.type === "image/svg+xml") {
    resolve(null);
    return;
  }
  const objectUrl = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    try {
      let { width, height } = img;
      const scale = Math.min(1, maxEdge / Math.max(width, height, 1));
      width = Math.round(width * scale);
      height = Math.round(height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(objectUrl);
        resolve(null);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL("image/jpeg", quality);
      URL.revokeObjectURL(objectUrl);
      resolve(dataUrl);
    } catch {
      URL.revokeObjectURL(objectUrl);
      resolve(null);
    }
  };
  img.onerror = () => {
    URL.revokeObjectURL(objectUrl);
    resolve(null);
  };
  img.src = objectUrl;
});

export const downloadBlob = (blob, name) => {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
};

export const dataUrlToFile = async (dataUrl, fileName) => {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return new File([blob], fileName, { type: blob.type });
};

