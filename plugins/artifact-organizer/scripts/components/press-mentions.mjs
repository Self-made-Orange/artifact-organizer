import { escape } from "../lib/html.mjs";

export function PressMentions(props) {
  const eyebrow = props.eyebrow || "As featured in";
  const mentions = Array.isArray(props.mentions) ? props.mentions : [];
  const items = mentions.map(m =>
    `<li class="op-press-item"><span class="op-press-name">${escape(m.name || "")}</span>${m.note ? `<span class="op-press-note">${escape(m.note)}</span>` : ""}</li>`
  ).join("");
  return `<section class="op-press-mentions"><p class="op-press-eyebrow">${escape(eyebrow)}</p><ul class="op-press-list">${items}</ul></section>`;
}
