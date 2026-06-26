import { escape } from "../lib/html.mjs";

export function SiteHeader(props) {
  const brand = escape(props.brand || "Studio");
  const brandHref = props.brandHref ? ` href="${escape(props.brandHref)}"` : "";
  const links = Array.isArray(props.links) && props.links.length
    ? `<ul class="op-site-header-nav">${props.links.map(l => `<li><a href="${escape(l.href || "#")}">${escape(l.label || "")}</a></li>`).join("")}</ul>`
    : "";
  const cta = props.cta && props.cta.label
    ? `<a class="op-site-header-cta" href="${escape(props.cta.href || "#")}">${escape(props.cta.label)}<span class="op-site-header-cta-dot" aria-hidden="true"></span></a>`
    : "";
  const scrollScript = `<script>(function(){var h=document.querySelector('.op-site-header');if(!h)return;function u(){h.classList.toggle('op-scrolled',window.scrollY>40);}window.addEventListener('scroll',u,{passive:true});u();}());</script>`;
  return `<header class="op-site-header"><a class="op-site-header-brand"${brandHref}>${brand}</a>${links}${cta}</header>${scrollScript}`;
}
