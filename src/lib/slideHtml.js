export const escapeHtml = (value) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;");

export const justify = (h) => (h === "left" ? "flex-start" : h === "right" ? "flex-end" : "center");
export const vJust = (v) => (v === "top" ? "flex-start" : v === "bottom" ? "flex-end" : "center");

export const absoluteAssetUrl = (value) => value || "";

export const buildBg = (config, isFirst, row) => {
  const image = isFirst && row.firstSlideImage ? row.firstSlideImage : config.bgDataUrl;
  if (image) return `<div class="post-bg" style="background-image:url(${absoluteAssetUrl(image)})"></div>`;
  return `<div class="post-bg" style="background:${config.bgColor}"></div>`;
};

export const buildLogo = (config, isLast) => {
  const src = isLast && config.lastLogoDataUrl ? config.lastLogoDataUrl : config.logoDataUrl;
  if (!src) return "";
  const h = isLast ? config.lastLogoH : config.logoH;
  const x = isLast ? config.lastLogoX : 80;
  const y = isLast ? config.lastLogoY : 80;
  return `<img src="${absoluteAssetUrl(src)}" style="position:absolute;left:${x}px;top:${y}px;height:${h}px;width:auto;max-width:300px;object-fit:contain;z-index:2">`;
};

export const domainHtml = (config, isLast) => {
  if (!config.domain) return "";
  let pos = "left:80px;bottom:80px;";
  if (isLast && config.ctaDomainPos !== "default") {
    pos = {
      tl: "left:80px;top:80px;", tr: "right:80px;top:80px;", bl: "left:80px;bottom:80px;", br: "right:80px;bottom:80px;",
      cb: "left:50%;transform:translateX(-50%);bottom:80px;",
    }[config.ctaDomainPos] || pos;
  }
  return `<div data-edit="config:domain" style="position:absolute;${pos}font-size:13px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:${config.domainColor};font-family:${config.fontPara};z-index:2">${escapeHtml(config.domain)}</div>`;
};

export const accentBars = (config) => {
  const active = config.bars.filter((b) => b.enabled);
  if (!active.length) return "";
  if (config.barMode === "stack") {
    return active.map((b) => `<div style="width:100%;height:${b.height}px;background:${b.color};flex-shrink:0;z-index:1"></div>`).join("");
  }
  const total = active.reduce((sum, b) => sum + Number(b.weight || 25), 0);
  const height = Math.max(...active.map((b) => Number(b.height || 7)));
  return `<div style="display:flex;width:100%;flex-shrink:0;z-index:1">${active.map((b) => `<div style="flex:0 0 ${((b.weight / total) * 100).toFixed(2)}%;height:${height}px;background:${b.color}"></div>`).join("")}</div>`;
};

export const titleDiv = (config, text, size, gap, width, align) => {
  const hl = config.highlight ? `background:${config.highlightColor};padding:6px 12px;border-radius:6px;` : "";
  const base = `font-size:${size}px;font-family:${config.fontTitle};font-weight:${config.wtTitle};line-height:1.15;text-align:${align};margin-bottom:${gap}px;width:100%;max-width:${width}px;${hl}`;
  if (config.titleGrad) {
    return `<div style="${base}"><span style="background:linear-gradient(90deg,${config.titleG1},${config.titleG2});-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">${escapeHtml(text)}</span></div>`;
  }
  return `<div style="${base}color:${config.titleColor}">${escapeHtml(text)}</div>`;
};

export const ctaSpan = (config, text) => {
  const bg = config.ctaGrad ? `linear-gradient(90deg,${config.ctaG1},${config.ctaG2})` : config.ctaBg;
  return `<span class="post-cta" data-edit="row:cta_text" style="background:${bg};color:${config.ctaTxt};font-family:${config.fontCta};font-size:${config.ctaSize}px;font-weight:${config.wtCta};padding:${Math.max(14, config.ctaSize * 0.75)}px ${Math.max(30, config.ctaSize * 2)}px">${escapeHtml(text || "Learn More")}</span>`;
};

