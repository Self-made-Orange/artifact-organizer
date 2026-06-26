import { escape } from "../lib/html.mjs";

/**
 * Embed a raw, self-contained HTML artifact verbatim via a sandboxed
 * `<iframe srcdoc>`. This is the deliberate escape hatch for the organizer's
 * "stack this HTML as-is" path — the artifact keeps its own styling and scripts
 * instead of being rebuilt as native components. It is the one component whose
 * props intentionally carry HTML (every other component is semantic-data-only).
 *
 * Props: html (required), title?, height? (px; default via CSS).
 */
export function Embed(props) {
  if (!props || typeof props.html !== "string") {
    throw new Error("Embed: 'html' (string) is required");
  }
  const titleText = props.title || "Embedded artifact";
  const caption = props.title
    ? `<figcaption class="op-embed-caption">${escape(props.title)}</figcaption>`
    : "";
  const style = props.height != null
    ? ` style="height:${Number(props.height)}px"`
    : "";
  // Trusted local artifact viewer (offline file), so we favor fidelity:
  // allow-scripts/same-origin let inline charts + theme toggles run.
  return (
    `<figure class="op-embed">` +
    `<iframe class="op-embed-frame"${style} loading="lazy" ` +
    `title="${escape(titleText)}" ` +
    `sandbox="allow-scripts allow-same-origin allow-popups" ` +
    `srcdoc="${escape(props.html)}"></iframe>` +
    `${caption}</figure>`
  );
}
