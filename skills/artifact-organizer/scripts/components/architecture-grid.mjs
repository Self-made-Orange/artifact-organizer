import { escape } from "../lib/html.mjs";

function renderNode(node) {
  const icon  = node.icon ? `<span class="op-arch-node-icon">${escape(node.icon)}</span>` : "";
  const title = node.title || node.label || node.id;
  const tagTxt = node.tag || node.sublabel || node.subtitle || "";
  const tag   = tagTxt ? `<span class="op-arch-node-tag">${escape(tagTxt)}</span>` : "";
  const desc  = node.description ? `<div class="op-arch-node-desc">${escape(node.description)}</div>` : "";
  return `<article class="op-arch-node" data-node-id="${escape(node.id)}"><div class="op-arch-node-head">${icon}<div class="op-arch-node-title">${escape(title)}</div>${tag}</div>${desc}</article>`;
}

function renderEdges(nodes, edges) {
  if (!Array.isArray(edges) || edges.length === 0) return "";
  const byId = new Map(nodes.map(n => [n.id, n]));
  const items = edges.map(e => {
    const from = byId.get(e.from)?.title ?? e.from;
    const to = byId.get(e.to)?.title ?? e.to;
    const label = e.label ? `<em>: ${escape(e.label)}</em>` : "";
    const cls = e.style ? ` class="op-arch-edge-${e.style}"` : "";
    return `<li${cls}>${escape(from)} → ${escape(to)}${label}</li>`;
  }).join("");
  return `<ul class="op-arch-edges">${items}</ul>`;
}

export function ArchitectureGrid(props) {
  const layout = props.layout || "grid";
  const edges = renderEdges(props.nodes || [], props.edges);

  let body;
  if (Array.isArray(props.groups) && props.groups.length > 0) {
    const nodesById = new Map((props.nodes || []).map(n => [n.id, n]));
    body = props.groups.map(g => {
      const groupNodes = g.nodeIds.map(id => nodesById.get(id)).filter(Boolean);
      const items = groupNodes.map(renderNode).join("");
      return `<section class="op-arch-group" data-group-id="${escape(g.id)}"><div class="op-arch-group-title">${escape(g.title)}</div><div class="op-arch-group-body">${items}</div></section>`;
    }).join("");
  } else {
    body = (props.nodes || []).map(renderNode).join("");
  }

  return `<div class="op-arch op-arch-${layout}">${body}${edges}</div>`;
}
