import { escape } from "../lib/html.mjs";

const LAYOUTS = new Set(["grid", "columns"]);

function renderEntity(e) {
  const rows = (e.fields || []).map(f => {
    const keyCls = f.key ? ` op-erd-field-key-${escape(f.key)}` : "";
    const nullCls = f.nullable ? " op-erd-field-nullable" : "";
    const keyTag = f.key ? `<span class="op-erd-field-key-tag">${escape(f.key.toUpperCase())}</span>` : "";
    return `<tr class="op-erd-field${keyCls}${nullCls}">
      <td class="op-erd-field-name">${escape(f.name)}${keyTag}</td>
      <td class="op-erd-field-type">${escape(f.type)}${f.nullable ? "?" : ""}</td>
    </tr>`;
  }).join("");
  return `<article class="op-erd-entity" data-entity-id="${escape(e.id)}">
<header class="op-erd-entity-name">${escape(e.name)}</header>
<table class="op-erd-fields"><tbody>${rows}</tbody></table>
</article>`;
}

function renderRelationship(r) {
  return `<li class="op-erd-rel" data-from="${escape(r.from)}" data-to="${escape(r.to)}">
  <span class="op-erd-rel-from">${escape(r.from)}</span>
  <span class="op-erd-rel-card">${escape(r.cardinality)}</span>
  <span class="op-erd-rel-arrow" aria-hidden="true">→</span>
  <span class="op-erd-rel-to">${escape(r.to)}</span>
  ${r.label ? `<span class="op-erd-rel-label">${escape(r.label)}</span>` : ""}
</li>`;
}

export function ERDDiagram(props) {
  const layout = LAYOUTS.has(props.layout) ? props.layout : "grid";
  const entities = (props.entities || []).map(renderEntity).join("");
  const rels = (props.relationships || []).map(renderRelationship).join("");
  return `<section class="op-erd" data-layout="${layout}">
<div class="op-erd-entities">${entities}</div>
${rels ? `<ul class="op-erd-rels">${rels}</ul>` : ""}
</section>`;
}
