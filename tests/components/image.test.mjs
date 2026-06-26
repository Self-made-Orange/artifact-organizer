import { test } from "node:test";
import assert from "node:assert/strict";
import { writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Image } from "../../plugins/artifact-organizer/scripts/components/image.mjs";

test("Image: renders https:// URL as passthrough <img>", () => {
  const html = Image({ src: "https://example.com/x.png", alt: "ex" });
  assert.match(html, /<figure class="op-image"/);
  assert.match(html, /<img[^>]+src="https:\/\/example\.com\/x\.png"/);
  assert.match(html, /alt="ex"/);
});

test("Image: inlines local file as base64 data URL", () => {
  const dir = mkdtempSync(join(tmpdir(), "op-img-"));
  const p = join(dir, "one.png");
  writeFileSync(p, Buffer.from([137,80,78,71,13,10,26,10])); // PNG magic
  try {
    const html = Image({ src: p, alt: "local" });
    assert.match(html, /src="data:image\/png;base64,/);
  } finally {
    rmSync(dir, { recursive: true });
  }
});

test("Image: renders caption when present", () => {
  const html = Image({ src: "https://a.png", alt: "a", caption: "fig 1" });
  assert.match(html, /<figcaption class="op-image-caption">fig 1<\/figcaption>/);
});

test("Image: width/height attributes emitted when given", () => {
  const html = Image({ src: "https://a.png", alt: "a", width: 400, height: 200 });
  assert.match(html, /width="400"/);
  assert.match(html, /height="200"/);
});

test("Image: escapes alt + caption", () => {
  const html = Image({ src: "https://a.png", alt: "<x>", caption: "<y>" });
  assert.match(html, /alt="&lt;x&gt;"/);
  assert.match(html, />&lt;y&gt;</);
});

test("Image: throws on missing src", () => {
  assert.throws(() => Image({ alt: "x" }), /src/);
});
