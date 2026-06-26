import { escape } from "../lib/html.mjs";

export function EditorialStatement(props) {
  const text = escape(props.text || "");
  const eyebrow = props.eyebrow
    ? `<span class="op-editorial-eyebrow">${escape(props.eyebrow)}</span>`
    : "";
  const cta = props.cta && props.cta.label
    ? `<a class="op-editorial-cta" href="${escape(props.cta.href || "#")}"><span>${escape(props.cta.label)}</span><span class="op-editorial-cta-arrow" aria-hidden="true">→</span></a>`
    : "";
  return `<section class="op-editorial-statement"><div class="op-editorial-inner">${eyebrow}<h2 class="op-editorial-text">${text}</h2>${cta}</div></section>`;
}
