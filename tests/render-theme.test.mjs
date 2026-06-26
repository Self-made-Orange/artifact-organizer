import { test } from "node:test";
import assert from "node:assert/strict";
import { render, resolveRenderer } from "../plugins/artifact-organizer/scripts/render.mjs";

const envelope = {
  a2ui_version: "0.9",
  catalog: "artifact-organizer/v1",
  is_task_complete: true,
  parts: [{ component: "artifact-organizer/Page", props: { title: "t" }, children: [] }]
};

test("render: default theme is notion", async () => {
  const html = await render(envelope);
  assert.match(html, /data-theme="notion"/);
  assert.match(html, /\[data-theme="notion"\]/);
});

for (const name of ["notion", "linear", "vercel", "stripe", "supabase", "apple", "tailwind"]) {
  test(`render: --theme ${name} applied`, async () => {
    const html = await render(envelope, { theme: name });
    assert.match(html, new RegExp(`data-theme="${name}"`));
    assert.match(html, new RegExp(`\\[data-theme="${name}"\\]`));
  });
}

test("render: mode toggler always injected", async () => {
  const html = await render(envelope);
  assert.match(html, /id="op-mode-toggler"/);
});

test("render: unknown theme throws", async () => {
  await assert.rejects(() => render(envelope, { theme: "nope" }), /theme/i);
});

test("render: removed legacy theme throws", async () => {
  await assert.rejects(() => render(envelope, { theme: "studio" }), /Unknown theme/);
});

test("render: mode=dark injects data-mode on <html>", async () => {
  const html = await render(envelope, { theme: "linear", mode: "dark" });
  assert.match(html, /<html[^>]*data-mode="dark"/);
});

test("render: mode=light injects data-mode on <html>", async () => {
  const html = await render(envelope, { theme: "vercel", mode: "light" });
  assert.match(html, /<html[^>]*data-mode="light"/);
});

test("render: mode=auto omits data-mode attribute", async () => {
  const html = await render(envelope, { theme: "notion", mode: "auto" });
  assert.doesNotMatch(html, /data-mode="auto"/);
  // toggler script still controls data-mode at runtime
  assert.match(html, /id="op-mode-toggler"/);
});

test("render: no mode option omits data-mode attribute", async () => {
  const html = await render(envelope, { theme: "notion" });
  assert.doesNotMatch(html, /<html[^>]*data-mode=/);
});

test("render: invalid mode value throws", async () => {
  await assert.rejects(() => render(envelope, { theme: "notion", mode: "twilight" }), /mode/i);
});

/* === Backwards-compat alias: legacy `hyperscribe/X` envelopes still render === */

test("render: legacy hyperscribe/Page envelope renders unchanged", async () => {
  const legacy = {
    a2ui_version: "0.9",
    catalog: "hyperscribe/v1",
    is_task_complete: true,
    parts: [{ component: "hyperscribe/Page", props: { title: "legacy" }, children: [] }]
  };
  const html = await render(legacy);
  // Input is not mutated
  assert.equal(legacy.parts[0].component, "hyperscribe/Page");
  assert.equal(legacy.catalog, "hyperscribe/v1");
  // Output renders normally
  assert.match(html, /data-theme="notion"/);
  assert.match(html, /<title>legacy<\/title>/);
});

test("render: legacy nested hyperscribe/* children are normalized too", async () => {
  const legacy = {
    a2ui_version: "0.9",
    catalog: "hyperscribe/v1",
    is_task_complete: true,
    parts: [{
      component: "hyperscribe/Page",
      props: { title: "nested legacy" },
      children: [
        { component: "hyperscribe/Section", props: { id: "s", title: "S" }, children: [
          { component: "hyperscribe/Prose", props: { markdown: "legacy prose body" } }
        ]}
      ]
    }]
  };
  const html = await render(legacy);
  assert.match(html, /legacy prose body/);
});

/* === resolveRenderer routing === */

test("resolveRenderer: parts[] routes to page (auto)", () => {
  assert.equal(resolveRenderer({ parts: [{}] }), "page");
});

test("resolveRenderer: template:page routes to page (auto)", () => {
  assert.equal(resolveRenderer({ template: "page" }), "page");
});

test("resolveRenderer: empty doc routes to canvas (auto)", () => {
  assert.equal(resolveRenderer({}), "canvas");
});

test("resolveRenderer: template:canvas routes to canvas (auto)", () => {
  assert.equal(resolveRenderer({ template: "canvas" }), "canvas");
});

test("resolveRenderer: explicit renderer:page overrides empty doc", () => {
  assert.equal(resolveRenderer({}, { renderer: "page" }), "page");
});

test("resolveRenderer: explicit renderer:canvas overrides parts[]", () => {
  assert.equal(resolveRenderer({ parts: [{}] }, { renderer: "canvas" }), "canvas");
});

test("resolveRenderer: renderer:auto behaves like no override", () => {
  assert.equal(resolveRenderer({ parts: [{}] }, { renderer: "auto" }), "page");
  assert.equal(resolveRenderer({},               { renderer: "auto" }), "canvas");
});
