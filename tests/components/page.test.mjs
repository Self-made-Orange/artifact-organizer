import { test } from "node:test";
import assert from "node:assert/strict";
import { Page } from "../../plugins/artifact-organizer/scripts/components/page.mjs";

test("Page: renders title as h1", () => {
  const html = Page({ title: "Hello" }, () => "");
  assert.match(html, /<h1[^>]*class="op-page-title"[^>]*>Hello<\/h1>/);
});

test("Page: renders subtitle when provided", () => {
  const html = Page({ title: "T", subtitle: "S" }, () => "");
  assert.match(html, /<p[^>]*class="op-page-subtitle"[^>]*>S<\/p>/);
});

test("Page: omits subtitle section when not provided", () => {
  const html = Page({ title: "T" }, () => "");
  assert.doesNotMatch(html, /op-page-subtitle/);
});

test("Page: escapes title HTML", () => {
  const html = Page({ title: "<x>" }, () => "");
  assert.match(html, /<h1[^>]*>&lt;x&gt;<\/h1>/);
});

test("Page: wraps children in main", () => {
  const html = Page({ title: "T" }, () => "<div>child</div>");
  assert.match(html, /<main[^>]*class="op-page-main"[^>]*><div>child<\/div><\/main>/);
});

test("Page: outer wrapper has op-page class", () => {
  const html = Page({ title: "T" }, () => "");
  assert.match(html, /^<article class="op-page">/);
  assert.match(html, /<\/article>$/);
});
