import { escape } from "../lib/html.mjs";
import { highlightCode, languageLabel, normalizeLang } from "../lib/code-format.mjs";

function pinLabel(n, style) {
  if (style === "lettered") {
    return String.fromCharCode(64 + n); // 1 -> A, 2 -> B, ...
  }
  return String(n);
}

export function AnnotatedCode(props) {
  const lang = normalizeLang(props.lang);
  const langLabel = languageLabel(props.lang);
  const filename = props.filename
    ? `<div class="op-annotated-code-filename">${escape(props.filename)}</div>`
    : "";
  const badge = `<span class="op-annotated-code-badge op-code-badge">${escape(langLabel)}</span>`;
  const meta = `<div class="op-annotated-code-meta">${filename}${badge}</div>`;
  const pinStyle = props.pinStyle === "lettered" ? "lettered" : "numbered";
  const anns = Array.isArray(props.annotations) ? props.annotations : [];

  // Group annotations by line (1-based)
  const byLine = new Map();
  for (const a of anns) {
    const key = a.line;
    if (!byLine.has(key)) byLine.set(key, []);
    byLine.get(key).push(a);
  }

  const codeLines = String(props.code ?? "").split(/\r?\n/);
  const highlightedLines = highlightCode(props.code, lang);
  const codeBody = codeLines.map((raw, i) => {
    const lineNo = i + 1;
    const pins = (byLine.get(lineNo) || [])
      .map(a => `<span class="op-annotated-code-pin">${escape(pinLabel(a.pin, pinStyle))}</span>`)
      .join("");
    const pinRail = `<span class="op-annotated-code-pin-rail">${pins}</span>`;
    return `<tr class="op-annotated-code-line"><td class="op-annotated-code-lineno">${lineNo}</td><td class="op-annotated-code-src">${pinRail}<pre>${highlightedLines[i] || "&nbsp;"}</pre></td></tr>`;
  }).join("");

  const notes = anns.map(a => `
<li class="op-annotated-code-note" data-pin="${escape(String(a.pin))}">
  <span class="op-annotated-code-pin">${escape(pinLabel(a.pin, pinStyle))}</span>
  <div class="op-annotated-code-note-body">
    <div class="op-annotated-code-note-title">${escape(a.title)}</div>
    <div class="op-annotated-code-note-text">${escape(a.body)}</div>
  </div>
</li>`).join("");

  return `<div class="op-annotated-code" data-lang="${escape(lang)}" data-pin-style="${pinStyle}">
${meta}
<div class="op-annotated-code-grid">
  <div class="op-annotated-code-code">
    <table><tbody>${codeBody}</tbody></table>
  </div>
  <ol class="op-annotated-code-notes">${notes}</ol>
</div>
</div>`;
}
