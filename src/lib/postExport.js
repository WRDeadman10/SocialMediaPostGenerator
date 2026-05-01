import html2canvas from "html2canvas";
import JSZip from "jszip";
import { downloadBlob } from "./files.js";

const safeFilePart = (value) => String(value || "export")
  .trim()
  .replace(/[<>:"/\\|?*]+/g, "-")
  .replace(/\s+/g, "_")
  .slice(0, 80) || "export";

export const createPostExporter = (renderRef) => {
  const renderCanvas = async (html) => {
    renderRef.current.innerHTML = html;
    await new Promise((r) => setTimeout(r, 80));
    const canvas = await html2canvas(renderRef.current.firstElementChild, {
      scale: 2, useCORS: true, backgroundColor: null, width: 800, height: 1000, logging: false,
    });
    renderRef.current.innerHTML = "";
    return canvas;
  };

  const blobFromCanvas = (canvas, format, quality) => new Promise((resolve) => {
    const mime = format === "jpg" ? "image/jpeg" : "image/png";
    const q = format === "jpg" ? (typeof quality === "number" ? quality : 0.92) : undefined;
    canvas.toBlob((blob) => resolve(blob), mime, q);
  });

  const downloadPost = async (generated, index, options = {}) => {
    const post = generated[index];
    if (!post) return;
    const base = safeFilePart(options.baseName ?? "post");
    const onlySlide = options.onlySlide == null ? null : Number(options.onlySlide);
    const format = String(options.format || "png").toLowerCase() === "jpg" ? "jpg" : "png";
    const ext = format === "jpg" ? "jpg" : "png";
    const slides = post.slides || [];
    const targets = Number.isFinite(onlySlide)
      ? [Math.max(0, Math.min(slides.length - 1, onlySlide))]
      : slides.map((_, i) => i);

    for (const i of targets) {
      const canvas = await renderCanvas(slides[i]);
      const suffix = slides.length > 1 ? `_slide${i + 1}` : "";
      const blob = await blobFromCanvas(canvas, format, options.quality);
      downloadBlob(blob, `${base}_${Number(index) + 1}${suffix}.${ext}`);
      await new Promise((r) => setTimeout(r, 0));
    }
  };

  const downloadZip = async (generated, options = {}) => {
    const zipName = `${safeFilePart(options.zipName ?? "social_posts")}.zip`;
    const base = safeFilePart(options.baseName ?? "post");
    const format = String(options.format || "png").toLowerCase() === "jpg" ? "jpg" : "png";
    const ext = format === "jpg" ? "jpg" : "png";
    const zip = new JSZip();
    for (const [idx, post] of Object.entries(generated)) {
      for (let i = 0; i < post.slides.length; i++) {
        const canvas = await renderCanvas(post.slides[i]);
        if (format === "jpg") {
          const blob = await blobFromCanvas(canvas, "jpg", options.quality);
          const buf = await blob.arrayBuffer();
          zip.file(
            `${base}_${Number(idx) + 1}${post.slides.length > 1 ? `_slide${i + 1}` : ""}.${ext}`,
            buf,
          );
        } else {
          zip.file(
            `${base}_${Number(idx) + 1}${post.slides.length > 1 ? `_slide${i + 1}` : ""}.${ext}`,
            canvas.toDataURL("image/png").split(",")[1],
            { base64: true },
          );
        }
      }
    }
    downloadBlob(await zip.generateAsync({ type: "blob" }), zipName);
  };

  return { renderCanvas, downloadPost, downloadZip };
};
