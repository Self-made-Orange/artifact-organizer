import { escape } from "../lib/html.mjs";

function renderStep(step) {
  const tag = step.tag ? `<span class="op-swimlane-step-tag">${escape(step.tag)}</span>` : "";
  const description = step.description
    ? `<div class="op-swimlane-step-description">${escape(step.description)}</div>`
    : "";
  return `<article class="op-swimlane-step" data-step-id="${escape(step.id)}">
  <div class="op-swimlane-step-head">
    <div class="op-swimlane-step-title">${escape(step.title)}</div>
    ${tag}
  </div>
  ${description}
</article>`;
}

export function Swimlane(props) {
  const lanes = Array.isArray(props.lanes) ? props.lanes : [];
  const steps = Array.isArray(props.steps) ? props.steps : [];
  const edges = Array.isArray(props.edges) ? props.edges : [];
  const stepById = new Map(steps.map((step) => [step.id, step]));
  const cols = Math.max(steps.length, 1);

  const laneRows = lanes.map((lane) => {
    const subtitle = lane.subtitle
      ? `<div class="op-swimlane-lane-subtitle">${escape(lane.subtitle)}</div>`
      : "";
    const cells = steps.map((step) => {
      if (step.lane !== lane.id) {
        return `<div class="op-swimlane-slot op-swimlane-slot-empty" aria-hidden="true"></div>`;
      }
      return `<div class="op-swimlane-slot">${renderStep(step)}</div>`;
    }).join("");
    return `<section class="op-swimlane-lane" data-lane-id="${escape(lane.id)}">
  <header class="op-swimlane-lane-head">
    <div class="op-swimlane-lane-title">${escape(lane.title)}</div>
    ${subtitle}
  </header>
  <div class="op-swimlane-track" style="--op-swimlane-cols:${cols};">${cells}</div>
</section>`;
  }).join("");

  const edgeList = edges.length === 0 ? "" : `<ol class="op-swimlane-edges">
${edges.map((edge) => {
    const from = stepById.get(edge.from)?.title || edge.from;
    const to = stepById.get(edge.to)?.title || edge.to;
    const label = edge.label ? `<span class="op-swimlane-edge-label">${escape(edge.label)}</span>` : "";
    return `<li class="op-swimlane-edge">${escape(from)} &rarr; ${escape(to)} ${label}</li>`;
  }).join("")}
</ol>`;

  return `<div class="op-swimlane">
  <div class="op-swimlane-lanes">${laneRows}</div>
  ${edgeList}
</div>`;
}
