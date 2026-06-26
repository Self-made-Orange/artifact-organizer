import { escape } from "../lib/html.mjs";

const ASPECTS = new Set(["square", "landscape", "portrait", "wide"]);

export function ProjectTile(props) {
  const aspect = ASPECTS.has(props.aspect) ? props.aspect : "landscape";
  const colSpan = Number.isFinite(props.span) ? Math.max(1, Math.min(12, props.span)) : null;
  const rowSpan = Number.isFinite(props.rowSpan) ? Math.max(1, Math.min(6, props.rowSpan)) : null;
  const styles = [];
  if (colSpan) styles.push(`grid-column: span ${colSpan}`);
  if (rowSpan) styles.push(`grid-row: span ${rowSpan}`);
  const styleAttr = styles.length ? ` style="${styles.join("; ")}"` : "";
  const cats = Array.isArray(props.categories) && props.categories.length
    ? `<ul class="op-project-tile-cats">${props.categories.map(c => `<li>${escape(c)}</li>`).join("")}</ul>`
    : "";
  const meta = [props.client, props.year].filter(Boolean).map(escape).join(" · ");
  const metaHtml = meta ? `<div class="op-project-tile-meta">${meta}</div>` : "";
  const image = props.image
    ? `<div class="op-project-tile-media"><img src="${escape(props.image)}" alt="${escape(props.title || "")}" loading="lazy"></div>`
    : `<div class="op-project-tile-media op-project-tile-media-empty"></div>`;
  const inner = `${image}<div class="op-project-tile-body">${cats}<h3 class="op-project-tile-title">${escape(props.title || "")}</h3>${metaHtml}</div>`;
  if (props.href) {
    return `<a class="op-project-tile op-project-tile-aspect-${aspect}" href="${escape(props.href)}"${styleAttr}>${inner}</a>`;
  }
  return `<article class="op-project-tile op-project-tile-aspect-${aspect}"${styleAttr}>${inner}</article>`;
}
