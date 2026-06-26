import { escape } from "../lib/html.mjs";
import { renderMarkdown } from "../lib/markdown.mjs";

const INDICATORS = { done: "✓", doing: "●", skipped: "○" };

function renderStep(step, index, numbered) {
  const stateClass = step.state ? ` op-step-${step.state}` : "";
  const indexChip = numbered
    ? `<span class="op-step-index">${index + 1}</span>`
    : "";
  const indicator = INDICATORS[step.state]
    ? `<span class="op-step-indicator" aria-label="${step.state}">${INDICATORS[step.state]}</span>`
    : "";
  const meta = (indexChip || indicator)
    ? `<div class="op-step-meta">${indexChip}${indicator}</div>`
    : "";
  return `<li class="op-step${stateClass}">${meta}<div class="op-step-content"><div class="op-step-title">${escape(step.title)}</div><div class="op-step-body">${renderMarkdown(step.body)}</div></div></li>`;
}

export function StepList(props) {
  const numbered = props.numbered !== false;
  const tag = numbered ? "ol" : "ul";
  const classes = numbered ? "op-steps op-steps-numbered" : "op-steps";
  const items = (props.steps || []).map((step, index) => renderStep(step, index, numbered)).join("");
  return `<${tag} class="${classes}">${items}</${tag}>`;
}
