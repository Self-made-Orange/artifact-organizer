import { test } from "node:test";
import assert from "node:assert/strict";
import { loadTheme, listThemes, modeTogglerHtml } from "../../plugins/artifact-organizer/scripts/lib/theme.mjs";

const BUNDLED = ["notion", "linear", "vercel", "stripe", "supabase", "apple", "tailwind"];

test("listThemes: finds exactly the 7 bundled themes", () => {
  const names = listThemes();
  for (const n of BUNDLED) {
    assert.ok(names.includes(n), `missing theme ${n}`);
  }
  assert.equal(names.length, BUNDLED.length, `expected ${BUNDLED.length} themes, got ${names.length}: ${names.join(",")}`);
});

test("listThemes: legacy themes (studio/midnight/void/gallery) are gone", () => {
  const names = listThemes();
  for (const n of ["studio", "midnight", "void", "gallery"]) {
    assert.ok(!names.includes(n), `legacy theme ${n} should be removed`);
  }
});

test("loadTheme: returns CSS string for default theme", () => {
  const css = loadTheme("notion");
  assert.match(css, /\[data-theme="notion"\]/);
  assert.match(css, /--op-color-fg/);
});

test("loadTheme: notion theme exposes tone + surface variables", () => {
  const css = loadTheme("notion");
  assert.match(css, /--op-color-surface:/);
  assert.match(css, /--op-tone-success-bg:/);
  assert.match(css, /--op-tone-danger-fg:/);
});

for (const name of BUNDLED) {
  test(`loadTheme: ${name} defines both light + dark blocks`, () => {
    const css = loadTheme(name);
    assert.match(css, new RegExp(`\\[data-theme="${name}"\\]\\s*\\{`));
    assert.match(css, new RegExp(`\\[data-theme="${name}"\\]\\[data-mode="dark"\\]`));
  });
}

test("loadTheme: throws on unknown theme", () => {
  assert.throws(() => loadTheme("does-not-exist"), /theme/i);
});

test("loadTheme: removed legacy theme name throws", () => {
  assert.throws(() => loadTheme("studio"), /Unknown theme/);
});

test("modeTogglerHtml: emits a single toggle button + init script", () => {
  const html = modeTogglerHtml();
  assert.match(html, /<button[^>]+class="op-mode-toggler"/);
  assert.match(html, /id="op-mode-toggler"/);
  assert.match(html, /aria-label="Toggle light\/dark mode"/);
  assert.match(html, /op-mode-icon-sun/);
  assert.match(html, /op-mode-icon-moon/);
  assert.match(html, /artifact-organizer\.mode/);
});

test("modeTogglerHtml: respects prefers-color-scheme on first load", () => {
  const html = modeTogglerHtml();
  assert.match(html, /prefers-color-scheme: dark/);
});
