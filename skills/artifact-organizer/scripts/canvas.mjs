/**
 * Canvas renderer — silent-house carousel frame + agent output slides.
 *
 * JSON shape:
 * {
 *   "template": "canvas",
 *   "meta": {
 *     "title": "Q1 Analysis",
 *     "date": "2026-04-30",
 *     "agent": "Claude",       // shown bottom-left e.g. "CLAUDE"
 *     "topic": "Revenue"       // shown bottom-left e.g. "REVENUE"
 *   },
 *   "featured": { "component": "artifact-organizer/Chart", "props": {...} },
 *   "history": [
 *     { "title": "...", "date": "...", "content": { "component": "...", "props": {...} } }
 *   ]
 * }
 *
 * Layout mirrors sh.html:
 *   - Fixed transparent nav → frosted glass on scroll
 *   - Nav links = slide titles (clicking switches slide + counter)
 *   - Full-viewport dark stage with slides (crossfade like HeroCarousel)
 *   - Bottom-left: AGENT · COMPONENT TYPE + slide title
 *   - Bottom-right: counter  N / total
 *   - Brand = "Artifact Organizer"
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { renderTree } from "./lib/tree.mjs";
import { normalizeEnvelope } from "./lib/schema.mjs";
import { EditorialStatement } from "./components/editorial-statement.mjs";
import { DivisionCard } from "./components/division-card.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PLUGIN_ROOT = resolve(__dirname, "..");

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

function loadCss(relPath) {
  const p = resolve(PLUGIN_ROOT, relPath);
  return existsSync(p) ? readFileSync(p, "utf8") : "";
}

function typeLabel(componentName = "") {
  return componentName
    .replace(/^[^/]+\//, "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toUpperCase();
}

function componentFileBase(componentName) {
  return componentName
    .replace(/^[^/]+\//, "")
    .replace(/([a-z\d])([A-Z])/g, "$1-$2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1-$2")
    .toLowerCase();
}

// Walk a component node tree and collect Section nodes (id + title) for the
// right-rail section index.
function collectSections(node, out = []) {
  if (!node || typeof node !== "object") return out;
  const list = Array.isArray(node) ? node : [node];
  for (const n of list) {
    if (n && typeof n === "object") {
      if (n.component === "artifact-organizer/Section" && n.props && n.props.id && n.props.title) {
        out.push({ id: n.props.id, title: n.props.title });
      }
      if (Array.isArray(n.children)) collectSections(n.children, out);
    }
  }
  return out;
}

// Carousel + scroll + nav + theme-toggle JS, all self-contained
const CANVAS_JS = `
(function () {
  var slides   = Array.from(document.querySelectorAll('[data-canvas-slide]'));
  var navLinks = Array.from(document.querySelectorAll('[data-canvas-nav]'));
  var stage    = document.querySelector('.op-hero-stage');
  var counter  = document.querySelector('.op-hero-counter');
  var total    = slides.length;
  var current  = 0;
  var animating = false;
  // Flow mode: documents are stacked vertically and the window scrolls through
  // them, so the carousel crossfade/wheel-switch is disabled.
  var flow = !!document.querySelector('.op-hero-single');

  function show(n, dir) {
    var next = ((n % total) + total) % total;
    if (next === current && dir) return;

    // Set direction on stage for CSS keyframe targeting
    if (stage && dir) {
      stage.setAttribute('data-dir', dir);
    }

    slides.forEach(function (s, i) {
      s.classList.toggle('op-hero-slide-active', i === next);
    });
    navLinks.forEach(function (a) {
      a.classList.toggle('op-canvas-nav-active',
        parseInt(a.getAttribute('data-canvas-nav'), 10) === next);
    });
    if (counter) counter.textContent = (next + 1) + ' / ' + total;
    current = next;

    // Lock during transition, then clear direction
    if (dir) {
      animating = true;
      setTimeout(function () {
        animating = false;
        if (stage) stage.removeAttribute('data-dir');
      }, 550);
    }
  }

  navLinks.forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      var target = parseInt(a.getAttribute('data-canvas-nav'), 10);
      if (flow) {
        var el = document.getElementById('op-slide-' + target);
        if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        show(target, target > current ? 'next' : 'prev');
      }
    });
  });

  // Frosted-glass nav on scroll
  var hdr = document.querySelector('.op-site-header');
  if (hdr) {
    window.addEventListener('scroll', function () {
      hdr.classList.toggle('op-scrolled', window.scrollY > 40);
    }, { passive: true });
  }

  // Light/dark toggle — flips data-mode (the real theme system), keeping the
  // chosen data-theme constant. Persists under 'artifact-organizer.mode'.
  var toggleBtn = document.getElementById('op-theme-toggle');
  var html      = document.documentElement;
  var ICON_SUN  = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>';
  var ICON_MOON = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>';
  function applyMode(mode) {
    html.setAttribute('data-mode', mode);
    localStorage.setItem('artifact-organizer.mode', mode);
    if (toggleBtn) {
      toggleBtn.setAttribute('aria-label', mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
      toggleBtn.innerHTML = mode === 'dark' ? ICON_SUN : ICON_MOON;
    }
  }
  var savedMode = localStorage.getItem('artifact-organizer.mode') || html.getAttribute('data-mode') || 'dark';
  applyMode(savedMode);
  if (toggleBtn) {
    toggleBtn.addEventListener('click', function () {
      applyMode(html.getAttribute('data-mode') === 'dark' ? 'light' : 'dark');
    });
  }

  // Wheel inside hero → change slides; at boundary → pass to page scroll.
  // Disabled in flow mode (documents scroll the window naturally).
  var hero = document.querySelector('.op-hero-carousel');
  if (hero && total > 1 && !flow) {
    function scrollToNextSection() {
      var next = hero.nextElementSibling;
      if (next) next.scrollIntoView({ behavior: 'smooth' });
      else window.scrollBy({ top: window.innerHeight, behavior: 'smooth' });
    }

    hero.addEventListener('wheel', function (e) {
      var goingDown = e.deltaY > 0;
      var goingUp   = e.deltaY < 0;

      // Last slide + down → release to next section
      if (goingDown && current === total - 1) {
        if (animating) { e.preventDefault(); return; }
        scrollToNextSection();
        return;
      }
      // First slide + up → let page scroll naturally
      if (goingUp && current === 0) return;

      e.preventDefault();
      if (animating) return;
      show(goingDown ? current + 1 : current - 1, goingDown ? 'next' : 'prev');
    }, { passive: false });

    // Touch support
    var touchStartY = 0;
    hero.addEventListener('touchstart', function (e) {
      touchStartY = e.touches[0].clientY;
    }, { passive: true });
    hero.addEventListener('touchend', function (e) {
      var dy = touchStartY - e.changedTouches[0].clientY;
      if (Math.abs(dy) < 40) return;
      if (dy > 0 && current === total - 1) { scrollToNextSection(); return; }
      show(dy > 0 ? current + 1 : current - 1, dy > 0 ? 'next' : 'prev');
    }, { passive: true });
  }

  // ── Right-rail section index: click-to-scroll + active highlight ──
  var csiItems = Array.from(document.querySelectorAll('.op-csi-item'));
  if (csiItems.length) {
    // Single-document decks scroll the window; multi-slide decks scroll the
    // internal slide body. Pick the matching IntersectionObserver root.
    var single = !!document.querySelector('.op-hero-single');
    var scroller = single ? null
      : (document.querySelector('.op-hero-slide-active .op-canvas-slide-body')
         || document.querySelector('.op-canvas-slide-body'));
    var byId = {};
    csiItems.forEach(function (a) {
      var id = a.getAttribute('data-csi');
      byId[id] = a;
      a.addEventListener('click', function (e) {
        e.preventDefault();
        var el = document.getElementById(id);
        if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
    if ('IntersectionObserver' in window && (single || scroller)) {
      var obs = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          csiItems.forEach(function (x) { x.classList.remove('op-csi-active'); });
          var a = byId[en.target.id];
          if (a) a.classList.add('op-csi-active');
        });
      }, { root: scroller, rootMargin: '-15% 0px -75% 0px', threshold: 0 });
      csiItems.forEach(function (a) {
        var el = document.getElementById(a.getAttribute('data-csi'));
        if (el) obs.observe(el);
      });
    }
  }

  // Doc-title tag → scroll the active document back to the top.
  var tagEl = document.querySelector('.op-canvas-section-tag');
  if (tagEl) {
    function scrollDocTop() {
      var sc = document.querySelector('.op-hero-slide-active .op-canvas-slide-body')
            || document.querySelector('.op-canvas-slide-body');
      if (sc && sc.scrollTo) sc.scrollTo({ top: 0, behavior: 'smooth' });
      if (window.scrollTo) window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    tagEl.addEventListener('click', scrollDocTop);
    tagEl.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); scrollDocTop(); }
    });
  }

  show(0);
}());
`.trim();

/**
 * Normalise any valid input into a canvas doc shape.
 *
 * Handles:
 *   { template: "canvas", ... }  → pass-through
 *   { parts: [...] }             → pass-through (page mode, routed elsewhere)
 *   { component, props, ... }    → bare component → wrap as featured slide
 */
