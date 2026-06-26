import { escape } from "../lib/html.mjs";

export function DivisionCard(props) {
  const projects = Array.isArray(props.projects) && props.projects.length
    ? `<ul class="op-division-card-projects">${props.projects.map(p => `<li><a href="${escape(p.href || "#")}">${escape(p.label || p.name || "")}</a></li>`).join("")}</ul>`
    : "";
  const cta = props.cta && props.cta.label
    ? `<a class="op-division-card-cta" href="${escape(props.cta.href || "#")}">${escape(props.cta.label)} <span aria-hidden="true">→</span></a>`
    : "";
  const image = props.image
    ? `<div class="op-division-card-media"><img src="${escape(props.image)}" alt="${escape(props.title || "")}" loading="lazy"></div>`
    : "";
  const arrow = props.href
    ? `<span class="op-division-card-link-arrow" aria-hidden="true">↗</span>`
    : "";
  const inner = `<div class="op-division-card-body"><span class="op-division-card-eyebrow">${escape(props.eyebrow || "")}</span><h3 class="op-division-card-title">${escape(props.title || "")}${arrow}</h3>${props.description ? `<p class="op-division-card-desc">${escape(props.description)}</p>` : ""}${projects}${cta}</div>${image}`;

  // If href provided, the whole card is a link
  if (props.href) {
    return `<a class="op-division-card op-division-card-linked" href="${escape(props.href)}">${inner}</a>`;
  }
  return `<article class="op-division-card">${inner}</article>`;
}
