import { escape } from "../lib/html.mjs";

function renderBullets(bullets) {
  if (!Array.isArray(bullets) || bullets.length === 0) return "";
  return `<ul class="op-slide-bullets">${bullets.map(b => `<li>${escape(b)}</li>`).join("")}</ul>`;
}

function renderTwoColBullets(bullets) {
  if (!Array.isArray(bullets) || bullets.length === 0) return "";
  const mid = Math.ceil(bullets.length / 2);
  const left = bullets.slice(0, mid);
  const right = bullets.slice(mid);
  return `<div class="op-slide-col">${renderBullets(left)}</div><div class="op-slide-col">${renderBullets(right)}</div>`;
}

function body(props) {
  switch (props.layout) {
    case "title":
      return `<h1 class="op-slide-title-text">${escape(props.title || "")}</h1>${props.subtitle ? `<p class="op-slide-subtitle">${escape(props.subtitle)}</p>` : ""}`;
    case "content":
      return `<h2 class="op-slide-heading">${escape(props.title || "")}</h2>${renderBullets(props.bullets)}`;
    case "two-col":
      return `<h2 class="op-slide-heading">${escape(props.title || "")}</h2><div class="op-slide-cols">${renderTwoColBullets(props.bullets)}</div>`;
    case "quote":
      return `<blockquote class="op-slide-quote">${escape(props.quote || "")}</blockquote>${props.subtitle ? `<cite class="op-slide-attrib">${escape(props.subtitle)}</cite>` : ""}`;
    case "image":
      return `<h2 class="op-slide-heading">${escape(props.title || "")}</h2>${props.image ? `<img class="op-slide-image" src="${escape(props.image)}" alt="${escape(props.title || "")}">` : ""}${props.subtitle ? `<p class="op-slide-caption">${escape(props.subtitle)}</p>` : ""}`;
    case "section":
      return `<h1 class="op-slide-section-title">${escape(props.title || "")}</h1>${props.subtitle ? `<p class="op-slide-subtitle">${escape(props.subtitle)}</p>` : ""}`;
    default:
      return "";
  }
}

export function Slide(props) {
  return `<article class="op-slide op-slide-${props.layout}">${body(props)}</article>`;
}