export const buildSlide = (row, config, slideType, slideNum, total) => {
  const isFirst = slideType === "first";
  const isLast = slideType === "last";
  const isMid = !isFirst && !isLast;
  const title = isFirst ? row.slide1_title || row.title || "" : isLast ? row[`slide${total}_title`] || row.last_title || "" : row[`slide${slideNum}_title`] || "";
  const titleEdit = isFirst ? "row:slide1_title" : isLast ? `row:slide${total}_title` : `row:slide${slideNum}_title`;
  const paragraph = isMid ? row[`slide${slideNum}_paragraph`] || "" : "";
  const cta = isLast ? row.cta_text || "Learn More" : "";
  let h = config.hAlign; let v = config.vAlign;
  if (config.alignScope === "first" && isFirst) { h = config.slide1HAlign; v = config.slide1VAlign; }
  if (config.alignScope === "last" && isLast) { h = config.ctaHAlign; v = config.ctaVAlign; }
  const dotColor = config.bars.find((b) => b.enabled)?.color || "#6366f1";
  const dots = config.indicators
    ? `<div class="slide-indicator ${config.indicatorPos}">${Array.from({ length: total }, (_, i) => `<span style="width:${i === slideNum - 1 ? 28 : 16}px;background:${dotColor};opacity:${i === slideNum - 1 ? 1 : 0.35}"></span>`).join("")}</div>`
    : "";
  const number = isMid && config.slideNumbers ? `<div class="slide-number">${String(slideNum - 1).padStart(2, "0")}</div>` : "";
  const swipe = isFirst ? `<div class="swipe-note">Swipe to explore -></div>` : "";
  const paraHighlight = config.highlight ? `background:${config.highlightColor};padding:6px 12px;border-radius:6px;` : "";
  const paraHtml = paragraph
    ? `<div data-edit="row:slide${slideNum}_paragraph" style="font-size:${config.paraSize}px;font-family:${config.fontPara};font-weight:${config.wtPara};color:${config.paraColor};text-align:${h};margin-bottom:${config.gapPC}px;width:100%;max-width:${config.contentWidth}px;line-height:1.65;${paraHighlight}">${escapeHtml(paragraph)}</div>`
    : "";
  const titleHtml = titleDiv(
    config,
    title,
    isFirst ? Math.min(Number(config.titleSize) + 6, 86) : Number(config.titleSize) - 4,
    config.gapTP,
    config.contentWidth,
    h,
  );
  const titleWrapped = titleHtml.replace("<div ", `<div data-edit="${titleEdit}" `);
  return `<div class="brand-post">${buildBg(config, isFirst, row)}${buildLogo(config, isLast)}${dots}${number}${swipe}<div class="post-content-area" style="justify-content:${vJust(v)};align-items:${justify(h)}">${titleWrapped}${paraHtml}${isLast ? `<div class="post-cta-wrap" style="justify-content:${justify(h)};width:100%;margin-top:${config.gapPC}px">${ctaSpan(config, cta)}</div>` : ""}</div>${domainHtml(config, isLast)}${accentBars(config)}</div>`;
};

export const buildSingle = (row, config) => {
  const h = config.hAlign;
  const titleHtml = titleDiv(config, row.title || "", config.titleSize, config.gapTP, config.contentWidth, h);
  const titleWrapped = titleHtml.replace("<div ", `<div data-edit="row:title" `);
  return `<div class="brand-post">${buildBg(config, true, {})}${buildLogo(config, false)}<div class="post-content-area" style="justify-content:${vJust(config.vAlign)};align-items:${justify(h)}">${titleWrapped}<div data-edit="row:paragraph" style="font-size:${config.paraSize}px;font-family:${config.fontPara};font-weight:${config.wtPara};color:${config.paraColor};text-align:${h};margin-bottom:${config.gapPC}px;width:100%;max-width:${config.contentWidth}px;line-height:1.65;${config.highlight ? `background:${config.highlightColor};padding:6px 12px;border-radius:6px;` : ""}">${escapeHtml(row.paragraph || "")}</div><div class="post-cta-wrap" style="justify-content:${justify(h)};width:100%">${ctaSpan(config, row.cta_text)}</div></div>${domainHtml(config, false)}${accentBars(config)}</div>`;
};

export const slidesFor = (row, config) => {
  const type = (row.post_type || "single").toLowerCase().trim();
  if (type !== "carousel") return [buildSingle(row, config)];
  return ["first", "mid", "mid", "mid", "mid", "last"].map((t, i) => buildSlide(row, config, t, i + 1, 6));
};
