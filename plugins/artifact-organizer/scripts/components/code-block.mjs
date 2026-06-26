import { escape } from "../lib/html.mjs";
import { highlightCode, languageLabel, normalizeLang } from "../lib/code-format.mjs";

export function CodeBlock(props) {
  const label = languageLabel(props.lang);
  const lang = normalizeLang(props.lang);
  const filename = props.filename
    ? `<div class="op-code-filename">${escape(props.filename)}</div>`
    : "";
  const badge = `<span class="op-code-badge">${escape(label)}</span>`;
  const meta = `<div class="op-code-meta">${filename}${badge}</div>`;
  const hl = new Set(props.highlight || []);
  const highlightedLines = highlightCode(props.code, lang);
  const lines = String(props.code ?? "").split("\n").map((_, i) => {
    const isHl = hl.has(i + 1);
    const cls = isHl ? "op-code-line op-code-line-hl" : "op-code-line";
    return `<span class="${cls}"><span class="op-code-line-no">${i + 1}</span><span class="op-code-line-content">${highlightedLines[i] || "&nbsp;"}</span></span>`;
  }).join("");
  return `<div class="op-code-wrap" data-lang="${escape(lang)}">${meta}<pre class="op-code op-code-lang-${escape(lang)}"><code>${lines}</code></pre></div>`;
}
