import { escape } from "../lib/html.mjs";

function renderNode(node, showIcons) {
  const isDir = node.type === "dir";
  const typeCls = isDir ? "op-file-tree-dir" : "op-file-tree-file";
  const hlCls = node.highlight ? ` op-file-tree-node-highlight-${escape(node.highlight)}` : "";
  const icon = showIcons
    ? `<span class="op-file-tree-icon" aria-hidden="true">${isDir ? "▸" : "·"}</span>`
    : "";
  const label = `<span class="op-file-tree-label">${escape(node.name)}</span>`;
  const selfLine = `<div class="op-file-tree-node ${typeCls}${hlCls}">${icon}${label}</div>`;
  if (isDir && Array.isArray(node.children) && node.children.length) {
    const inner = node.children.map(c => renderNode(c, showIcons)).join("");
    return `<li>${selfLine}<ul class="op-file-tree-children">${inner}</ul></li>`;
  }
  return `<li>${selfLine}</li>`;
}

export function FileTree(props) {
  const showIcons = props.showIcons !== false;
  const items = (props.nodes || []).map(n => renderNode(n, showIcons)).join("");
  const caption = props.caption
    ? `<figcaption class="op-file-tree-caption">${escape(props.caption)}</figcaption>`
    : "";
  return `<figure class="op-file-tree"><ul class="op-file-tree-root">${items}</ul>${caption}</figure>`;
}
