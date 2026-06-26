import { test } from "node:test";
import assert from "node:assert/strict";
import { Embed } from "../../plugins/artifact-organizer/scripts/components/embed.mjs";

test("Embed: wraps raw html in a sandboxed iframe srcdoc", () => {
  const html = Embed({ html: "<h1>Hi</h1>" });
  assert.match(html, /<figure class="op-embed"/);
  assert.match(html, /<iframe class="op-embed-frame"/);
  assert.match(html, /sandbox="allow-scripts allow-same-origin allow-popups"/);
  assert.match(html, /srcdoc="/);
});

test("Embed: escapes the embedded html into the srcdoc attribute", () => {
  const html = Embed({ html: '<p class="x">a & b "q"</p>' });
  // raw markup must be entity-escaped so it lives safely inside the attribute
  assert.match(html, /srcdoc="&lt;p class=&quot;x&quot;&gt;a &amp; b/);
  assert.doesNotMatch(html, /srcdoc="<p/);
});

test("Embed: shows no caption label — title is only the iframe a11y attribute", () => {
  const html = Embed({ html: "<i>x</i>", title: "Q3 report" });
  assert.doesNotMatch(html, /op-embed-caption/);        // no visible meta label
  assert.doesNotMatch(html, /<figcaption/);
  assert.match(html, /title="Q3 report"/);              // a11y only
});

test("Embed: auto-fits height to content when no height is given", () => {
  const html = Embed({ html: "<i>x</i>" });
  assert.match(html, /onload="[^"]*scrollHeight/);
  assert.doesNotMatch(html, /style="height:/);
});

test("Embed: a fixed numeric height opts out of auto-fit", () => {
  const html = Embed({ html: "<i>x</i>", height: 800 });
  assert.match(html, /style="height:800px"/);
  assert.doesNotMatch(html, /onload=/);
});

test("Embed: throws when html is missing", () => {
  assert.throws(() => Embed({ title: "no html" }), /html.*required/);
});
