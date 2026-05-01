import html2canvas from "html2canvas";
import JSZip from "jszip";
import { downloadBlob } from "./files.js";

export const createPostExporter = (renderRef) => {
  const renderPng = async (html) => {
    renderRef.current.innerHTML = html;
    await new Promise((r) => setTimeout(r, 80));
    const canvas = await html2canvas(renderRef.current.firstElementChild, {
      scale: 2, useCORS: true, backgroundColor: null, width: 800, height: 1000, logging: false,
    });
    renderRef.current.innerHTML = "";
    return canvas;
  };

  const downloadPost = async (generated, index) => {
    const post = generated[index];
    if (!post) return;
    for (let i = 0; i < post.slides.length; i++) {
      const canvas = await renderPng(post.slides[i]);
      canvas.toBlob((blob) => downloadBlob(blob, `post_${Number(index) + 1}${post.slides.length > 1 ? `_slide${i + 1}` : ""}.png`));
    }
  };

  const downloadZip = async (generated) => {
    const zip = new JSZip();
    for (const [idx, post] of Object.entries(generated)) {
      for (let i = 0; i < post.slides.length; i++) {
        const canvas = await renderPng(post.slides[i]);
        zip.file(
          `post_${Number(idx) + 1}${post.slides.length > 1 ? `_slide${i + 1}` : ""}.png`,
          canvas.toDataURL("image/png").split(",")[1],
          { base64: true },
        );
      }
    }
    downloadBlob(await zip.generateAsync({ type: "blob" }), "social_posts.zip");
  };

  return { renderPng, downloadPost, downloadZip };
};
