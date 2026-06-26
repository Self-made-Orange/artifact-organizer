import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join, basename } from "node:path";
import { render, resolveRenderer } from "../plugins/artifact-organizer/scripts/render.mjs";
import { renderCanvas } from "../plugins/artifact-organizer/scripts/canvas.mjs";
import { Page } from "../plugins/artifact-organizer/scripts/components/page.mjs";
import { Prose } from "../plugins/artifact-organizer/scripts/components/prose.mjs";

const MINIMAL_REGISTRY = {
  "artifact-organizer/Page":  Page,
  "artifact-organizer/Prose": Prose,
};

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES = resolve(__dirname, "fixtures");
const GOLDEN = resolve(__dirname, "golden");

mkdirSync(GOLDEN, { recursive: true });

const fixtures = readdirSync(FIXTURES).filter(f => f.endsWith(".json"));

// ── Canvas-first routing ─────────────────────────────────────────────────────

test("resolveRenderer: defaults to canvas for bare component", () => {
  assert.equal(resolveRenderer({ component: "artifact-organizer/Prose", props: {} }), "canvas");
});

test("resolveRenderer: returns page when parts[] present", () => {
  assert.equal(resolveRenderer({ parts: [{}] }), "page");
});

test("resolveRenderer: returns page when template=page", () => {
  assert.equal(resolveRenderer({ template: "page" }), "page");
});

test("resolveRenderer: returns canvas when template=canvas", () => {
  assert.equal(resolveRenderer({ template: "canvas" }), "canvas");
});

// ── Standalone bare component ────────────────────────────────────────────────

test("canvas: bare component renders without error", () => {
  const doc = { component: "artifact-organizer/Prose", props: { markdown: "standalone prose" } };
  const html = renderCanvas(doc, MINIMAL_REGISTRY);
  assert.ok(html.includes("standalone prose"), "content should appear in output");
  assert.ok(html.includes("<!doctype html>"), "should produce full HTML document");
});

// ── history[].content as array ───────────────────────────────────────────────

test("canvas: history content array renders all components", () => {
  const doc = {
    template: "canvas",
    meta: { title: "Multi-content test" },
    history: [
      {
        title: "Slide A",
        content: [
          { component: "artifact-organizer/Prose", props: { markdown: "first item" } },
          { component: "artifact-organizer/Prose", props: { markdown: "second item" } },
        ],
      },
    ],
  };
  const html = renderCanvas(doc, MINIMAL_REGISTRY);
  assert.ok(html.includes("first item"), "first component should render");
  assert.ok(html.includes("second item"), "second component should render");
});

test("canvas: history content single object still works (backward compat)", () => {
  const doc = {
    template: "canvas",
    meta: { title: "Single content test" },
    history: [
      {
        title: "Slide B",
        content: { component: "artifact-organizer/Prose", props: { markdown: "single item" } },
      },
    ],
  };
  const html = renderCanvas(doc, MINIMAL_REGISTRY);
  assert.ok(html.includes("single item"), "single content should still render");
});

// ── Golden file regression ───────────────────────────────────────────────────

for (const fx of fixtures) {
  test(`golden: ${fx}`, async () => {
    const doc = JSON.parse(readFileSync(join(FIXTURES, fx), "utf8"));
    const html = await render(doc);
    const goldenPath = join(GOLDEN, fx.replace(/\.json$/, ".html"));

    if (process.env.UPDATE_GOLDEN === "1" || !existsSync(goldenPath)) {
      writeFileSync(goldenPath, html, "utf8");
      console.log(`wrote golden: ${basename(goldenPath)}`);
      return;
    }

    const expected = readFileSync(goldenPath, "utf8");
    assert.equal(html, expected, `golden mismatch for ${fx} — run UPDATE_GOLDEN=1 npm test to accept`);
  });
}
