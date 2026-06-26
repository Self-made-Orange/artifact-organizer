import { renderMarkdown } from "../lib/markdown.mjs";

export function Prose(props) {
  return `<div class="op-prose">${renderMarkdown(props.markdown)}</div>`;
}
