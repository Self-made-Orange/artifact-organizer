import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { SlideDeck } from "../../plugins/artifact-organizer/scripts/components/slide-deck.mjs";

test("SlideDeck: wraps with aspect class", () => {
  const html = SlideDeck({ aspect: "16:9" }, () => "<slide>");
  assert.match(html, /<section class="op-deck op-deck-aspect-16-9"/);
});

test("SlideDeck: aspect 4:3 class", () => {
  const html = SlideDeck({ aspect: "4:3" }, () => "");
  assert.match(html, /op-deck-aspect-4-3/);
});

test("SlideDeck: applies transition class when provided", () => {
  assert.match(SlideDeck({ aspect: "16:9", transition: "fade" }, () => ""), /op-deck-transition-fade/);
  assert.match(SlideDeck({ aspect: "16:9", transition: "slide" }, () => ""), /op-deck-transition-slide/);
  assert.doesNotMatch(SlideDeck({ aspect: "16:9", transition: "none" }, () => ""), /op-deck-transition-/);
});

test("SlideDeck: includes children in slides container", () => {
  const html = SlideDeck({ aspect: "16:9" }, () => "<article>A</article><article>B</article>");
  assert.match(html, /<div class="op-deck-slides"><article>A<\/article><article>B<\/article><\/div>/);
});

test("SlideDeck: includes navigation controls", () => {
  const html = SlideDeck({ aspect: "16:9" }, () => "");
  assert.match(html, /<nav class="op-deck-nav">/);
  assert.match(html, /data-deck-action="prev"/);
  assert.match(html, /data-deck-action="next"/);
  assert.match(html, /class="op-deck-counter"/);
});

test("SlideDeck: renders footer when provided", () => {
  const html = SlideDeck({ aspect: "16:9", footer: "© 2026" }, () => "");
  assert.match(html, /<footer class="op-deck-footer">© 2026<\/footer>/);
});

test("SlideDeck: escapes footer", () => {
  const html = SlideDeck({ aspect: "16:9", footer: "<x>" }, () => "");
  assert.match(html, /&lt;x&gt;/);
});

test("SlideDeck: includes navigation JS with idempotent guard", () => {
  const html = SlideDeck({ aspect: "16:9" }, () => "");
  assert.match(html, /window\.__hsDeckLoaded/);
});

test("SlideDeck CSS: keeps slide viewport palette independent from page mode", () => {
  const css = readFileSync(new URL("../../plugins/artifact-organizer/assets/components/slide-deck.css", import.meta.url), "utf8");
  assert.match(css, /--op-slide-bg:\s+#ffffff/);
  assert.match(css, /--op-color-fg:\s+var\(--op-slide-fg\)/);
  assert.match(css, /\.op-deck-slides \{\s*position: relative;\s*background: var\(--op-slide-bg\)/m);
});

function classAttr(html) {
  const m = html.match(/^<section class="([^"]+)"/);
  return m ? m[1] : "";
}

test("SlideDeck: default mode emits no mode class (backward-compat)", () => {
  assert.doesNotMatch(classAttr(SlideDeck({ aspect: "16:9" }, () => "")), /op-deck-mode-/);
  assert.doesNotMatch(classAttr(SlideDeck({ aspect: "16:9", mode: "deck" }, () => "")), /op-deck-mode-/);
});

test("SlideDeck: scroll-snap mode emits class and nests nav inside slides container", () => {
  const html = SlideDeck({ aspect: "16:9", mode: "scroll-snap" }, () => "<article>A</article>");
  assert.match(classAttr(html), /op-deck-mode-scroll-snap/);
  assert.match(html, /<div class="op-deck-slides"><article>A<\/article><nav class="op-deck-nav">/);
});

test("SlideDeck: scroll-jack mode emits class and nests nav inside slides container", () => {
  const html = SlideDeck({ aspect: "16:9", mode: "scroll-jack" }, () => "<article>A</article>");
  assert.match(classAttr(html), /op-deck-mode-scroll-jack/);
  assert.match(html, /<div class="op-deck-slides"><article>A<\/article><nav class="op-deck-nav">/);
});

test("SlideDeck: scroll modes still render footer outside slides container", () => {
  const html = SlideDeck({ aspect: "16:9", mode: "scroll-snap", footer: "ftr" }, () => "");
  assert.match(html, /<\/div><footer class="op-deck-footer">ftr<\/footer>/);
});

test("SlideDeck JS: detects mode from class and branches scroll logic", () => {
  const html = SlideDeck({ aspect: "16:9", mode: "scroll-jack" }, () => "");
  assert.match(html, /op-deck-mode-scroll-jack/);
  assert.match(html, /'scroll-jack'/);
  assert.match(html, /'scroll-snap'/);
  assert.match(html, /IntersectionObserver/);
  assert.match(html, /--op-deck-jack-units/);
  assert.match(html, /prefers-reduced-motion/);
});

test("SlideDeck CSS: ships scroll-snap, scroll-jack, and reduced-motion rules", () => {
  const css = readFileSync(new URL("../../plugins/artifact-organizer/assets/components/slide-deck.css", import.meta.url), "utf8");
  assert.match(css, /\.op-deck-mode-scroll-snap/);
  assert.match(css, /scroll-snap-type: y mandatory/);
  assert.match(css, /\.op-deck-mode-scroll-jack/);
  assert.match(css, /position: sticky/);
  assert.match(css, /var\(--op-deck-jack-units, 1\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
});
