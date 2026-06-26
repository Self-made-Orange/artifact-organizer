import { escape } from "../lib/html.mjs";

/**
 * Embed a raw, self-contained HTML artifact verbatim via a sandboxed
 * `<iframe srcdoc>`. The deliberate escape hatch for "stack this HTML as-is" —
 * the artifact keeps its own styling/scripts. It is the one component whose
 * props intentionally carry HTML (every other component is semantic-only).
 *
 * Rendered chrome-free (no border, no card, no caption, transparent, sized to
 * its content) so it reads as part of the page rather than a boxed foreign
 * frame. Note: an iframe is a style-isolation boundary, so the embedded content
 * keeps its OWN look — for a result that fully adopts the canvas theme, rebuild
 * the artifact as native components instead (the organizer's default path).
 *
 * Props: html (required), title? (a11y label only), height? (px; default auto).
 */
export function Embed(props) {
  if (!props || typeof props.html !== "string") {
    throw new Error("Embed: 'html' (string) is required");
  }
  const titleText = props.title || "Embedded artifact";
  // Fixed height when asked; otherwise auto-fit to content on load (no scrolly box).
  const style = props.height != null ? ` style="height:${Number(props.height)}px"` : "";
  const autofit = props.height != null
    ? ""
    : ` onload="try{this.style.height=this.contentWindow.document.documentElement.scrollHeight+'px'}catch(e){}"`;
  return (
    `<figure class="op-embed">` +
    `<iframe class="op-embed-frame"${style}${autofit} loading="lazy" ` +
    `title="${escape(titleText)}" ` +
    `sandbox="allow-scripts allow-same-origin allow-popups" ` +
    `srcdoc="${escape(props.html)}"></iframe>` +
    `</figure>`
  );
}
