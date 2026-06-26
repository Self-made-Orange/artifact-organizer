import { test } from "node:test";
import assert from "node:assert/strict";
import { Callout } from "../../plugins/artifact-organizer/scripts/components/callout.mjs";

test("Callout: wraps with severity class", () => {
  const html = Callout({ severity: "warn", body: "hi" });
  assert.match(html, /<aside class="op-callout op-callout-warn"/);
});

test("Callout: renders title when present", () => {
  const html = Callout({ severity: "info", title: "Heads up", body: "x" });
  assert.match(html, /<div class="op-callout-title">Heads up<\/div>/);
});

test("Callout: omits title div when absent", () => {
  const html = Callout({ severity: "info", body: "x" });
  assert.doesNotMatch(html, /op-callout-title/);
});

test("Callout: renders body as markdown", () => {
  const html = Callout({ severity: "info", body: "**bold** body" });
  assert.match(html, /<div class="op-callout-body"><p><strong>bold<\/strong> body<\/p><\/div>/);
});

test("Callout: escapes title HTML", () => {
  const html = Callout({ severity: "info", title: "<x>", body: "y" });
  assert.match(html, />&lt;x&gt;</);
});

test("Callout: all 5 severity variants produce matching class", () => {
  for (const s of ["info","note","warn","success","danger"]) {
    const html = Callout({ severity: s, body: "x" });
    assert.match(html, new RegExp(`op-callout-${s}`));
  }
});
