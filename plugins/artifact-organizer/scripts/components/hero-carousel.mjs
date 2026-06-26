import { escape } from "../lib/html.mjs";

const CAROUSEL_JS = `
if (!window.__hsHeroCarouselLoaded) {
  window.__hsHeroCarouselLoaded = true;
  document.addEventListener('DOMContentLoaded', function() { setup(); });
  if (document.readyState !== 'loading') setup();

  function setup() {
    document.querySelectorAll('.op-hero-carousel').forEach(function(el) {
      if (el.__hsInit) return;
      el.__hsInit = true;
      var slides = Array.from(el.querySelectorAll('.op-hero-slide'));
      if (slides.length === 0) return;
      var counter = el.querySelector('.op-hero-counter');
      var interval = parseInt(el.dataset.interval || '5500', 10);
      var i = 0;
      function show(n) {
        i = ((n % slides.length) + slides.length) % slides.length;
        slides.forEach(function(s, idx) { s.classList.toggle('op-hero-slide-active', idx === i); });
        if (counter) counter.textContent = (i + 1) + ' / ' + slides.length;
      }
      show(0);
      var timer = setInterval(function() { show(i + 1); }, interval);
      el.addEventListener('mouseenter', function() { clearInterval(timer); });
      el.addEventListener('mouseleave', function() { timer = setInterval(function() { show(i + 1); }, interval); });
    });
  }
}
`.trim();

export function HeroCarousel(props) {
  const slides = Array.isArray(props.slides) ? props.slides : [];
  if (slides.length === 0) return "";
  const interval = Number.isFinite(props.interval) ? Math.max(2000, props.interval) : 5500;
  const slidesHtml = slides.map((s, i) => {
    const img = s.image ? `<img src="${escape(s.image)}" alt="${escape(s.title || "")}" loading="${i === 0 ? "eager" : "lazy"}">` : "";
    const overlay = s.title || s.subtitle
      ? `<div class="op-hero-slide-meta">${s.subtitle ? `<span class="op-hero-slide-subtitle">${escape(s.subtitle)}</span>` : ""}${s.title ? `<span class="op-hero-slide-title">${escape(s.title)}</span>` : ""}</div>`
      : "";
    return `<div class="op-hero-slide${i === 0 ? " op-hero-slide-active" : ""}">${img}${overlay}</div>`;
  }).join("");
  const playReel = props.playReel && props.playReel.label
    ? `<a class="op-hero-play-reel" href="${escape(props.playReel.url || "#")}"><span class="op-hero-play-reel-icon" aria-hidden="true">▶</span><span>${escape(props.playReel.label)}</span></a>`
    : "";
  const lead = props.lead ? `<div class="op-hero-lead"><p>${escape(props.lead)}</p></div>` : "";
  return `<section class="op-hero-carousel" data-interval="${interval}"><div class="op-hero-stage">${slidesHtml}<div class="op-hero-overlay">${playReel}<span class="op-hero-counter">1 / ${slides.length}</span></div></div>${lead}<script>${CAROUSEL_JS}</script></section>`;
}
