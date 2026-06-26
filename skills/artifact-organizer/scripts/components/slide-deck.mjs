import { escape } from "../lib/html.mjs";

const DECK_JS = `
if (!window.__hsDeckLoaded) {
  window.__hsDeckLoaded = true;
  document.addEventListener('DOMContentLoaded', function() { setup(); });
  if (document.readyState !== 'loading') setup();

  function setup() {
    document.querySelectorAll('.op-deck').forEach(deck => {
      if (deck.__hsInit) return;
      deck.__hsInit = true;
      const slides = Array.from(deck.querySelectorAll('.op-slide'));
      const counter = deck.querySelector('.op-deck-counter');
      const slidesEl = deck.querySelector('.op-deck-slides');
      const mode = deck.classList.contains('op-deck-mode-scroll-jack') ? 'scroll-jack'
                : deck.classList.contains('op-deck-mode-scroll-snap') ? 'scroll-snap'
                : 'deck';
      let i = 0;
      function show(n) {
        const next = Math.max(0, Math.min(slides.length - 1, n));
        if (next === i && slides[i] && slides[i].classList.contains('op-slide-active')) return;
        i = next;
        slides.forEach((s, idx) => s.classList.toggle('op-slide-active', idx === i));
        if (counter) counter.textContent = (i + 1) + ' / ' + slides.length;
      }
      function jump(n) {
        const next = Math.max(0, Math.min(slides.length - 1, n));
        if (mode === 'scroll-snap') {
          slides[next].scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else if (mode === 'scroll-jack') {
          const total = deck.offsetHeight - window.innerHeight;
          const top = deck.getBoundingClientRect().top + window.scrollY + (total * (next / Math.max(1, slides.length - 1)));
          window.scrollTo({ top, behavior: 'smooth' });
        } else {
          show(next);
        }
      }
      deck.addEventListener('click', e => {
        const btn = e.target.closest('[data-deck-action]');
        if (!btn) return;
        const action = btn.dataset.deckAction;
        if (action === 'prev') jump(i - 1);
        else if (action === 'next') jump(i + 1);
        else if (action === 'first') jump(0);
        else if (action === 'last') jump(slides.length - 1);
      });
      deck.addEventListener('keydown', e => {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { jump(i - 1); e.preventDefault(); }
        else if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') { jump(i + 1); e.preventDefault(); }
        else if (e.key === 'Home') { jump(0); e.preventDefault(); }
        else if (e.key === 'End') { jump(slides.length - 1); e.preventDefault(); }
      });
      deck.setAttribute('tabindex', '0');

      if (mode === 'scroll-snap' && slidesEl && 'IntersectionObserver' in window) {
        const io = new IntersectionObserver(entries => {
          let best = null;
          entries.forEach(e => {
            if (!best || e.intersectionRatio > best.intersectionRatio) best = e;
          });
          if (best && best.intersectionRatio >= 0.5) {
            const idx = slides.indexOf(best.target);
            if (idx >= 0) show(idx);
          }
        }, { root: slidesEl, threshold: [0.25, 0.5, 0.75] });
        slides.forEach(s => io.observe(s));
        show(0);
      } else if (mode === 'scroll-jack') {
        deck.style.setProperty('--op-deck-jack-units', String(slides.length));
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const LERP = 0.04;
        let target = 0;
        let cur = 0;
        let raf = 0;
        function computeTarget() {
          const rect = deck.getBoundingClientRect();
          const total = deck.offsetHeight - window.innerHeight;
          const scrolled = Math.max(0, Math.min(total, -rect.top));
          const progress = total > 0 ? scrolled / total : 0;
          return progress * Math.max(1, slides.length - 1);
        }
        function apply() {
          const idx = Math.round(cur);
          show(idx);
          // Per-slide: progress (signed dist), distance (abs), sub-progress (0..1
          // within active slide range, used for sub-reveal of children).
          slides.forEach((s, j) => {
            const dist = cur - j;
            const absDist = Math.abs(dist);
            const sub = Math.max(0, Math.min(1, dist + 0.5));
            s.style.setProperty('--op-slide-progress', dist.toFixed(3));
            s.style.setProperty('--op-slide-distance', absDist.toFixed(3));
            s.style.setProperty('--op-slide-sub-progress', sub.toFixed(3));
          });
        }
        function tick() {
          raf = 0;
          if (reduceMotion) {
            cur = target;
            apply();
            return;
          }
          cur += (target - cur) * LERP;
          apply();
          if (Math.abs(target - cur) > 0.0005) {
            raf = requestAnimationFrame(tick);
          } else {
            cur = target;
            apply();
          }
        }
        function onScroll() {
          target = computeTarget();
          if (!raf) raf = requestAnimationFrame(tick);
        }
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll, { passive: true });
        target = computeTarget();
        cur = target;
        apply();
      } else {
        show(0);
      }
    });
  }
}
`.trim();

export function SlideDeck(props, renderChildren) {
  const aspect = props.aspect.replace(":", "-");
  const mode = props.mode && props.mode !== "deck" ? props.mode : null;
  const modeClass = mode ? ` op-deck-mode-${mode}` : "";
  const transitionClass = props.transition && props.transition !== "none"
    ? ` op-deck-transition-${props.transition}`
    : "";
  const footer = props.footer
    ? `<footer class="op-deck-footer">${escape(props.footer)}</footer>`
    : "";
  const children = renderChildren();
  const nav = `<nav class="op-deck-nav"><button type="button" data-deck-action="first">⏮</button><button type="button" data-deck-action="prev">◀</button><span class="op-deck-counter">1 / ?</span><button type="button" data-deck-action="next">▶</button><button type="button" data-deck-action="last">⏭</button></nav>`;
  const slidesInner = mode ? `${children}${nav}` : children;
  const trailing = mode ? footer : `${nav}${footer}`;
  return `<section class="op-deck op-deck-aspect-${aspect}${modeClass}${transitionClass}"><div class="op-deck-slides">${slidesInner}</div>${trailing}<script>${DECK_JS}</script></section>`;
}
