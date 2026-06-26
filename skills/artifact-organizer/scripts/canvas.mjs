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

// A document's lede/description = the Page node's subtitle prop, if present.
function pageSubtitle(node) {
  return (node && node.props && typeof node.props.subtitle === "string") ? node.props.subtitle : "";
}

// URL-hash slug for a document (keeps ASCII alphanumerics + Hangul).
function slugify(s) {
  return String(s || "").trim().toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-+|-+$/g, "") || "doc";
}

// Carousel + scroll + nav + theme-toggle JS, all self-contained
const CANVAS_JS = `
(function () {
  var html = document.documentElement;

  // ── Light/dark toggle (flips data-mode, keeps the theme) ──
  var toggleBtn = document.getElementById('op-theme-toggle');
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
  applyMode(localStorage.getItem('artifact-organizer.mode') || html.getAttribute('data-mode') || 'dark');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', function () {
      applyMode(html.getAttribute('data-mode') === 'dark' ? 'light' : 'dark');
    });
  }

  // ── Frosted header on scroll ──
  var hdr = document.querySelector('.op-site-header');
  if (hdr) {
    window.addEventListener('scroll', function () {
      hdr.classList.toggle('op-scrolled', window.scrollY > 40);
    }, { passive: true });
  }

  // ── Document selection: the chosen doc fills the hero, the rest are cards ──
  var panels     = Array.from(document.querySelectorAll('.op-feed-panel'));
  var cards      = Array.from(document.querySelectorAll('.op-feed-card'));
  var navLinks   = Array.from(document.querySelectorAll('[data-canvas-nav]'));
  var railGroups = Array.from(document.querySelectorAll('.op-csi-group'));
  var tagLabel   = document.querySelector('.op-canvas-section-tag .op-cst-label');
  var titleBySlide = {};
  railGroups.forEach(function (g) { titleBySlide[g.getAttribute('data-slide')] = g.getAttribute('data-title') || ''; });

  // Each document has a URL-hash slug, so a selection is a shareable link.
  var slugByDoc = {}, docBySlug = {};
  panels.forEach(function (p) {
    var d = p.getAttribute('data-doc'), sl = p.getAttribute('data-slug');
    if (sl) { slugByDoc[d] = sl; docBySlug[sl] = d; }
  });
  function hashSlug() { return decodeURIComponent((location.hash || '').replace(/^#/, '')); }
  var current = -1;

  function selectDoc(i, scroll, setHash) {
    var si = String(i);
    if (si === String(current)) { if (scroll) window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    current = i;
    panels.forEach(function (p)   { p.classList.toggle('op-feed-panel-active', p.getAttribute('data-doc') === si); });
    cards.forEach(function (c)    { c.classList.toggle('op-feed-card-hidden', c.getAttribute('data-doc') === si); });
    navLinks.forEach(function (a) { a.classList.toggle('op-canvas-nav-active', a.getAttribute('data-canvas-nav') === si); });
    railGroups.forEach(function (g) { g.classList.toggle('op-csi-group-active', g.getAttribute('data-slide') === si); });
    if (tagLabel && titleBySlide[si] != null) tagLabel.textContent = titleBySlide[si];
    if (setHash !== false && slugByDoc[si] && hashSlug() !== slugByDoc[si]) {
      location.hash = slugByDoc[si];
    }
    if (scroll !== false) window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  cards.forEach(function (c) {
    c.addEventListener('click', function () { selectDoc(c.getAttribute('data-doc')); });
  });
  navLinks.forEach(function (a) {
    a.addEventListener('click', function (e) { e.preventDefault(); selectDoc(a.getAttribute('data-canvas-nav')); });
  });
  // Back/forward or a pasted #slug link → switch the hero document.
  window.addEventListener('hashchange', function () {
    var d = docBySlug[hashSlug()];
    if (d != null) selectDoc(d, true, false);
  });

  // ── Section rail: click to scroll + highlight the section in view ──
  var csiItems = Array.from(document.querySelectorAll('.op-csi-item'));
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
  if ('IntersectionObserver' in window && csiItems.length) {
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        csiItems.forEach(function (x) { x.classList.remove('op-csi-active'); });
        var a = byId[en.target.id];
        if (a) a.classList.add('op-csi-active');
      });
    }, { root: null, rootMargin: '-15% 0px -75% 0px', threshold: 0 });
    Array.from(document.querySelectorAll('.op-feed-panel .op-section[id]')).forEach(function (el) { obs.observe(el); });
  }

  // ── Doc-title tag → scroll back to top ──
  var tagEl = document.querySelector('.op-canvas-section-tag');
  if (tagEl) {
    function scrollTop() { window.scrollTo({ top: 0, behavior: 'smooth' }); }
    tagEl.addEventListener('click', scrollTop);
    tagEl.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); scrollTop(); }
    });
  }

  // Open the document named in the URL hash (shared link), else the newest.
  var initialDoc = docBySlug[hashSlug()];
  selectDoc(initialDoc != null ? initialDoc : 0, false, false);
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
      lede:        pageSubtitle(feat),
      sections:    collectSections(feat),
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
      lede:        pageSubtitle(item.content),
      sections:    collectSections(item.content),
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

  // ── Hero-feed: the selected document fills the hero; the rest are cards ──
  // Per-document URL-hash slug (unique) so each selection has its own link.
  const seenSlugs = {};
  const docSlugs = slides.map(s => {
    const base = slugify(s.title);
    let sl = base, n = 2;
    while (seenSlugs[sl]) sl = base + "-" + (n++);
    seenSlugs[sl] = true;
    return sl;
  });

  const heroPanels = slides.map((s, i) =>
    `<article class="op-feed-panel${i === 0 ? " op-feed-panel-active" : ""}" data-doc="${i}" data-slug="${escapeHtml(docSlugs[i])}">` +
    `<div class="op-canvas-slide-inner">${s.contentHtml}</div></article>`
  ).join("\n");

  const feedCards = slides.map((s, i) => {
    const metaBits = [
      s.date,
      (s.sections && s.sections.length) ? `${s.sections.length}개 섹션` : "",
    ].filter(Boolean).join("  ·  ");
    return `<button type="button" class="op-feed-card${i === 0 ? " op-feed-card-hidden" : ""}" data-doc="${i}" data-slug="${escapeHtml(docSlugs[i])}">` +
      `<span class="op-fc-title">${escapeHtml(s.title)}</span>` +
      (s.lede ? `<span class="op-fc-desc">${escapeHtml(s.lede)}</span>` : "") +
      (metaBits ? `<span class="op-fc-meta">${escapeHtml(metaBits)}</span>` : "") +
      `</button>`;
  }).join("\n");

  const cardsHtml = slides.length > 1
    ? `<aside class="op-feed-cards" aria-label="Documents">` +
      `<div class="op-feed-cards-eyebrow">${escapeHtml(meta.divisionsLabel || "Other documents")}</div>` +
      `<div class="op-feed-cards-grid">${feedCards}</div></aside>`
    : "";

  // Number rail (click-to-jump index), grouped per document — only the group
  // for the document currently in view is shown (the JS swaps them on scroll).
  // The frameout-style edge tag shows that document's title, also swapped.
  const railGroups = slides
    .map((s, si) => {
      const secs = s.sections || [];
      if (!secs.length) return "";
      return `<div class="op-csi-group${si === 0 ? " op-csi-group-active" : ""}" data-slide="${si}" data-title="${escapeHtml(s.title)}">` +
        secs.map((sec, i) =>
          `<a class="op-csi-item" href="#${escapeHtml(sec.id)}" data-csi="${escapeHtml(sec.id)}">` +
          `<span class="op-csi-num">${String(i + 1).padStart(2, "0")}</span>` +
          `<span class="op-csi-label">${escapeHtml(sec.title)}</span></a>`
        ).join("") +
        `</div>`;
    })
    .join("");
  const sectionIndexHtml = slides.some(s => (s.sections || []).length >= 2)
    ? `<nav class="op-canvas-section-index" aria-label="Sections">${railGroups}</nav>`
    : "";
  const sectionTagHtml = (slides[0] && slides[0].title)
    ? `<aside class="op-canvas-section-tag" role="button" tabindex="0" title="맨 위로">` +
      `<span class="op-cst-label">${escapeHtml(slides[0].title)}</span>` +
      `</aside>`
    : "";

  const stageHtml = `
