import { test } from "node:test";
import assert from "node:assert/strict";
import { Prose } from "../../plugins/artifact-organizer/scripts/components/prose.mjs";

test("Prose: wraps markdown in op-prose container", () => {
  const html = Prose({ markdown: "hello" });
  assert.equal(html, '<div class="op-prose"><p>hello</p></div>');
});

test("Prose: renders bold", () => {
  const html = Prose({ markdown: "**bold**" });
  assert.equal(html, '<div class="op-prose"><p><strong>bold</strong></p></div>');
});

test("Prose: renders list", () => {
  const html = Prose({ markdown: "- a\n- b" });
  assert.equal(html, '<div class="op-prose"><ul><li>a</li><li>b</li></ul></div>');
});

test("Prose: empty markdown produces empty container", () => {
  const html = Prose({ markdown: "" });
  assert.equal(html, '<div class="op-prose"></div>');
});