function normalizeDoc(doc) {
  if (doc.template || doc.parts || doc.featured || doc.history) return doc;
  if (typeof doc.component === "string") {
    return { template: "canvas", meta: {}, featured: doc, history: [] };
  }
  return doc;
}

/**
 * Render a history item's content field.
 * content can be:
 *   - a single component node  { component, props, children? }
 *   - an array of component nodes
 */
function renderContent(content, registry, ctx, layout = "grid") {
  if (Array.isArray(content)) {
    if (layout === "list") {
      const items = content.map(node =>
        `<div class="op-canvas-list-item">${renderTree(node, registry, ctx)}</div>`
      ).join("\n");
      return `<div class="op-canvas-content-list">${items}</div>`;
    }
    const items = content.map(node =>
      `<div class="hs-canvas-grid-item">${renderTree(node, registry, ctx)}</div>`
    ).join("\n");
    return `<div class="hs-canvas-content-grid">${items}</div>`;
  }
  return renderTree(content, registry, ctx);
}

/**
 * Build a human-readable type label for a content value.
 * Handles both single node and array.
 */
function contentTypeLabel(content) {
  if (!content) return "";
  if (Array.isArray(content)) return content.map(n => typeLabel(n.component)).join(", ");
  return typeLabel(content.component);
}