<section class="op-hero-feed">
  <div class="op-feed-hero">
    ${heroPanels}
  </div>
  ${cardsHtml}
  ${sectionIndexHtml}
  ${sectionTagHtml}
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

/* Sections (default = newest document): full blog flow, all open, divider */
.op-canvas-slide-inner .op-section {
  max-width: none;
  margin-top: clamp(40px, 6vh, 72px);
  padding-top: clamp(40px, 6vh, 72px);
  border-top: 1px solid var(--op-color-border);
  scroll-margin-top: clamp(96px, 13vh, 132px);
}
.op-canvas-slide-inner .op-page-main > .op-section:first-child {
  margin-top: 0; padding-top: 0; border-top: none;
}
.op-canvas-slide-inner .op-section-title {
  font-family: var(--op-font-display, var(--op-font-sans));
  font-size: clamp(22px, 2.6vw, 30px);
  font-weight: 600;
  letter-spacing: -0.015em;
  line-height: 1.25;
  text-transform: none;
  color: var(--op-color-fg);
  margin: 0 0 6px;
  padding: 0;
  border: none;
}
.op-canvas-slide-inner .op-section-lead {
  font-size: 1rem;
  line-height: 1.6;
  color: var(--op-color-fg-muted);
  margin: 0 0 18px;
}
.op-canvas-slide-inner .op-section-body { margin-top: 14px; }

