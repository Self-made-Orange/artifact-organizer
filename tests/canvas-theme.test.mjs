import { test } from "node:test";
import assert from "node:assert/strict";
import { renderCanvas } from "../plugins/artifact-organizer/scripts/canvas.mjs";
import { REGISTRY } from "../plugins/artifact-organizer/scripts/render.mjs";

const canvas = (extra = {}) => ({
  template: "canvas",
  meta: { title: "Stack", ...extra.meta },
  featured: { component: "artifact-organizer/KPICard", props: { label: "MAU", value: "1" } },
  ...extra,
});

test("renderCanvas: applies the chosen theme via options + dark-first mode", () => {
  const html = renderCanvas(canvas(), REGISTRY, { theme: "apple" });
  assert.match(html, /<html[^>]*data-theme="apple"/);
  assert.match(html, /<html[^>]*data-mode="dark"/);
  assert.match(html, /\[data-theme="apple"\]/); // theme tokens inlined
});

test("renderCanvas: meta.theme is honored when no option is passed", () => {
  const html = renderCanvas(canvas({ meta: { title: "X", theme: "tailwind" } }), REGISTRY);
  assert.match(html, /data-theme="tailwind"/);
});

test("renderCanvas: option theme overrides meta.theme", () => {
  const html = renderCanvas(canvas({ meta: { title: "X", theme: "tailwind" } }), REGISTRY, { theme: "stripe" });
  assert.match(html, /data-theme="stripe"/);
});

test("renderCanvas: defaults to notion when nothing is specified", () => {
  const html = renderCanvas(canvas(), REGISTRY);
  assert.match(html, /data-theme="notion"/);
});

test("renderCanvas: unknown theme throws (parity with page mode)", () => {
  assert.throws(() => renderCanvas(canvas(), REGISTRY, { theme: "bogus" }), /Unknown theme/);
});

test("renderCanvas: toggle flips data-mode, not data-theme", () => {
  const html = renderCanvas(canvas(), REGISTRY, { theme: "apple" });
  assert.match(html, /artifact-organizer\.mode/);          // persists mode, not theme
  assert.doesNotMatch(html, /shadcn-dark|shadcn-light/);   // legacy theme names gone
});