export function renderCanvas(doc, REGISTRY, options = {}) {
  // Translate legacy `hyperscribe/X` / `outprint/X` component prefixes first, then run the
  // canvas-specific normalization (bare component -> featured slide).
  doc = normalizeDoc(normalizeEnvelope(doc));
  const meta    = doc.meta    || {};
  // Theme resolution order: explicit option → meta.theme in the envelope →
  // "notion" default. Canvas is dark-first, so initial mode is dark; the
  // toggle flips data-mode (the real theme system), not data-theme.
  const themeName = options.theme || meta.theme || "notion";
  // Fail loudly on an unknown theme — page mode throws via loadTheme(), so the
  // canvas should too rather than silently rendering an unstyled document.
  if (!existsSync(resolve(PLUGIN_ROOT, `themes/${themeName}.css`))) {
    throw new Error(`Unknown theme "${themeName}". Place themes/${themeName}.css to add it.`);
  }
  // Initial color mode. Canvas is dark-first by default; override to "light"
  // when wrapping a light artifact so the chrome matches. Toggle still works.
  const initialMode = (options.mode === "light" || options.mode === "dark")
    ? options.mode
    : (meta.mode === "light" || meta.mode === "dark" ? meta.mode : "dark");
  const feat    = doc.featured;
  const history = Array.isArray(doc.history) ? doc.history : [];

  const ctx = {};
  ctx.renderNode = (node) => renderTree(node, REGISTRY, ctx);

  // ── Build slide list ─────────────────────────────────────────────────
  // Slide 0 = featured, slides 1..N = history items
  const slides = [];

  if (feat) {
    slides.push({
      title:       meta.title                              || "Untitled",
      navLabel:    meta.navLabel    || meta.title          || "Untitled",
      subtitle:    meta.subtitle    || typeLabel(feat.component),
      description: meta.description                        || "",
      date:        meta.date                               || "",
      contentHtml: renderTree(feat, REGISTRY, ctx),
    });
  }

  history.forEach(item => {
    // Items that link out (multi-HTML) belong in the cards feed, not the
    // document flow — only in-deck full documents become flowing slides.
    if (item && item.href) return;
    const autoSubtitle = contentTypeLabel(item.content);
    const autoEyebrow  = [item.date, autoSubtitle].filter(Boolean).join("  ·  ");
    slides.push({
      title:       item.title                                    || "Untitled",
      navLabel:    item.navLabel    || item.title                || "Untitled",
      subtitle:    item.subtitle    || autoSubtitle,
      description: item.description                              || "",
      date:        item.date                                     || "",
      eyebrow:     item.eyebrow     || autoEyebrow,
      contentHtml: item.content ? renderContent(item.content, REGISTRY, ctx, item.contentLayout) : "",
    });
  });

  const total = slides.length;

  // ── Nav ──────────────────────────────────────────────────────────────
  // Brand always "Artifact Organizer"; links = slide titles
  const navLinksHtml = slides.length > 1
    ? `<ul class="op-site-header-nav">
        ${slides.map((s, i) =>
          `<li><a href="#" data-canvas-nav="${i}"${i === 0 ? ' class="op-canvas-nav-active"' : ""}>${escapeHtml(s.navLabel)}</a></li>`
        ).join("")}
      </ul>`
    : "";

  const navHtml = `<header class="op-site-header">
  <a class="op-site-header-brand">Artifact Organizer</a>
  ${navLinksHtml}
  <button class="op-canvas-theme-toggle" id="op-theme-toggle" aria-label="Toggle theme" type="button"></button>
</header>`;

  // ── Slide HTML ───────────────────────────────────────────────────────
  const agentLabel = [
    meta.agent ? escapeHtml(meta.agent.toUpperCase()) : "",
    meta.topic ? escapeHtml(meta.topic.toUpperCase()) : "",
  ].filter(Boolean).join(" · ");

  const slidesHtml = slides.map((s, i) => {
    // No bottom caption — the document carries its own title (op-page-title) in
    // flow, and the right-rail index handles section navigation.
    return `
<div class="op-hero-slide${i === 0 ? " op-hero-slide-active" : ""}" id="op-slide-${i}" data-canvas-slide="${i}">
  <div class="op-canvas-slide-body">
    <div class="op-canvas-slide-inner">
      ${s.contentHtml}
    </div>
  </div>
</div>`;
  }).join("\n");

  const sections = collectSections(feat);
  // Number rail (click-to-jump index) + a frameout-style vertical tag at the
  // very edge that shows the current section title. Both update on scroll.
  const sectionIndexHtml = sections.length >= 2
    ? `<nav class="op-canvas-section-index" aria-label="Sections">` +
      sections.map((sec, i) =>
        `<a class="op-csi-item" href="#${escapeHtml(sec.id)}" data-csi="${escapeHtml(sec.id)}">` +
        `<span class="op-csi-num">${String(i + 1).padStart(2, "0")}</span>` +
        `<span class="op-csi-label">${escapeHtml(sec.title)}</span></a>`
      ).join("") +
      `</nav>`
    : "";
  const sectionTagHtml = meta.title
    ? `<aside class="op-canvas-section-tag" role="button" tabindex="0" title="맨 위로">` +
      `<span class="op-cst-label">${escapeHtml(meta.title)}</span>` +
      `</aside>`
    : "";

  const stageHtml = `
<section class="op-hero-carousel op-hero-single">
  <div class="op-hero-stage">
    ${slidesHtml}
    ${sectionIndexHtml}
    ${sectionTagHtml}
    <div class="op-hero-overlay">
      <span></span>
      <span class="op-hero-counter">1 / ${total}</span>
    </div>
  </div>
</section>`;

  // ── Editorial Statement ──────────────────────────────────────────────
  // meta.statement: { eyebrow, text, cta: { label, href } }
  let editorialHtml = "";
  if (meta.statement) {
    const stmt = typeof meta.statement === "string"
      ? { text: meta.statement }
      : meta.statement;
    editorialHtml = EditorialStatement(stmt);
  }

  // ── Divisions Section ─────────────────────────────────────────────────
  // Linked (multi-HTML) history items → DivisionCard feed. In-deck full
  // documents are shown inline as flowing slides, so they're not duplicated here.
  let divisionsHtml = "";
  const linkedHistory = history.filter(item => item && item.href);
  if (linkedHistory.length > 0) {
    const divLabel = escapeHtml(meta.divisionsLabel || "Previous Outputs");
    const cards = linkedHistory.map(item => {
      const autoEyebrow = [item.date, contentTypeLabel(item.content)].filter(Boolean).join("  ·  ");
      return DivisionCard({
        eyebrow:     item.eyebrow     || autoEyebrow,
        title:       item.title       || "Untitled",
        description: item.description || "",
        href:        item.href        || null,
      });
    }).join("\n");

    divisionsHtml = `
<section class="op-section op-canvas-divisions" id="canvas-divisions">
  <h2 class="op-section-title">${divLabel}</h2>
  <div class="op-section-body">
    ${cards}
  </div>
</section>`;
  }

  // ── CSS ──────────────────────────────────────────────────────────────
  const theme           = loadCss(`themes/${themeName}.css`);
  const baseCss         = loadCss("assets/base.css");
  const siteHeaderCss   = loadCss("assets/components/site-header.css");
  const heroCss         = loadCss("assets/components/hero-carousel.css");
  const canvasCss       = loadCss("assets/components/canvas-stage.css");
  const editorialCss    = loadCss("assets/components/editorial-statement.css");
  const divisionCss     = loadCss("assets/components/division-card.css");

  // Collect all used component CSS
  const usedComponents = new Set();
  function collectDeep(node) {
    if (!node || typeof node !== "object") return;
    if (typeof node.component === "string") usedComponents.add(node.component);
    if (Array.isArray(node.children)) node.children.forEach(collectDeep);
  }
  if (feat) collectDeep(feat);
  history.forEach(h => {
    if (!h.content) return;
    if (Array.isArray(h.content)) h.content.forEach(collectDeep);
    else collectDeep(h.content);
  });

  let componentCss = "";
  for (const comp of usedComponents) {
    const fb = componentFileBase(comp);
    const p  = resolve(PLUGIN_ROOT, "assets/components", fb + ".css");
    if (existsSync(p)) componentCss += "\n/* " + comp + " */\n" + readFileSync(p, "utf8");
  }

  // Extra CSS: canvas-specific layout overrides (theme-agnostic)
  const extraCss = `
/* ── Body / page reset for canvas full-bleed ── */
body { margin: 0; padding: 0 !important; background: var(--op-color-bg); }

/* ── Fixed nav with an always-on gradient boundary (mode-aware via bg) ── */
.op-site-header {
  position: fixed;
  top: 0; left: 0; right: 0;
  background: linear-gradient(to bottom,
    var(--op-color-bg) 0%,
    color-mix(in oklab, var(--op-color-bg) 72%, transparent) 60%,
    transparent 100%);
  border-bottom: none;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
  z-index: 50;
}
.op-site-header.op-scrolled {
  background: color-mix(in oklab, var(--op-color-bg) 85%, transparent);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border-bottom: 1px solid var(--op-color-border);
}

/* ── Hero stage: force bg-color (not muted) for deep dark look ── */
.op-hero-stage {
  background: var(--op-color-bg) !important;
}
/* Bottom gradient + caption removed — the doc owns its title, index owns nav. */
.op-hero-slide::after { display: none; }
/* Keep the artifact's own title at the top of the document (above the first
   section), but drop the lede/subtitle — title only. */
.op-canvas-slide-inner .op-page-subtitle { display: none; }
/* Slide-meta bottom-left label */
.op-hero-slide-meta {
  position: absolute;
  left: clamp(20px, 3vw, 48px);
  bottom: clamp(24px, 4vh, 48px);
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: var(--op-color-fg);
  z-index: 2;
}
.op-hero-slide-subtitle {
  font-family: var(--op-font-mono);
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--op-color-fg-muted);
}
.op-hero-slide-title {
  font-size: clamp(24px, 3vw, 44px);
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.05;
}
.op-hero-slide-desc {
  font-size: clamp(12px, 1.2vw, 14px);
  color: var(--op-color-fg-muted);
  line-height: 1.5;
  max-width: 560px;
  margin-top: 2px;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
/* Counter bottom-right */
.op-hero-counter {
  font-family: var(--op-font-mono);
  font-size: 12px;
  letter-spacing: 0.1em;
  color: var(--op-color-fg-muted);
  background: color-mix(in oklab, var(--op-color-bg) 70%, transparent);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  padding: 5px 12px;
  border-radius: var(--op-radius);
  border: 1px solid var(--op-color-border);
}

/* ── Directional slide enter animations ── */
/* Outer slide handles opacity (hero-carousel.css crossfade).
   Inner card only moves — visible through the parent's fade. */
@keyframes op-slide-enter-next {
  from { transform: translateY(40px); }
  to   { transform: translateY(0);    }
}
@keyframes op-slide-enter-prev {
  from { transform: translateY(-40px); }
  to   { transform: translateY(0);     }
}
.op-hero-stage[data-dir="next"] .op-hero-slide-active .op-canvas-slide-inner {
  animation: op-slide-enter-next 0.55s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
.op-hero-stage[data-dir="prev"] .op-hero-slide-active .op-canvas-slide-inner {
  animation: op-slide-enter-prev 0.55s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
@media (prefers-reduced-motion: reduce) {
  .op-hero-stage[data-dir] .op-hero-slide-active .op-canvas-slide-inner {
    animation: none;
  }
}

/* ── Slide body: centered content ── */
.op-canvas-slide-body {
  position: absolute;
  inset: 0;
  display: flex;
  /* Top-align: centering clips both ends of content taller than the viewport,
     so the first/last sections become unreachable at full scroll. */
  align-items: flex-start;
  justify-content: center;
  padding: clamp(92px, 12vh, 124px) clamp(20px, 4vw, 80px) clamp(160px, 24vh, 280px);
  overflow-y: auto;
}

/* Single-document deck (no history): flow as a normal article so the WINDOW
   scrolls through every section. The nested 100lvh flex/absolute scroll model is
   for the multi-slide carousel only — on a lone document it traps the content
   and the page scroll skips past it, leaving the last sections unreachable.
   !important + display:block force a plain, reliably-scrollable flow. */
.op-hero-single .op-hero-stage {
  height: auto !important;
  min-height: 100lvh !important;
  overflow: visible !important;
  display: block !important;
}
.op-hero-single .op-hero-slide {
  position: relative !important;
  inset: auto !important;
  opacity: 1 !important;
  visibility: visible !important;
  pointer-events: auto !important;
  transition: none !important;
  scroll-margin-top: clamp(56px, 8vh, 84px);
}
/* Stacked-document feed: hairline divider between successive documents. */
.op-hero-single .op-hero-slide + .op-hero-slide {
  border-top: 1px solid var(--op-color-border);
}
.op-hero-single .op-canvas-slide-body {
  position: relative !important;
  inset: auto !important;
  display: block !important;
  overflow: visible !important;
  padding: clamp(96px, 13vh, 124px) clamp(20px, 4vw, 80px) clamp(48px, 8vh, 96px) !important;
}
.op-hero-single .op-canvas-slide-inner { margin: 0 auto !important; }
/* 1/N counter is meaningless for a single document */
.op-hero-single .op-hero-overlay { display: none !important; }

/* ── Blog-article reading column (flat, single column, clean hierarchy) ── */
.op-canvas-slide-inner {
  width: 100%;
  max-width: 760px;          /* ~comfortable measure for reading */
  background: transparent;
  border: none;
  box-shadow: none;
  padding: 0;
}
.op-canvas-slide-inner .op-page { max-width: none; padding: 0; margin: 0; }
.op-canvas-slide-inner .op-page-main { padding: 0; max-width: none; }

/* Article title (h1) */
.op-canvas-slide-inner .op-page-title {
  font-family: var(--op-font-display, var(--op-font-sans));
  font-size: clamp(30px, 4vw, 46px);
  font-weight: 700;
  line-height: 1.14;
  letter-spacing: -0.022em;
  margin: 0 0 clamp(28px, 4vh, 44px);
}

/* Sections: generous rhythm, hairline divider between them */
.op-canvas-slide-inner .op-section {
  padding: 0;
  border: none;
  max-width: none;
  margin-top: clamp(40px, 6vh, 72px);
  padding-top: clamp(40px, 6vh, 72px);
  border-top: 1px solid var(--op-color-border);
  scroll-margin-top: clamp(96px, 13vh, 132px);
}
.op-canvas-slide-inner .op-page-main > .op-section:first-child {
  margin-top: 0;
  padding-top: 0;
  border-top: none;
}

/* Section heading = blog H2 (NOT the old tiny mono eyebrow) */
.op-canvas-slide-inner .op-section-title {
  font-family: var(--op-font-display, var(--op-font-sans));
  font-size: clamp(22px, 2.6vw, 30px);
  font-weight: 600;
  letter-spacing: -0.015em;
  line-height: 1.25;
  text-transform: none;
  color: var(--op-color-fg);
  padding: 0;
  border: none;
  margin: 0 0 6px;
}
.op-canvas-slide-inner .op-section-lead {
  font-size: 1rem;
  line-height: 1.6;
  color: var(--op-color-fg-muted);
  margin: 0 0 18px;
}
.op-canvas-slide-inner .op-section-body { margin-top: 14px; }

/* Subheadings + body rhythm */
.op-canvas-slide-inner .op-heading-h3 {
  font-size: clamp(17px, 1.8vw, 20px);
  font-weight: 600;
  letter-spacing: -0.01em;
  margin: 28px 0 8px;
}
.op-canvas-slide-inner .op-prose {
  font-size: 1rem;
  line-height: 1.75;
  margin: 0 0 16px;
}
.op-canvas-slide-inner .op-prose + .op-prose { margin-top: 0; }

/* ── Right-rail section index (vertical, centered) ── */
.op-canvas-section-index {
  position: fixed;
  right: clamp(14px, 2vw, 30px);
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  gap: 4px;
  z-index: 40;
  text-align: right;
  max-width: 30vw;
}
.op-csi-item {
  display: flex;
  align-items: baseline;
  justify-content: flex-end;
  gap: 8px;
  padding: 3px 0;
  text-decoration: none;
  color: var(--op-color-fg-muted);
  opacity: 0.6;
  transition: opacity 120ms ease, color 120ms ease;
}
.op-csi-item:hover { opacity: 1; color: var(--op-color-fg); }
.op-csi-num {
  font-family: var(--op-font-mono);
  font-size: 10px;
  letter-spacing: 0.08em;
}
.op-csi-label {
  font-size: 12px;
  font-weight: 500;
  letter-spacing: -0.005em;
  max-width: 0;
  overflow: hidden;
  white-space: nowrap;
  opacity: 0;
  transition: max-width 200ms ease, opacity 160ms ease;
}
.op-canvas-section-index:hover .op-csi-label,
.op-csi-item.op-csi-active .op-csi-label {
  max-width: 24vw;
  opacity: 1;
}
.op-csi-item.op-csi-active {
  opacity: 1;
  color: var(--op-color-accent);
}

/* ── Fixed document-title tag, top-right just under the header (frameout) ── */
.op-canvas-section-tag {
  position: fixed;
  right: 0;
  top: clamp(56px, 7vh, 76px);
  z-index: 41;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 18px 16px;
  background: var(--op-color-fg);
  color: var(--op-color-bg);
  border-radius: 0;
  cursor: pointer;
}
.op-canvas-section-tag:hover { opacity: 0.9; }
.op-cst-label {
  writing-mode: vertical-rl;
  font-family: var(--op-font-display, var(--op-font-sans));
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0.01em;
  line-height: 1.25;
  max-height: 40vh;
  overflow: hidden;
}

/* Shorter viewports (e.g. laptops): shrink the tag + tighten the rail so the
   top tag and the vertically-centered rail don't collide on the right edge. */
@media (max-height: 940px) {
  /* Keep the tag L/R padding identical to large screens; only the text shrinks.
     Pull the number rail closer to the edge so it needs less room. */
  .op-cst-label { font-size: 13px; max-height: 30vh; }
  .op-canvas-section-index { gap: 2px; right: 10px; }
  .op-csi-num { font-size: 9px; }
}

@media (max-width: 900px) {
  .op-canvas-section-index,
  .op-canvas-section-tag { display: none; }
}

/* ── Sections below the hero ── */
.op-section { border-top: 1px solid var(--op-color-border); }
.op-section-title {
  font-family: var(--op-font-mono);
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--op-color-fg-muted);
  padding: clamp(40px, 5vh, 64px) clamp(20px, 4vw, 80px) 16px;
}
.op-section-body { padding: 0; }

/* ── Nav: horizontal scroll when items overflow ── */
.hs-site-header {
  gap: 16px;
}
.hs-site-header-brand {
  flex-shrink: 0;
}
.hs-site-header-nav {
  flex-shrink: 1;
  min-width: 0;
  overflow-x: auto;
  flex-wrap: nowrap;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.hs-site-header-nav::-webkit-scrollbar { display: none; }
.hs-site-header-nav li { flex-shrink: 0; }

/* ── Active nav link — plain text, no underline, no radius ── */
.op-site-header-nav a {
  border-radius: 0 !important;
  white-space: nowrap;
}
.op-site-header-nav a.op-canvas-nav-active {
  opacity: 1;
  color: var(--op-color-fg);
  background: transparent !important;
  font-weight: 500;
}

/* ── Theme toggle button ── */
.op-canvas-theme-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  background: transparent;
  border: 1px solid var(--op-color-border);
  border-radius: var(--op-radius-sm);
  color: var(--op-color-fg-muted);
  cursor: pointer;
  flex-shrink: 0;
  transition: background 120ms ease, color 120ms ease, border-color 120ms ease;
}
.op-canvas-theme-toggle:hover {
  background: var(--op-color-muted);
  color: var(--op-color-fg);
  border-color: var(--op-color-fg-muted);
}

/* ── Array content grid (used when history[].content is an array) ── */
.hs-canvas-content-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: clamp(12px, 1.5vw, 20px);
  width: 100%;
}
.hs-canvas-grid-item {
  min-width: 0;
}
.hs-canvas-content-grid .hs-kpi {
  margin: 0;
  height: 100%;
}

/* List layout — for articles, steps, any vertically-flowing content */
.op-canvas-content-list {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 720px;
}
.op-canvas-list-item {
  min-width: 0;
}

/* ── Mode toggler hide ── */
.op-mode-toggler { display: none !important; }
`;

  const css = [theme, baseCss, siteHeaderCss, heroCss, canvasCss, editorialCss, divisionCss, componentCss, extraCss]
    .filter(Boolean).join("\n");

  // ── Interactive JS ───────────────────────────────────────────────────
  const interactiveJs = readFileSync(resolve(PLUGIN_ROOT, "assets/interactive.js"), "utf8");

  return `<!doctype html>
<html lang="en" data-theme="${escapeHtml(themeName)}" data-mode="${escapeHtml(initialMode)}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(meta.title || "Canvas")}</title>
  <style>${css}</style>
</head>
<body>

${navHtml}

${stageHtml}

${editorialHtml}

${divisionsHtml}

<script>${interactiveJs}</script>
<script>${CANVAS_JS}</script>
</body>
</html>
`;
}