/* ── Hero-feed: selected document fills the hero; others are cards below ── */
.op-hero-feed { position: relative; background: var(--op-color-bg); }
.op-feed-hero { padding: clamp(96px, 13vh, 124px) clamp(20px, 4vw, 80px) clamp(40px, 6vh, 64px); }
.op-feed-panel { display: none; }
.op-feed-panel.op-feed-panel-active { display: block; }
.op-feed-panel .op-canvas-slide-inner { max-width: 760px; margin: 0 auto; }

.op-feed-cards {
  border-top: 1px solid var(--op-color-border);
  padding: clamp(36px, 5vh, 60px) clamp(20px, 4vw, 80px) clamp(80px, 12vh, 140px);
  max-width: 1000px;
  margin: 0 auto;
}
.op-feed-cards-eyebrow {
  font-family: var(--op-font-mono);
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--op-color-fg-muted);
  margin-bottom: 16px;
}
.op-feed-cards-grid { display: grid; gap: 14px; }
.op-feed-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  text-align: left;
  font: inherit;
  color: inherit;
  cursor: pointer;
  padding: clamp(18px, 2.2vw, 26px) clamp(20px, 2.4vw, 28px);
  border: 1px solid var(--op-color-border);
  border-radius: var(--op-radius-std, 12px);
  /* very subtle fill so cards read as cards against the page bg, mode-aware */
  background: color-mix(in oklab, var(--op-color-fg) 4%, var(--op-color-bg));
  transition: border-color 0.15s ease, transform 0.15s ease, background 0.15s ease;
}
.op-feed-card:hover {
  border-color: var(--op-color-fg-muted);
  background: color-mix(in oklab, var(--op-color-fg) 7%, var(--op-color-bg));
  transform: translateY(-2px);
}
.op-feed-card-hidden { display: none; }
.op-fc-title {
  font-family: var(--op-font-display, var(--op-font-sans));
  font-size: clamp(18px, 2vw, 22px);
  font-weight: 600;
  letter-spacing: -0.01em;
}
.op-fc-desc { font-size: 0.95rem; line-height: 1.5; color: var(--op-color-fg-muted); }
.op-fc-meta {
  font-family: var(--op-font-mono);
  font-size: 11.5px;
  letter-spacing: 0.06em;
  color: var(--op-color-fg-muted);
}

/* ── Older documents (op-doc-collapsed): one collapsed card per document ──
   Collapsed shows only the document title + description; click to expand the
   whole document (sections then render in normal full flow). */
.op-doc-collapsed .op-canvas-slide-inner {
  border: 1px solid var(--op-color-border);
  border-radius: var(--op-radius-std, 12px);
  background: var(--op-color-card, var(--op-color-surface));
  padding: clamp(18px, 2.2vw, 26px) clamp(20px, 2.6vw, 32px);
}
.op-doc-collapsed.op-open .op-canvas-slide-inner { border-color: var(--op-color-fg-muted); }
/* Header = clickable title row + description */
.op-doc-collapsed .op-page-header { cursor: pointer; user-select: none; margin: 0; }
.op-doc-collapsed .op-canvas-slide-inner .op-page-title {
  font-size: clamp(20px, 2.4vw, 27px);
  margin: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}
.op-doc-collapsed .op-canvas-slide-inner .op-page-title::after {
  content: "";
  flex: none;
  width: 9px; height: 9px;
  border-right: 2px solid var(--op-color-fg-muted);
  border-bottom: 2px solid var(--op-color-fg-muted);
  transform: rotate(45deg);
  transition: transform 0.2s ease;
  margin: 0 2px 4px 0;
}
.op-doc-collapsed.op-open .op-canvas-slide-inner .op-page-title::after {
  transform: rotate(-135deg);
  margin-bottom: 0;
}
/* Description (lede) — hidden on the featured doc, shown here as the summary */
.op-doc-collapsed .op-canvas-slide-inner .op-page-subtitle {
  display: block;
  margin: 10px 0 0;
  font-size: 0.97rem;
  line-height: 1.55;
  color: var(--op-color-fg-muted);
}
/* Body (all sections) collapses; expands when the document is open */
.op-doc-collapsed .op-canvas-slide-inner .op-page-main { display: none; margin-top: clamp(22px, 3vh, 34px); }
.op-doc-collapsed.op-open .op-canvas-slide-inner .op-page-main { display: block; }

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
  z-index: 40;
  text-align: right;
  max-width: 30vw;
}
/* Only the in-view document's section group is shown. */
.op-csi-group { display: none; flex-direction: column; gap: 4px; }
.op-csi-group.op-csi-group-active { display: flex; }
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
