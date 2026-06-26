import { escape } from "../lib/html.mjs";

export function SiteFooter(props) {
  const columns = Array.isArray(props.columns) ? props.columns : [];
  const colsHtml = columns.map(col => {
    const links = Array.isArray(col.links) && col.links.length
      ? `<ul>${col.links.map(l => `<li><a href="${escape(l.href || "#")}">${escape(l.label || "")}</a></li>`).join("")}</ul>`
      : "";
    return `<div class="op-site-footer-col"><h4>${escape(col.title || "")}</h4>${links}</div>`;
  }).join("");
  const meta = props.meta ? `<p class="op-site-footer-meta">${escape(props.meta)}</p>` : "";
  const credit = props.credit ? `<p class="op-site-footer-credit">${escape(props.credit)}</p>` : "";
  return `<footer class="op-site-footer"><div class="op-site-footer-cols">${colsHtml}</div><div class="op-site-footer-bottom">${meta}${credit}</div></footer>`;
}
