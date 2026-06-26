import { escape } from "../lib/html.mjs";

export function Page(props, renderChildren, ctx = {}) {
  const chromeless = props.chromeless === true;
  const className = chromeless ? "op-page op-page-chromeless" : "op-page";
  if (chromeless) {
    return `<article class="${className}"><main class="op-page-main">${renderChildren()}</main></article>`;
  }

  // Optional back navigation bar (for multi-HTML linking)
  const backBar = (props.backHref)
    ? `<nav class="op-page-backbar"><a class="op-page-back" href="${escape(props.backHref)}">${escape(props.backLabel || "← Back")}</a></nav>`
    : "";

  const title = escape(props.title);
  const subtitle = props.subtitle
    ? `<p class="op-page-subtitle">${escape(props.subtitle)}</p>`
    : "";
  const header = `<header class="op-page-header"><h1 class="op-page-title">${title}</h1>${subtitle}</header>`;
  const main = `<main class="op-page-main">${renderChildren()}</main>`;
  return `${backBar}<article class="${className}">${header}${main}</article>`;
}
