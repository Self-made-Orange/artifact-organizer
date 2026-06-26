import { test } from "node:test";
import assert from "node:assert/strict";
import { FileCard } from "../../plugins/artifact-organizer/scripts/components/file-card.mjs";

test("FileCard: base wrapper + name", () => {
  const html = FileCard({ name: "index.ts", responsibility: "entry point" });
  assert.match(html, /<article class="op-file-card/);
  assert.match(html, />index\.ts</);
});

test("FileCard: responsibility renders", () => {
  const html = FileCard({ name: "a.ts", responsibility: "does X" });
  assert.match(html, />does X</);
});

test("FileCard: state=modified adds state class", () => {
  const html = FileCard({ name: "a.ts", responsibility: "x", state: "modified" });
  assert.match(html, /op-file-card-state-modified/);
});

test("FileCard: default state=stable", () => {
  const html = FileCard({ name: "a.ts", responsibility: "x" });
  assert.match(html, /op-file-card-state-stable/);
});

test("FileCard: path renders when provided", () => {
  const html = FileCard({ name: "a.ts", path: "src/a.ts", responsibility: "x" });
  assert.match(html, />src\/a\.ts</);
});

test("FileCard: loc renders in footer when provided", () => {
  const html = FileCard({ name: "a.ts", responsibility: "x", loc: 142 });
  assert.match(html, /142\s*LOC/);
});

test("FileCard: exports render as chips", () => {
  const html = FileCard({
    name: "a.ts",
    responsibility: "x",
    exports: [
      { name: "render", kind: "function" },
      { name: "Props", kind: "type" }
    ]
  });
  assert.match(html, /op-file-card-export op-file-card-export-function/);
  assert.match(html, /op-file-card-export op-file-card-export-type/);
  assert.match(html, />render</);
  assert.match(html, />Props</);
});

test("FileCard: escapes name and path", () => {
  const html = FileCard({ name: "<x>.ts", path: "<y>/a", responsibility: "x" });
  assert.match(html, />&lt;x&gt;\.ts</);
  assert.match(html, />&lt;y&gt;\/a</);
});
