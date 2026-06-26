import { escape } from "../lib/html.mjs";

export function ArticleCard(props) {
  const tag = props.tag
    ? `<span class="op-article-card-tag">${escape(props.tag)}</span>`
    : "";
  const meta = [props.source, props.date].filter(Boolean).map(escape).join("  ·  ");
  const eyebrow = (tag || meta)
    ? `<div class="op-article-card-eyebrow">${tag}${meta ? `<span class="op-article-card-meta">${meta}</span>` : ""}</div>`
    : "";

  const headline = props.href
    ? `<h3 class="op-article-card-headline"><a href="${escape(props.href)}" target="_blank" rel="noopener">${escape(props.headline || "")}</a></h3>`
    : `<h3 class="op-article-card-headline">${escape(props.headline || "")}</h3>`;

  const summary = props.summary
    ? `<p class="op-article-card-summary">${escape(props.summary)}</p>`
    : "";

  const cta = props.href
    ? `<a class="op-article-card-cta" href="${escape(props.href)}" target="_blank" rel="noopener">Read more <span aria-hidden="true">→</span></a>`
    : "";

  return `<article class="op-article-card">${eyebrow}${headline}${summary}${cta}</article>`;
}
