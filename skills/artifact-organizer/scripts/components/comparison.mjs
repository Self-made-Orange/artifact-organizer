import { escape } from "../lib/html.mjs";

function renderItem(item) {
  const subtitle = item.subtitle ? `<div class="op-compare-subtitle">${escape(item.subtitle)}</div>` : "";
  const bullets = Array.isArray(item.bullets) && item.bullets.length > 0
    ? `<ul class="op-compare-bullets">${item.bullets.map(b => `<li>${escape(b)}</li>`).join("")}</ul>`
    : "";
  const verdict = item.verdict
    ? `<div class="op-compare-verdict op-compare-verdict-${escape(item.verdict.tone)}">${escape(item.verdict.label)}</div>`
    : "";
  return `<article class="op-compare-item"><div class="op-compare-head"><div class="op-compare-title">${escape(item.title)}</div>${subtitle}</div>${bullets}${verdict}</article>`;
}

export function Comparison(props) {
  const items = (props.items || []).map(renderItem).join("");
  return `<div class="op-compare op-compare-${props.mode}">${items}</div>`;
}
