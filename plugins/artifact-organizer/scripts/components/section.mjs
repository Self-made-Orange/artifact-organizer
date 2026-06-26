import { escape } from "../lib/html.mjs";
import { renderMarkdown } from "../lib/markdown.mjs";

export function Section(props, renderChildren, ctx = {}) {
  const lead = props.lead
    ? `<div class="op-section-lead">${renderMarkdown(props.lead)}</div>`
    : "";
  const title = `<h2 class="op-section-title">${escape(props.title)}</h2>`;
  const body = `<div class="op-section-body">${renderChildren()}</div>`;
  return `<section class="op-section" id="${escape(props.id)}">${title}${lead}${body}</section>`;
}
