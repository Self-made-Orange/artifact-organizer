import { escape } from "../lib/html.mjs";

const STATES = new Set(["stable", "modified", "added", "removed"]);
const KINDS  = new Set(["function", "class", "const", "type"]);

export function FileCard(props) {
  const state = STATES.has(props.state) ? props.state : "stable";
  const stateCls = `op-file-card-state-${state}`;
  const path = props.path
    ? `<div class="op-file-card-path">${escape(props.path)}</div>`
    : "";
  const iconAttr = props.icon ? ` data-icon="${escape(props.icon)}"` : "";
  const exports = Array.isArray(props.exports) && props.exports.length
    ? `<ul class="op-file-card-exports">` +
      props.exports.map(e => {
        const kind = KINDS.has(e.kind) ? e.kind : "const";
        return `<li class="op-file-card-export op-file-card-export-${kind}" data-kind="${kind}">${escape(e.name)}</li>`;
      }).join("") +
      `</ul>`
    : "";
  const loc = (typeof props.loc === "number")
    ? `<span class="op-file-card-loc">${escape(String(props.loc))} LOC</span>`
    : "";
  const footer = (loc || state !== "stable")
    ? `<footer class="op-file-card-footer">${loc}<span class="op-file-card-state-chip">${escape(state)}</span></footer>`
    : "";
  return `<article class="op-file-card ${stateCls}"${iconAttr}>
<header class="op-file-card-header">
  <h4 class="op-file-card-name">${escape(props.name)}</h4>
  ${path}
</header>
<p class="op-file-card-resp">${escape(props.responsibility)}</p>
${exports}
${footer}
</article>`;
}
