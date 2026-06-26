import { escape } from "../lib/html.mjs";

const DELTA_ICON = { up: "↑", down: "↓", flat: "→" };

export function KPICard(props) {
  const delta = props.delta
    ? `<div class="op-kpi-delta op-kpi-delta-${props.delta.direction}"><span class="op-kpi-delta-icon">${DELTA_ICON[props.delta.direction] || "→"}</span>${escape(props.delta.value)}</div>`
    : "";
  const hint = props.hint ? `<div class="op-kpi-hint">${escape(props.hint)}</div>` : "";
  return `<article class="op-kpi"><div class="op-kpi-label">${escape(props.label)}</div><div class="op-kpi-value">${escape(props.value)}</div>${delta}${hint}</article>`;
}
