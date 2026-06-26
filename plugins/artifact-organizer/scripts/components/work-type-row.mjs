import { escape } from "../lib/html.mjs";

const ALIGNS = new Set(["left", "right"]);

export function WorkTypeRow(props) {
  const align = ALIGNS.has(props.align) ? props.align : "left";
  const image = props.image
    ? `<div class="op-work-row-media"><img src="${escape(props.image)}" alt="${escape(props.title || "")}" loading="lazy"></div>`
    : "";
  const meta = Array.isArray(props.meta) && props.meta.length
    ? `<ul class="op-work-row-meta">${props.meta.map(m => `<li>${escape(m)}</li>`).join("")}</ul>`
    : "";
  const body = `<div class="op-work-row-body">${meta}<h3 class="op-work-row-title">${escape(props.title || "")}</h3>${props.description ? `<p class="op-work-row-desc">${escape(props.description)}</p>` : ""}${props.cta && props.cta.label ? `<a class="op-work-row-cta" href="${escape(props.cta.href || "#")}">${escape(props.cta.label)} <span aria-hidden="true">→</span></a>` : ""}</div>`;
  return `<article class="op-work-row op-work-row-align-${align}">${image}${body}</article>`;
}
