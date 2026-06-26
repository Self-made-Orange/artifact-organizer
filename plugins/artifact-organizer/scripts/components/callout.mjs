import { escape } from "../lib/html.mjs";
import { renderMarkdown } from "../lib/markdown.mjs";

export function Callout(props) {
  const sev = props.severity;
  const title = props.title
    ? `<div class="op-callout-title">${escape(props.title)}</div>`
    : "";
  const body = `<div class="op-callout-body">${renderMarkdown(props.body)}</div>`;
  return `<aside class="op-callout op-callout-${sev}">${title}${body}</aside>`;
}
