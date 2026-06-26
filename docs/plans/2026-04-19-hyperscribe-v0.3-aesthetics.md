# Artifact Organizer v0.3 — Aesthetic Variants, Image, Pretty Charts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Raise the visual ceiling of Artifact Organizer output — add inline images, a theme system with light/dark support and a first alternate theme (Linear), plus two native SVG components (PrettyChart, FlowChart) that look better than the current Chart.js / Mermaid defaults.

**Architecture:**
- Extract color/typography tokens from `base.css` into `plugins/artifact-organizer/themes/*.css` files. `base.css` keeps structural rules only (layout, spacing scale, component structure). Themes override via the same `--hs-*` CSS variables.
- `render.mjs` gains `--theme <name>` flag. HTML output embeds the selected theme CSS inline and, when the catalog has multiple themes, emits a small `<select>` switcher that toggles `data-theme` on `<html>` and persists the choice in `localStorage`.
- Three new catalog components: `artifact-organizer/Image` (URL or local file; local gets base64-inlined at render time), `artifact-organizer/PrettyChart` (SVG-native bar/line with gradient fills + soft drop shadow), `artifact-organizer/FlowChart` (SVG-native directed graph, nodes + edges, TD/LR layout — alternative to Mermaid for common cases).
- Everything stays zero-dep at runtime. Testing continues via `node:test` + assertions against generated HTML strings.

**Tech Stack:** Node 20 stdlib, pure SVG/CSS, no new npm deps. Base64 via `Buffer.from(...).toString("base64")` for image inlining.

---

## File Structure

```
plugins/artifact-organizer/
├── assets/
│   ├── base.css                       (trimmed: layout/spacing/typography structure only)
│   └── components/
│       ├── image.css                  (new)
│       ├── pretty-chart.css           (new)
│       └── flow-chart.css             (new)
├── themes/                            (new directory)
│   ├── notion.css                     (extracted from current base.css)
│   ├── notion-dark.css                (dark variant)
│   └── linear.css                     (new — dark-native Linear-style)
├── scripts/
│   ├── components/
│   │   ├── image.mjs                  (new)
│   │   ├── pretty-chart.mjs           (new)
│   │   └── flow-chart.mjs             (new)
│   ├── lib/
│   │   └── theme.mjs                  (new — theme loading + switcher HTML)
│   └── render.mjs                     (modify: --theme flag, theme loader, switcher injection)
├── spec/catalog.json                  (modify: add Image, PrettyChart, FlowChart)
├── references/catalog.md              (regenerated)
└── SKILL.md                           (modify: document new components + theming)

tests/
├── components/
│   ├── image.test.mjs                 (new)
│   ├── pretty-chart.test.mjs          (new)
│   └── flow-chart.test.mjs            (new)
├── lib/theme.test.mjs                 (new)
└── render-theme.test.mjs              (new — end-to-end theme flag)

tools/build-catalog-md.mjs             (modify: categorize new components)
```

---

## Open Design Decisions (locked for implementation)

- **Image sources:** `props.src` accepts (1) `file://` or relative path → base64 inline at render time (keeps output self-contained); (2) `https://` URL → passed through as `<img src>` (output loses offline guarantee but envelope stays small). Rejection: remote URLs are flagged on render but NOT blocked — the user may want them.
- **Image sizing:** `width` and `height` optional props in px. If only one is given, the other scales naturally (CSS `height: auto` / `width: auto`). Captions via optional `caption`.
- **Theme CSS variable boundary:** `base.css` uses NO color literals except `transparent` and full opacity constants. All chromatic values live in theme files. Typography scale (sizes, line-heights) stays in `base.css`; font families are theme-owned.
- **Theme switcher UX:** Rendered as a small, fixed-position `<div class="hs-theme-switcher">` in the top-right corner with a `<select>`. Hidden when only one theme is available. Persists to `localStorage['hyperscribe.theme']`. Initial value: `prefers-color-scheme` + default-theme match, overridden by saved choice.
- **PrettyChart scope for v0.3:** `kind` = `"bar"` | `"line"`. `kind: "pie"` and others stay in `artifact-organizer/Chart` (Chart.js). PrettyChart is for cases where visual polish matters; Chart is for "I just need a chart."
- **FlowChart scope for v0.3:** Directed graph, nodes with `{id, label, shape?: "box"|"pill"|"diamond"}`, edges with `{from, to, label?}`. Layout: manual grid with `layout: "TD"|"LR"` and `ranks: string[][]` (array-of-arrays where each inner array is one rank of node ids). No automatic layout solver — keep it simple; the LLM decides ranks.
- **Linear theme typography:** Use Inter Variable via Google Fonts CDN (explicitly acknowledge this breaks strict offline rule for the Linear theme only). Notion + Notion-dark stay CDN-free. Document the tradeoff in SKILL.md.
- **Version bump:** `0.2.0-alpha` → `0.3.0-alpha`.

---

## Execution Notes

- **Order matters.** Task 2 (theme infra) must land before Task 3 (dark mode) and Task 4 (Linear theme). Tasks 1, 5, 6 are independent of theme work and can be dispatched in parallel. Task 7 (final integration + verification) comes last.
- **Subagent dispatch hint:** Each task below is self-contained with exact file paths and code. Dispatch fresh subagent per task. Run the two-stage review (spec compliance, then code quality) after each task per `superpowers:subagent-driven-development`.
- **Branch strategy:** Work on `main` directly (single-developer repo). Each task commits at the end of its checklist. No PRs needed.

---

## Task 1: `artifact-organizer/Image` component

**Files:**
- Create: `plugins/artifact-organizer/scripts/components/image.mjs`
- Create: `plugins/artifact-organizer/assets/components/image.css`
- Create: `tests/components/image.test.mjs`
- Modify: `plugins/artifact-organizer/spec/catalog.json` (add Image entry)
- Modify: `plugins/artifact-organizer/scripts/render.mjs` (register Image)
- Modify: `tools/build-catalog-md.mjs` (new category "Media" for Image)
- Modify: `plugins/artifact-organizer/SKILL.md` (list Image under components)

- [ ] **Step 1: Write failing tests** at `tests/components/image.test.mjs`

```javascript
import { test } from "node:test";
import assert from "node:assert/strict";
import { writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Image } from "../../plugins/artifact-organizer/scripts/components/image.mjs";

test("Image: renders https:// URL as passthrough <img>", () => {
  const html = Image({ src: "https://example.com/x.png", alt: "ex" });
  assert.match(html, /<figure class="hs-image"/);
  assert.match(html, /<img[^>]+src="https:\/\/example\.com\/x\.png"/);
  assert.match(html, /alt="ex"/);
});

test("Image: inlines local file as base64 data URL", () => {
  const dir = mkdtempSync(join(tmpdir(), "hs-img-"));
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
  assert.match(html, /<figcaption class="hs-image-caption">fig 1<\/figcaption>/);
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
```

- [ ] **Step 2: Run tests — expect all to fail**

```
cd /Users/seongil/works/hyperscribe && node --test tests/components/image.test.mjs
```

- [ ] **Step 3: Implement `plugins/artifact-organizer/scripts/components/image.mjs`**

```javascript
import { readFileSync, existsSync } from "node:fs";
import { extname } from "node:path";
import { escape, attr } from "../lib/html.mjs";

const MIME = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif", ".svg": "image/svg+xml", ".webp": "image/webp" };

function resolveSrc(src) {
  if (/^(https?:|data:)/i.test(src)) return src;
  const path = src.startsWith("file://") ? src.slice(7) : src;
  if (!existsSync(path)) throw new Error(`Image src not found: ${path}`);
  const mime = MIME[extname(path).toLowerCase()] || "application/octet-stream";
  const b64 = readFileSync(path).toString("base64");
  return `data:${mime};base64,${b64}`;
}

export function Image(props) {
  if (!props || !props.src) throw new Error("Image: 'src' is required");
  const src = resolveSrc(props.src);
  const alt = props.alt || "";
  const w = props.width ? ` width="${Number(props.width)}"` : "";
  const h = props.height ? ` height="${Number(props.height)}"` : "";
  const caption = props.caption ? `<figcaption class="hs-image-caption">${escape(props.caption)}</figcaption>` : "";
  return `<figure class="hs-image"><img src="${attr(src)}" alt="${attr(alt)}"${w}${h} loading="lazy"/>${caption}</figure>`;
}
```

Verify that `plugins/artifact-organizer/scripts/lib/html.mjs` exports both `escape` and `attr`. If `attr` is missing, add: `export function attr(s){ return String(s).replace(/"/g,"&quot;").replace(/&/g,"&amp;"); }` — but only if not already present.

- [ ] **Step 4: Create `plugins/artifact-organizer/assets/components/image.css`**

```css
.hs-image {
  margin: var(--hs-space-5) 0;
  padding: 0;
  text-align: center;
}
.hs-image img {
  max-width: 100%;
  height: auto;
  border-radius: var(--hs-radius-comfort);
  border: var(--hs-border-whisper);
  display: inline-block;
}
.hs-image-caption {
  margin-top: var(--hs-space-2);
  font-size: 13px;
  color: var(--hs-color-fg-muted);
  line-height: 1.4;
}
```

- [ ] **Step 5: Register Image in `plugins/artifact-organizer/scripts/render.mjs`**

Add import near other component imports:
```javascript
import { Image } from "./components/image.mjs";
```

Add to `REGISTRY`:
```javascript
"artifact-organizer/Image": Image,
```

- [ ] **Step 6: Add to `plugins/artifact-organizer/spec/catalog.json`** (under a new "Media" concept — place between `Prose` and `Callout`)

```json
"artifact-organizer/Image": {
  "description": "Inline image. Accepts https:// URLs (passed through) or local paths (base64-inlined at render time to keep the HTML self-contained).",
  "children": "forbidden",
  "props": {
    "src": { "type": "string", "required": true, "description": "URL or local path" },
    "alt": { "type": "string", "required": true },
    "caption": { "type": "string" },
    "width": { "type": "number" },
    "height": { "type": "number" }
  }
},
```

- [ ] **Step 7: Update `tools/build-catalog-md.mjs` — add `Image` to categorize() under new category `"Media"`** and insert `"Media"` into `CATEGORY_ORDER` between `"Structure"` and `"Emphasis"`.

```javascript
if (["Image"].some(x => name.endsWith("/" + x))) return "Media";
```

```javascript
const CATEGORY_ORDER = ["Structure", "Media", "Emphasis", "Code", "Diagrams", "Data", "Narrative", "Dashboard", "Slides", "Other"];
```

- [ ] **Step 8: Run tests — expect all to pass + regen catalog.md**

```
cd /Users/seongil/works/hyperscribe && node --test tests/components/image.test.mjs && node tools/build-catalog-md.mjs && npm test
```

- [ ] **Step 9: Update SKILL.md** — in the component inventory table add a row:
`| Media | \`artifact-organizer/Image\` | Inline image. \`src\` accepts URL or local path (local → base64 inlined). Props: \`src\`, \`alt\`, \`caption?\`, \`width?\`, \`height?\`. |`

- [ ] **Step 10: Commit**

```bash
git add -A && git commit -m "feat: artifact-organizer/Image component with base64 inline for local files"
```

---

## Task 2: Theme system infrastructure

**Files:**
- Create: `plugins/artifact-organizer/themes/notion.css`
- Create: `plugins/artifact-organizer/scripts/lib/theme.mjs`
- Create: `tests/lib/theme.test.mjs`
- Create: `tests/render-theme.test.mjs`
- Modify: `plugins/artifact-organizer/assets/base.css` (strip colors/fonts to notion.css; keep structure)
- Modify: `plugins/artifact-organizer/scripts/render.mjs` (`--theme`, theme loader, HTML data-theme attribute)

### 2a. Extract tokens

- [ ] **Step 1: Create `plugins/artifact-organizer/themes/notion.css`**

Copy every `--hs-color-*`, `--hs-shadow-*`, `--hs-font-*`, `--hs-border-whisper` line from current `base.css` `:root` into the new file. Wrap with `[data-theme="notion"], :root:not([data-theme])`. Do NOT move `--hs-space-*`, `--hs-radius-*`, `--hs-container-max`.

Start of the new file:

```css
[data-theme="notion"], :root:not([data-theme]) {
  --hs-color-fg: rgba(0, 0, 0, 0.95);
  --hs-color-bg: #ffffff;
  --hs-color-accent: #0075de;
  /* ...all color + shadow + font tokens... */
}
```

- [ ] **Step 2: Strip colors/fonts from `plugins/artifact-organizer/assets/base.css`**

Remove the moved tokens from `:root`. Leave `--hs-space-*`, `--hs-radius-*`, `--hs-container-max`.

### 2b. Theme loader library

- [ ] **Step 3: Write failing tests at `tests/lib/theme.test.mjs`**

```javascript
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadTheme, listThemes } from "../../plugins/artifact-organizer/scripts/lib/theme.mjs";

test("listThemes: finds bundled themes", () => {
  const names = listThemes();
  assert.ok(names.includes("notion"));
});

test("loadTheme: returns CSS string for known theme", () => {
  const css = loadTheme("notion");
  assert.match(css, /\[data-theme="notion"\]/);
  assert.match(css, /--hs-color-fg/);
});

test("loadTheme: throws on unknown theme", () => {
  assert.throws(() => loadTheme("does-not-exist"), /theme/i);
});
```

- [ ] **Step 4: Implement `plugins/artifact-organizer/scripts/lib/theme.mjs`**

```javascript
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const THEMES_DIR = resolve(__dirname, "..", "..", "themes");

export function listThemes() {
  if (!existsSync(THEMES_DIR)) return [];
  return readdirSync(THEMES_DIR)
    .filter(f => f.endsWith(".css"))
    .map(f => f.replace(/\.css$/, ""))
    .sort();
}

export function loadTheme(name) {
  const path = resolve(THEMES_DIR, `${name}.css`);
  if (!existsSync(path)) {
    throw new Error(`Unknown theme "${name}". Available: ${listThemes().join(", ")}`);
  }
  return readFileSync(path, "utf8");
}

export function themeSwitcherHtml(themes, defaultTheme) {
  if (themes.length < 2) return "";
  const options = themes.map(n => `<option value="${n}"${n === defaultTheme ? " selected" : ""}>${n}</option>`).join("");
  return `<div class="hs-theme-switcher" aria-label="Theme"><select id="hs-theme-select">${options}</select></div>
<script>(function(){
  var KEY='hyperscribe.theme';
  var saved=null;try{saved=localStorage.getItem(KEY);}catch(e){}
  var fallback='${defaultTheme}';
  var initial = saved || fallback;
  document.documentElement.setAttribute('data-theme', initial);
  var sel=document.getElementById('hs-theme-select');
  if(sel){sel.value=initial;sel.addEventListener('change',function(){
    document.documentElement.setAttribute('data-theme', sel.value);
    try{localStorage.setItem(KEY, sel.value);}catch(e){}
  });}
})();</script>`;
}
```

### 2c. Render integration

- [ ] **Step 5: Write failing tests at `tests/render-theme.test.mjs`**

```javascript
import { test } from "node:test";
import assert from "node:assert/strict";
import { render } from "../plugins/artifact-organizer/scripts/render.mjs";

const envelope = {
  a2ui_version: "0.9",
  catalog: "hyperscribe/v1",
  is_task_complete: true,
  parts: [{ component: "artifact-organizer/Page", props: { title: "t" }, children: [] }]
};

test("render: default theme notion applied", async () => {
  const html = await render(envelope);
  assert.match(html, /\[data-theme="notion"\]/);
  assert.match(html, /data-theme="notion"/); // also as html attribute
});

test("render: --theme name picked up via options.theme", async () => {
  const html = await render(envelope, { theme: "notion" });
  assert.match(html, /data-theme="notion"/);
});

test("render: unknown theme throws", async () => {
  await assert.rejects(() => render(envelope, { theme: "nope" }), /theme/i);
});
```

- [ ] **Step 6: Modify `render.mjs`** — import theme lib, add theme handling.

After existing imports:
```javascript
import { loadTheme, listThemes, themeSwitcherHtml } from "./lib/theme.mjs";
```

Change `render()` signature and body. Key points:
- Accept `options.theme` (default `"notion"`).
- Load the theme CSS and embed in `<style>` block BEFORE the base+components CSS so components can use the variables.
- Add `data-theme` on `<html>`.
- Inject switcher HTML at end of `<body>` if more than one theme exists.

Replace `buildDocument`:
```javascript
function buildDocument({ title, bodyHtml, css, theme, switcher }) {
  return `<!doctype html>
<html lang="en" data-theme="${escapeHtml(theme)}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>${css}</style>
</head>
<body>
${bodyHtml}
${switcher}
</body>
</html>
`;
}
```

Update `render()`:
```javascript
export async function render(doc, options = {}) {
  const catalog = options.catalog || loadCatalog();
  const errors = validate(doc, catalog);
  if (errors.length > 0) {
    const err = new Error("Schema validation failed");
    err.code = "SCHEMA";
    err.errors = errors;
    throw err;
  }
  const themeName = options.theme || "notion";
  const themeCss = loadTheme(themeName); // throws if unknown
  const themes = listThemes();
  const switcher = themeSwitcherHtml(themes, themeName);

  const rootNode = doc.parts[0];
  const ctx = {};
  ctx.renderNode = (node) => renderTree(node, REGISTRY, ctx);
  const bodyHtml = renderTree(rootNode, REGISTRY, ctx);
  const title = options.title || rootNode.props.title || "Artifact Organizer";
  const componentCss = options.css !== undefined ? options.css : buildCss(rootNode);
  const css = `${themeCss}\n${componentCss}`;

  return buildDocument({ title, bodyHtml, css, theme: themeName, switcher });
}
```

- [ ] **Step 7: Add `--theme` flag + wire through**

In `parseArgs()` add:
```javascript
case "--theme": args.theme = argv[++i]; break;  // already present; verify
```

In `main()` pass it:
```javascript
html = await render(doc, { title: args.title, theme: args.theme });
```

- [ ] **Step 8: Add theme switcher CSS to base.css**

```css
.hs-theme-switcher {
  position: fixed;
  top: 12px;
  right: 12px;
  z-index: 9999;
  background: var(--hs-color-bg);
  border: var(--hs-border-whisper);
  border-radius: var(--hs-radius-comfort);
  padding: 4px 8px;
  box-shadow: var(--hs-shadow-card);
}
.hs-theme-switcher select {
  background: transparent;
  border: 0;
  color: var(--hs-color-fg);
  font-family: var(--hs-font-sans);
  font-size: 12px;
  padding: 2px 4px;
  cursor: pointer;
  outline: none;
}
```

- [ ] **Step 9: Run full test suite — expect all to pass**

```
npm test
```

- [ ] **Step 10: Commit**

```bash
git add -A && git commit -m "feat(theme): extract theme system — notion tokens in plugins/artifact-organizer/themes/, --theme flag, in-page switcher"
```

---

## Task 3: `notion-dark` theme + prefers-color-scheme

**Files:**
- Create: `plugins/artifact-organizer/themes/notion-dark.css`
- Modify: `plugins/artifact-organizer/scripts/lib/theme.mjs` (auto-pair dark from prefers-color-scheme)

- [ ] **Step 1: Create `plugins/artifact-organizer/themes/notion-dark.css`**

Mirror the token set from `notion.css`, remap to dark. Use these exact values for consistency with v0.2 design direction:

```css
[data-theme="notion-dark"] {
  --hs-color-fg: rgba(255, 255, 255, 0.94);
  --hs-color-bg: #191918;
  --hs-color-accent: #4dabff;
  --hs-color-accent-active: #2d8de0;
  --hs-color-navy: #8891d0;
  --hs-color-surface-alt: #242423;
  --hs-color-surface-dark: #0f0f0e;
  --hs-color-fg-muted: #a39e98;
  --hs-color-fg-placeholder: #6e6b67;
  --hs-color-success: #4ade80;
  --hs-color-teal: #5eead4;
  --hs-color-warn: #fb923c;
  --hs-color-pink: #ff89d9;
  --hs-color-purple: #c084fc;
  --hs-color-brown: #a8784d;
  --hs-color-focus: #60a5fa;
  --hs-color-badge-bg: rgba(77, 171, 255, 0.12);
  --hs-color-badge-text: #7cc0ff;

  --hs-border-whisper: 1px solid rgba(255, 255, 255, 0.08);
  --hs-shadow-card: rgba(0,0,0,0.35) 0 4px 18px,
                    rgba(0,0,0,0.25) 0 2.025px 7.84688px,
                    rgba(0,0,0,0.18) 0 0.8px 2.925px,
                    rgba(0,0,0,0.12) 0 0.175px 1.04062px;
  --hs-shadow-deep: rgba(0,0,0,0.15) 0 1px 3px,
                    rgba(0,0,0,0.25) 0 3px 7px,
                    rgba(0,0,0,0.3) 0 7px 15px,
                    rgba(0,0,0,0.4) 0 14px 28px,
                    rgba(0,0,0,0.5) 0 23px 52px;

  --hs-font-sans: "NotionInter", Inter, -apple-system, system-ui,
                  "Segoe UI", Helvetica, Arial;
  --hs-font-mono: "JetBrains Mono", ui-monospace, SFMono-Regular,
                  Menlo, Consolas, monospace;
}
```

- [ ] **Step 2: Update Sequence + Mermaid component CSS** to use dark-safe values via variables

Ensure `plugins/artifact-organizer/assets/components/sequence.css` uses `var(--hs-color-surface-alt)` for `hs-seq-pbox` fill (already does) and that note box colors are theme-neutral. For the note box, change hardcoded `#fef9c3` / `#eab308` / `#713f12` to CSS variables:

Add to `notion.css` and `notion-dark.css`:

`notion.css`:
```css
  --hs-note-bg: #fef9c3;
  --hs-note-border: #eab308;
  --hs-note-text: #713f12;
```

`notion-dark.css`:
```css
  --hs-note-bg: rgba(234, 179, 8, 0.15);
  --hs-note-border: #eab308;
  --hs-note-text: #fde68a;
```

Update `plugins/artifact-organizer/assets/components/sequence.css`:
- `.hs-seq-note-box` fill → `var(--hs-note-bg)`
- `.hs-seq-note-box` stroke → `var(--hs-note-border)`
- `.hs-seq-note-text` fill → `var(--hs-note-text)`

Update `plugins/artifact-organizer/assets/components/mermaid.css` to reference the same variables where hardcoded (noteBkgColor stays in Mermaid JS init — see Step 3).

- [ ] **Step 3: Update Mermaid themeVariables at render time to pick up CSS variable values**

The Mermaid JS init runs in the browser, so it cannot directly read CSS variables at load time from a string template. Use `getComputedStyle(document.documentElement).getPropertyValue('--hs-color-fg').trim()` in the loader, with fallbacks. Replace the `themeVariables` object in `plugins/artifact-organizer/scripts/components/mermaid.mjs` LOADER with:

```javascript
const cs = getComputedStyle(document.documentElement);
function v(name, fallback) { return (cs.getPropertyValue(name) || '').trim() || fallback; }
window.mermaid.initialize({
  startOnLoad: false,
  theme: 'base',
  fontFamily: v('--hs-font-sans', 'Inter, system-ui, sans-serif'),
  themeVariables: {
    primaryColor: v('--hs-color-surface-alt', '#f6f5f4'),
    primaryTextColor: v('--hs-color-fg', 'rgba(0,0,0,0.95)'),
    primaryBorderColor: 'rgba(0,0,0,0.12)',
    lineColor: v('--hs-color-fg-muted', '#615d59'),
    actorBkg: v('--hs-color-surface-alt', '#f6f5f4'),
    actorTextColor: v('--hs-color-fg', 'rgba(0,0,0,0.95)'),
    signalColor: v('--hs-color-fg', 'rgba(0,0,0,0.85)'),
    signalTextColor: v('--hs-color-fg', 'rgba(0,0,0,0.95)'),
    labelBoxBkgColor: v('--hs-color-surface-alt', '#f6f5f4'),
    labelTextColor: v('--hs-color-fg', 'rgba(0,0,0,0.95)'),
    noteBkgColor: v('--hs-note-bg', '#fef9c3'),
    noteBorderColor: v('--hs-note-border', '#eab308'),
    noteTextColor: v('--hs-note-text', '#713f12')
  }
});
```

Wrap in the existing `s.onload` so it runs after the mermaid lib loads.

- [ ] **Step 4: Add prefers-color-scheme to theme switcher default**

Modify `themeSwitcherHtml()` in `plugins/artifact-organizer/scripts/lib/theme.mjs` so initial value logic becomes:
```javascript
var initial = saved;
if (!initial) {
  var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (prefersDark && ${JSON.stringify(themes)}.indexOf(fallback + '-dark') !== -1) initial = fallback + '-dark';
}
if (!initial) initial = fallback;
```

(Note: passing `themes` array into script via `JSON.stringify` is safe since names are alphanumeric.)

- [ ] **Step 5: Add test at `tests/lib/theme.test.mjs`**

```javascript
test("themeSwitcherHtml: returns empty when <2 themes", () => {
  const { themeSwitcherHtml } = await import("../../plugins/artifact-organizer/scripts/lib/theme.mjs");
  assert.equal(themeSwitcherHtml(["notion"], "notion"), "");
});

test("themeSwitcherHtml: renders select with all themes", () => {
  const html = themeSwitcherHtml(["notion", "notion-dark"], "notion");
  assert.match(html, /<select id="hs-theme-select">/);
  assert.match(html, /<option value="notion-dark">notion-dark<\/option>/);
  assert.match(html, /<option value="notion" selected>notion<\/option>/);
});
```

- [ ] **Step 6: Render a visual sample**

```bash
mkdir -p ~/.artifact-organizer/out
echo '{"a2ui_version":"0.9","catalog":"hyperscribe/v1","is_task_complete":true,"parts":[{"component":"artifact-organizer/Page","props":{"title":"Dark test"},"children":[{"component":"artifact-organizer/Section","props":{"id":"s","title":"Section"},"children":[{"component":"artifact-organizer/Prose","props":{"markdown":"Hello **world**."}}]}]}]}' | \
  node plugins/artifact-organizer/scripts/render.mjs --theme notion-dark --out ~/.hyperscribe/out/dark-sample.html
open ~/.hyperscribe/out/dark-sample.html
```

Expected: page renders with dark background and the switcher in the corner lists both `notion` and `notion-dark`.

- [ ] **Step 7: Run full test suite**

```
npm test
```

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat(theme): notion-dark variant + prefers-color-scheme auto-selection"
```

---

## Task 4: `linear` theme

**Files:**
- Create: `plugins/artifact-organizer/themes/linear.css`

- [ ] **Step 1: Write `plugins/artifact-organizer/themes/linear.css`**

Dark-native. Values taken directly from the Linear design system reference; tokens remapped to Artifact Organizer variables. Inter Variable loaded from Google Fonts — acknowledged tradeoff (not fully offline).

```css
@import url('https://rsms.me/inter/inter.css');

[data-theme="linear"] {
  --hs-color-fg: #f7f8f8;
  --hs-color-bg: #08090a;
  --hs-color-accent: #7170ff;
  --hs-color-accent-active: #828fff;
  --hs-color-navy: #5e6ad2;
  --hs-color-surface-alt: #0f1011;
  --hs-color-surface-dark: #010102;
  --hs-color-fg-muted: #8a8f98;
  --hs-color-fg-placeholder: #62666d;
  --hs-color-success: #27a644;
  --hs-color-teal: #10b981;
  --hs-color-warn: #ff9a62;
  --hs-color-pink: #ff89d9;
  --hs-color-purple: #7a7fad;
  --hs-color-brown: #a8784d;
  --hs-color-focus: #7170ff;
  --hs-color-badge-bg: rgba(113, 112, 255, 0.12);
  --hs-color-badge-text: #828fff;

  --hs-border-whisper: 1px solid rgba(255, 255, 255, 0.08);
  --hs-shadow-card: rgba(0,0,0,0.2) 0 0 0 1px,
                    rgba(0,0,0,0.4) 0 2px 4px;
  --hs-shadow-deep: rgba(0,0,0,0.3) 0px 8px 24px,
                    rgba(0,0,0,0.2) 0px 0px 0px 1px;

  --hs-font-sans: "Inter Variable", Inter, -apple-system, system-ui,
                  "SF Pro Display", "Segoe UI", Helvetica, Arial;
  --hs-font-mono: "Berkeley Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace;

  --hs-note-bg: rgba(113, 112, 255, 0.08);
  --hs-note-border: rgba(113, 112, 255, 0.4);
  --hs-note-text: #d0d6e0;
}

[data-theme="linear"] body {
  font-feature-settings: "cv01", "ss03";
  font-weight: 400;
}

[data-theme="linear"] .hs-page-title,
[data-theme="linear"] .hs-section-title {
  font-weight: 510;
  letter-spacing: -0.022em;
}

[data-theme="linear"] .hs-heading-h2 { letter-spacing: -0.022em; font-weight: 510; }
[data-theme="linear"] .hs-heading-h3 { letter-spacing: -0.012em; font-weight: 590; }
[data-theme="linear"] .hs-heading-h4 { font-weight: 590; }

[data-theme="linear"] .hs-page-subtitle,
[data-theme="linear"] .hs-section-lead {
  color: var(--hs-color-fg-muted);
  font-weight: 400;
  letter-spacing: -0.01em;
}
```

- [ ] **Step 2: Render visual sample**

```bash
echo '{"a2ui_version":"0.9","catalog":"hyperscribe/v1","is_task_complete":true,"parts":[{"component":"artifact-organizer/Page","props":{"title":"Linear theme","subtitle":"Dark-native, Inter Variable 510"},"children":[{"component":"artifact-organizer/Section","props":{"id":"s","title":"First section"},"children":[{"component":"artifact-organizer/Prose","props":{"markdown":"Body at 400. **Emphasis at 510.**"}},{"component":"artifact-organizer/Callout","props":{"severity":"info","body":"Callouts should pick up the Linear accent naturally."}}]}]}]}' | \
  node plugins/artifact-organizer/scripts/render.mjs --theme linear --out ~/.hyperscribe/out/linear-sample.html
open ~/.hyperscribe/out/linear-sample.html
```

Spot-check: background is near-black, text is off-white, switcher lists all three themes, Callout picks up the indigo accent. Fix any obvious token mapping issues before committing.

- [ ] **Step 3: Run full test suite (smoke — no new unit tests required; visual is authoritative for themes)**

```
npm test
```

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat(theme): linear — dark-native Linear-style theme with Inter Variable + OpenType features"
```

---

## Task 5: `artifact-organizer/PrettyChart` component

**Files:**
- Create: `plugins/artifact-organizer/scripts/components/pretty-chart.mjs`
- Create: `plugins/artifact-organizer/assets/components/pretty-chart.css`
- Create: `tests/components/pretty-chart.test.mjs`
- Modify: `plugins/artifact-organizer/spec/catalog.json`
- Modify: `plugins/artifact-organizer/scripts/render.mjs` (register)
- Modify: `tools/build-catalog-md.mjs` (category)
- Modify: `plugins/artifact-organizer/SKILL.md`

**Props schema:**

```json
"artifact-organizer/PrettyChart": {
  "description": "Native SVG bar or line chart with gradient fills and soft drop shadow. Prefer over artifact-organizer/Chart when visual polish matters.",
  "children": "forbidden",
  "props": {
    "kind": { "type": "string", "enum": ["bar", "line"], "required": true },
    "data": {
      "type": "object",
      "required": true,
      "props": {
        "labels": { "type": "array", "items": { "type": "string" }, "required": true },
        "series": {
          "type": "array",
          "required": true,
          "items": {
            "type": "object",
            "props": {
              "name": { "type": "string", "required": true },
              "values": { "type": "array", "items": { "type": "number" }, "required": true }
            }
          }
        }
      }
    },
    "title": { "type": "string" },
    "yLabel": { "type": "string" },
    "unit": { "type": "string" }
  }
}
```

- [ ] **Step 1: Write failing tests at `tests/components/pretty-chart.test.mjs`**

```javascript
import { test } from "node:test";
import assert from "node:assert/strict";
import { PrettyChart } from "../../plugins/artifact-organizer/scripts/components/pretty-chart.mjs";

const data1 = { labels: ["A","B","C"], series: [{ name: "s1", values: [10,20,15] }] };

test("PrettyChart: renders bar wrapper + svg", () => {
  const html = PrettyChart({ kind: "bar", data: data1 });
  assert.match(html, /<div class="hs-pchart hs-pchart-bar"/);
  assert.match(html, /<svg[^>]+viewBox/);
});

test("PrettyChart: renders one <rect class=\"hs-pchart-bar-rect\"> per value", () => {
  const html = PrettyChart({ kind: "bar", data: data1 });
  const matches = html.match(/class="hs-pchart-bar-rect"/g);
  assert.equal(matches.length, 3);
});

test("PrettyChart: renders gradient def", () => {
  const html = PrettyChart({ kind: "bar", data: data1 });
  assert.match(html, /<linearGradient id="hs-pchart-grad-0"/);
});

test("PrettyChart: line kind renders a path", () => {
  const html = PrettyChart({ kind: "line", data: data1 });
  assert.match(html, /<path[^>]+class="hs-pchart-line"/);
});

test("PrettyChart: x-axis labels are rendered", () => {
  const html = PrettyChart({ kind: "bar", data: data1 });
  assert.match(html, />A</);
  assert.match(html, />B</);
  assert.match(html, />C</);
});

test("PrettyChart: title rendered when given", () => {
  const html = PrettyChart({ kind: "bar", data: data1, title: "Incident Report" });
  assert.match(html, />Incident Report</);
});

test("PrettyChart: escapes labels", () => {
  const html = PrettyChart({ kind: "bar", data: { labels: ["<x>"], series: [{ name: "s", values: [1] }] } });
  assert.match(html, /&lt;x&gt;/);
});
```

- [ ] **Step 2: Implement `pretty-chart.mjs`**

Geometry: viewBox `0 0 480 320`. Left gutter 44 for y-ticks, right 16, top 48 (title area), bottom 60 (x-labels rotated). Plot area = `(480-44-16) x (320-48-60)`.

```javascript
import { escape } from "../lib/html.mjs";

const W = 480, H = 320;
const PAD_L = 44, PAD_R = 16, PAD_T = 48, PAD_B = 60;
const PLOT_W = W - PAD_L - PAD_R;
const PLOT_H = H - PAD_T - PAD_B;

function niceMax(v) {
  if (v <= 0) return 10;
  const e = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / e;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * e;
}

function gradientDefs(seriesCount) {
  const stops = [
    ["#6d28d9", "#7c3aed"],
    ["#7c3aed", "#a855f7"],
    ["#14b8a6", "#5eead4"],
    ["#d946ef", "#f0abfc"],
    ["#3b82f6", "#60a5fa"],
    ["#6366f1", "#818cf8"],
    ["#22d3ee", "#67e8f9"]
  ];
  let defs = `<filter id="hs-pchart-shadow" x="-20%" y="-20%" width="140%" height="140%">
    <feGaussianBlur in="SourceAlpha" stdDeviation="6"/>
    <feOffset dx="0" dy="3" result="off"/>
    <feComponentTransfer><feFuncA type="linear" slope="0.25"/></feComponentTransfer>
    <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>`;
  for (let i = 0; i < Math.max(seriesCount, stops.length); i++) {
    const [a, b] = stops[i % stops.length];
    defs += `<linearGradient id="hs-pchart-grad-${i}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${b}"/><stop offset="100%" stop-color="${a}"/>
    </linearGradient>`;
  }
  return `<defs>${defs}</defs>`;
}

function gridAndYTicks(max) {
  const rows = 5;
  let g = "";
  for (let i = 0; i <= rows; i++) {
    const y = PAD_T + (PLOT_H * i) / rows;
    const val = max * (1 - i / rows);
    g += `<line x1="${PAD_L}" y1="${y}" x2="${W - PAD_R}" y2="${y}" class="hs-pchart-grid"/>`;
    g += `<text x="${PAD_L - 8}" y="${y + 4}" text-anchor="end" class="hs-pchart-tick">${val.toFixed(max < 10 ? 1 : 0)}</text>`;
  }
  return g;
}

function xLabels(labels) {
  const step = PLOT_W / labels.length;
  return labels.map((lbl, i) => {
    const x = PAD_L + step * (i + 0.5);
    const y = H - PAD_B + 18;
    return `<text x="${x}" y="${y}" text-anchor="end" transform="rotate(-40 ${x} ${y})" class="hs-pchart-xlabel">${escape(lbl)}</text>`;
  }).join("");
}

function renderBar(data) {
  const series = data.series[0]; // v0.3: single series for bar
  const labels = data.labels;
  const max = niceMax(Math.max(...series.values, 1));
  const step = PLOT_W / labels.length;
  const barW = Math.min(step * 0.6, 36);
  let bars = "";
  series.values.forEach((v, i) => {
    const h = (v / max) * PLOT_H;
    const x = PAD_L + step * (i + 0.5) - barW / 2;
    const y = PAD_T + PLOT_H - h;
    bars += `<rect x="${x}" y="${y}" width="${barW}" height="${h}" rx="4" class="hs-pchart-bar-rect" fill="url(#hs-pchart-grad-${i % 7})" filter="url(#hs-pchart-shadow)"/>`;
  });
  return { max, body: bars };
}

function renderLine(data) {
  const labels = data.labels;
  const allVals = data.series.flatMap(s => s.values);
  const max = niceMax(Math.max(...allVals, 1));
  const step = PLOT_W / (labels.length - 1 || 1);
  let out = "";
  data.series.forEach((s, sIdx) => {
    const pts = s.values.map((v, i) => {
      const x = PAD_L + step * i;
      const y = PAD_T + PLOT_H - (v / max) * PLOT_H;
      return `${x},${y}`;
    });
    out += `<path d="M${pts.join(" L")}" class="hs-pchart-line" stroke="url(#hs-pchart-grad-${sIdx % 7})" filter="url(#hs-pchart-shadow)"/>`;
    s.values.forEach((v, i) => {
      const x = PAD_L + step * i;
      const y = PAD_T + PLOT_H - (v / max) * PLOT_H;
      out += `<circle cx="${x}" cy="${y}" r="3.5" class="hs-pchart-dot" fill="url(#hs-pchart-grad-${sIdx % 7})"/>`;
    });
  });
  return { max, body: out };
}

export function PrettyChart(props) {
  const kind = props.kind;
  const data = props.data;
  const { max, body } = kind === "line" ? renderLine(data) : renderBar(data);
  const titleEl = props.title ? `<text x="${PAD_L}" y="28" class="hs-pchart-title">${escape(props.title)}</text>` : "";
  return `<div class="hs-pchart hs-pchart-${escape(kind)}">
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
${gradientDefs(data.series.length)}
${titleEl}
${gridAndYTicks(max)}
${body}
${xLabels(data.labels)}
</svg>
</div>`;
}
```

- [ ] **Step 3: Create `plugins/artifact-organizer/assets/components/pretty-chart.css`**

```css
.hs-pchart {
  margin: var(--hs-space-5) 0;
  padding: var(--hs-space-5);
  border: var(--hs-border-whisper);
  border-radius: var(--hs-radius-large);
  background: var(--hs-color-bg);
  box-shadow: var(--hs-shadow-card);
}
.hs-pchart svg {
  display: block;
  width: 100%;
  height: auto;
  max-width: 640px;
  margin: 0 auto;
}
.hs-pchart-title {
  font-family: var(--hs-font-sans);
  font-size: 18px;
  font-weight: 700;
  fill: var(--hs-color-fg);
  letter-spacing: -0.4px;
}
.hs-pchart-grid {
  stroke: var(--hs-color-fg-muted);
  stroke-opacity: 0.18;
  stroke-width: 1;
  stroke-dasharray: 2 4;
}
.hs-pchart-tick {
  font-family: var(--hs-font-sans);
  font-size: 10px;
  fill: var(--hs-color-fg-muted);
}
.hs-pchart-xlabel {
  font-family: var(--hs-font-sans);
  font-size: 10px;
  fill: var(--hs-color-fg-muted);
}
.hs-pchart-bar-rect { }
.hs-pchart-line {
  fill: none;
  stroke-width: 2.5;
  stroke-linejoin: round;
  stroke-linecap: round;
}
.hs-pchart-dot { }
```

- [ ] **Step 4: Register in render.mjs, add to catalog, update categorize() in build-catalog-md.mjs**

Category: add `"Data"` already has Chart, Comparison, DataTable — add `PrettyChart` there.

```javascript
if (["DataTable", "Chart", "PrettyChart", "Comparison"].some(x => name.endsWith("/" + x))) return "Data";
```

- [ ] **Step 5: Regen catalog.md + run all tests**

```
node tools/build-catalog-md.mjs && npm test
```

- [ ] **Step 6: Visual render sample**

```bash
echo '{"a2ui_version":"0.9","catalog":"hyperscribe/v1","is_task_complete":true,"parts":[{"component":"artifact-organizer/Page","props":{"title":"PrettyChart demo"},"children":[{"component":"artifact-organizer/Section","props":{"id":"a","title":"Bar"},"children":[{"component":"artifact-organizer/PrettyChart","props":{"kind":"bar","title":"Incident Report","data":{"labels":["Phishing","Malware","Ransom","DDoS","Insider","APT","Data leak"],"series":[{"name":"cnt","values":[91,72,58,45,36,29,22]}]}}}]}]}]}' | \
  node plugins/artifact-organizer/scripts/render.mjs --out ~/.hyperscribe/out/pretty-chart.html
open ~/.hyperscribe/out/pretty-chart.html
```

Expected: matches the reference Incident Report screenshot — rounded bars with purple/teal/pink gradients, dotted grid, soft shadow.

- [ ] **Step 7: Update SKILL.md with PrettyChart entry, commit**

```bash
git add -A && git commit -m "feat: artifact-organizer/PrettyChart — native SVG bar+line with gradient fills"
```

---

## Task 6: `artifact-organizer/FlowChart` component

**Files:**
- Create: `plugins/artifact-organizer/scripts/components/flow-chart.mjs`
- Create: `plugins/artifact-organizer/assets/components/flow-chart.css`
- Create: `tests/components/flow-chart.test.mjs`
- Modify: catalog.json, render.mjs, build-catalog-md.mjs, SKILL.md

**Props schema:**

```json
"artifact-organizer/FlowChart": {
  "description": "Native SVG directed graph. Ranked layout (TD or LR) — caller provides `ranks` (array of arrays of node ids) so no layout solver is needed.",
  "children": "forbidden",
  "props": {
    "layout": { "type": "string", "enum": ["TD", "LR"], "required": true },
    "nodes": {
      "type": "array",
      "required": true,
      "items": {
        "type": "object",
        "props": {
          "id": { "type": "string", "required": true },
          "label": { "type": "string", "required": true },
          "shape": { "type": "string", "enum": ["box", "pill", "diamond"] },
          "tag": { "type": "string" }
        }
      }
    },
    "edges": {
      "type": "array",
      "required": true,
      "items": {
        "type": "object",
        "props": {
          "from": { "type": "string", "required": true },
          "to": { "type": "string", "required": true },
          "label": { "type": "string" }
        }
      }
    },
    "ranks": {
      "type": "array",
      "required": true,
      "items": { "type": "array", "items": { "type": "string" } }
    }
  }
}
```

- [ ] **Step 1: Write failing tests at `tests/components/flow-chart.test.mjs`**

```javascript
import { test } from "node:test";
import assert from "node:assert/strict";
import { FlowChart } from "../../plugins/artifact-organizer/scripts/components/flow-chart.mjs";

const simple = {
  layout: "LR",
  nodes: [
    { id: "a", label: "Start" },
    { id: "b", label: "Work" },
    { id: "c", label: "End" }
  ],
  edges: [{ from: "a", to: "b" }, { from: "b", to: "c", label: "done" }],
  ranks: [["a"], ["b"], ["c"]]
};

test("FlowChart: renders wrapper + svg", () => {
  const html = FlowChart(simple);
  assert.match(html, /<div class="hs-flow hs-flow-lr"/);
  assert.match(html, /<svg/);
});

test("FlowChart: renders one node element per node", () => {
  const html = FlowChart(simple);
  const m = html.match(/class="hs-flow-node"/g);
  assert.equal(m.length, 3);
});

test("FlowChart: renders edge label when given", () => {
  const html = FlowChart(simple);
  assert.match(html, />done</);
});

test("FlowChart: diamond shape uses <polygon>", () => {
  const html = FlowChart({
    ...simple,
    nodes: [{ id: "a", label: "?", shape: "diamond" }],
    edges: [],
    ranks: [["a"]]
  });
  assert.match(html, /<polygon[^>]+class="hs-flow-shape-diamond"/);
});

test("FlowChart: TD layout class", () => {
  const html = FlowChart({ ...simple, layout: "TD" });
  assert.match(html, /hs-flow-td/);
});

test("FlowChart: escapes labels", () => {
  const html = FlowChart({
    layout: "LR",
    nodes: [{ id: "a", label: "<x>" }],
    edges: [],
    ranks: [["a"]]
  });
  assert.match(html, /&lt;x&gt;/);
});
```

- [ ] **Step 2: Implement `flow-chart.mjs`**

Layout: each rank is a column (LR) or row (TD). Node width 140 / height 44 (box), pill same height radius = half height, diamond 60x44.

```javascript
import { escape } from "../lib/html.mjs";

const NODE_W = 140, NODE_H = 44;
const RANK_GAP = 80;
const LANE_GAP = 28;
const PAD = 20;

function layoutCoords(layout, ranks) {
  const maxLane = Math.max(...ranks.map(r => r.length));
  const coords = {};
  ranks.forEach((rank, rIdx) => {
    rank.forEach((id, lIdx) => {
      if (layout === "LR") {
        coords[id] = {
          x: PAD + rIdx * (NODE_W + RANK_GAP),
          y: PAD + lIdx * (NODE_H + LANE_GAP) + (maxLane - rank.length) * (NODE_H + LANE_GAP) / 2
        };
      } else {
        coords[id] = {
          x: PAD + lIdx * (NODE_W + LANE_GAP) + (maxLane - rank.length) * (NODE_W + LANE_GAP) / 2,
          y: PAD + rIdx * (NODE_H + RANK_GAP)
        };
      }
    });
  });
  const totalW = layout === "LR"
    ? PAD * 2 + ranks.length * NODE_W + (ranks.length - 1) * RANK_GAP
    : PAD * 2 + maxLane * NODE_W + (maxLane - 1) * LANE_GAP;
  const totalH = layout === "LR"
    ? PAD * 2 + maxLane * NODE_H + (maxLane - 1) * LANE_GAP
    : PAD * 2 + ranks.length * NODE_H + (ranks.length - 1) * RANK_GAP;
  return { coords, totalW, totalH };
}

function renderNode(n, c) {
  const shape = n.shape || "box";
  const label = `<text x="${c.x + NODE_W / 2}" y="${c.y + NODE_H / 2 + 4}" text-anchor="middle" class="hs-flow-label">${escape(n.label)}</text>`;
  const tag = n.tag ? `<text x="${c.x + NODE_W / 2}" y="${c.y - 6}" text-anchor="middle" class="hs-flow-tag">${escape(n.tag)}</text>` : "";
  if (shape === "pill") {
    return `<g class="hs-flow-node"><rect x="${c.x}" y="${c.y}" width="${NODE_W}" height="${NODE_H}" rx="${NODE_H / 2}" class="hs-flow-shape-pill"/>${label}${tag}</g>`;
  }
  if (shape === "diamond") {
    const cx = c.x + NODE_W / 2, cy = c.y + NODE_H / 2;
    const pts = [
      [cx, c.y - 4],
      [c.x + NODE_W + 8, cy],
      [cx, c.y + NODE_H + 4],
      [c.x - 8, cy]
    ].map(p => p.join(",")).join(" ");
    return `<g class="hs-flow-node"><polygon points="${pts}" class="hs-flow-shape-diamond"/>${label}${tag}</g>`;
  }
  return `<g class="hs-flow-node"><rect x="${c.x}" y="${c.y}" width="${NODE_W}" height="${NODE_H}" rx="8" class="hs-flow-shape-box"/>${label}${tag}</g>`;
}

function renderEdge(e, coords, layout) {
  const a = coords[e.from], b = coords[e.to];
  if (!a || !b) return "";
  let x1, y1, x2, y2;
  if (layout === "LR") {
    x1 = a.x + NODE_W; y1 = a.y + NODE_H / 2;
    x2 = b.x;          y2 = b.y + NODE_H / 2;
  } else {
    x1 = a.x + NODE_W / 2; y1 = a.y + NODE_H;
    x2 = b.x + NODE_W / 2; y2 = b.y;
  }
  const midX = (x1 + x2) / 2, midY = (y1 + y2) / 2;
  const path = layout === "LR"
    ? `M${x1},${y1} C${midX},${y1} ${midX},${y2} ${x2},${y2}`
    : `M${x1},${y1} C${x1},${midY} ${x2},${midY} ${x2},${y2}`;
  const label = e.label ? `<text x="${midX}" y="${midY - 6}" text-anchor="middle" class="hs-flow-edge-label">${escape(e.label)}</text>` : "";
  return `<g class="hs-flow-edge"><path d="${path}" class="hs-flow-edge-path" marker-end="url(#hsFlowArrow)"/>${label}</g>`;
}

export function FlowChart(props) {
  const { layout, nodes, edges, ranks } = props;
  const { coords, totalW, totalH } = layoutCoords(layout, ranks);

  const defs = `<defs><marker id="hsFlowArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
    <path d="M0,0 L10,5 L0,10 Z" class="hs-flow-arrowhead"/>
  </marker></defs>`;

  const edgeSvg = edges.map(e => renderEdge(e, coords, layout)).join("");
  const nodeSvg = nodes.map(n => coords[n.id] ? renderNode(n, coords[n.id]) : "").join("");

  return `<div class="hs-flow hs-flow-${layout.toLowerCase()}">
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalW} ${totalH}" preserveAspectRatio="xMidYMid meet">
${defs}
${edgeSvg}
${nodeSvg}
</svg>
</div>`;
}
```

- [ ] **Step 3: Create `plugins/artifact-organizer/assets/components/flow-chart.css`**

```css
.hs-flow {
  margin: var(--hs-space-5) 0;
  padding: var(--hs-space-5);
  border: var(--hs-border-whisper);
  border-radius: var(--hs-radius-comfort);
  background: var(--hs-color-bg);
  overflow-x: auto;
}
.hs-flow svg { display: block; width: 100%; height: auto; max-width: 100%; }
.hs-flow-shape-box,
.hs-flow-shape-pill {
  fill: var(--hs-color-surface-alt);
  stroke: rgba(0,0,0,0.1);
  stroke-width: 1;
}
.hs-flow-shape-diamond {
  fill: var(--hs-color-badge-bg);
  stroke: var(--hs-color-accent);
  stroke-width: 1.25;
}
.hs-flow-label {
  font-family: var(--hs-font-sans);
  font-size: 13px;
  font-weight: 600;
  fill: var(--hs-color-fg);
}
.hs-flow-tag {
  font-family: var(--hs-font-sans);
  font-size: 10px;
  font-weight: 500;
  fill: var(--hs-color-fg-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.hs-flow-edge-path {
  fill: none;
  stroke: rgba(0,0,0,0.5);
  stroke-width: 1.25;
}
.hs-flow-edge-label {
  font-family: var(--hs-font-sans);
  font-size: 11px;
  fill: var(--hs-color-fg-muted);
}
.hs-flow-arrowhead {
  fill: rgba(0,0,0,0.7);
}
```

- [ ] **Step 4: Register + categorize (Diagrams)**

In `tools/build-catalog-md.mjs`:
```javascript
if (["Mermaid", "Sequence", "ArchitectureGrid", "FlowChart"].some(x => name.endsWith("/" + x))) return "Diagrams";
```

- [ ] **Step 5: Visual sample + full test run**

```bash
echo '{"a2ui_version":"0.9","catalog":"hyperscribe/v1","is_task_complete":true,"parts":[{"component":"artifact-organizer/Page","props":{"title":"FlowChart demo"},"children":[{"component":"artifact-organizer/Section","props":{"id":"s","title":"Pipeline"},"children":[{"component":"artifact-organizer/FlowChart","props":{"layout":"LR","nodes":[{"id":"in","label":"Input","shape":"pill","tag":"source"},{"id":"v","label":"Validate","shape":"diamond"},{"id":"t","label":"Transform"},{"id":"out","label":"Output","shape":"pill","tag":"sink"}],"edges":[{"from":"in","to":"v"},{"from":"v","to":"t","label":"ok"},{"from":"t","to":"out"}],"ranks":[["in"],["v"],["t"],["out"]]}}]}]}]}' | \
  node plugins/artifact-organizer/scripts/render.mjs --out ~/.hyperscribe/out/flow-chart.html
open ~/.hyperscribe/out/flow-chart.html
npm test
```

- [ ] **Step 6: Update SKILL.md + commit**

```bash
git add -A && git commit -m "feat: artifact-organizer/FlowChart — native SVG directed graph with rank-based layout"
```

---

## Task 7: Integration verification + version bump + push

**Files:**
- Modify: `package.json`, `plugins/artifact-organizer/.claude-plugin/plugin.json`, `plugins/artifact-organizer/SKILL.md`, `plugins/artifact-organizer/scripts/render.mjs` (version strings)
- Modify: `README.md` (add v0.3 components + theme flag to feature list)

- [ ] **Step 1: Bump all version strings to `0.3.0-alpha`**

Files + lines:
- `package.json`: `"version"`
- `plugins/artifact-organizer/.claude-plugin/plugin.json`: `"version"`
- `plugins/artifact-organizer/SKILL.md`: frontmatter `version:`
- `plugins/artifact-organizer/scripts/render.mjs`: `console.log("hyperscribe 0.3.0-alpha")`

- [ ] **Step 2: Regenerate catalog.md**

```
node tools/build-catalog-md.mjs
```

- [ ] **Step 3: Update README.md**

In the component catalog section, add `Image`, `PrettyChart`, `FlowChart` rows. Under "How it works" or a new "Themes" section, add 2-3 lines: "Built-in themes: notion, notion-dark, linear. Pass `--theme <name>` or let users toggle via the in-page switcher."

- [ ] **Step 4: End-to-end render matrix**

Render the same envelope in all three themes, open each:

```bash
ENV='{"a2ui_version":"0.9","catalog":"hyperscribe/v1","is_task_complete":true,"parts":[{"component":"artifact-organizer/Page","props":{"title":"v0.3 smoke test","subtitle":"All new components across all themes","toc":true},"children":[
  {"component":"artifact-organizer/Section","props":{"id":"img","title":"Image"},"children":[
    {"component":"artifact-organizer/Image","props":{"src":"https://placehold.co/600x300/png","alt":"placeholder","caption":"External image, passed through"}}
  ]},
  {"component":"artifact-organizer/Section","props":{"id":"pc","title":"PrettyChart"},"children":[
    {"component":"artifact-organizer/PrettyChart","props":{"kind":"bar","title":"Incident Report","data":{"labels":["Phishing","Malware","Ransom","DDoS","Insider","APT","Data"],"series":[{"name":"c","values":[91,72,58,45,36,29,22]}]}}}
  ]},
  {"component":"artifact-organizer/Section","props":{"id":"fc","title":"FlowChart"},"children":[
    {"component":"artifact-organizer/FlowChart","props":{"layout":"LR","nodes":[{"id":"a","label":"Input","shape":"pill"},{"id":"b","label":"Check","shape":"diamond"},{"id":"c","label":"Output","shape":"pill"}],"edges":[{"from":"a","to":"b"},{"from":"b","to":"c"}],"ranks":[["a"],["b"],["c"]]}}
  ]},
  {"component":"artifact-organizer/Section","props":{"id":"seq","title":"Sequence (existing)"},"children":[
    {"component":"artifact-organizer/Sequence","props":{"participants":[{"id":"u","title":"User"},{"id":"s","title":"System"}],"messages":[{"from":"u","to":"s","text":"ping","kind":"sync"},{"from":"s","to":"u","text":"pong","kind":"return"}]}}
  ]}
]}]}'
for THEME in notion notion-dark linear; do
  echo "$ENV" | node plugins/artifact-organizer/scripts/render.mjs --theme "$THEME" --out ~/.hyperscribe/out/v0.3-$THEME.html
  open ~/.hyperscribe/out/v0.3-$THEME.html
done
```

Spot-check each: all four components readable, colors consistent, switcher works (click through).

- [ ] **Step 5: Run full test suite**

```
npm test
```

All tests pass. Count should be ≥ 183 + Task 1 (6) + Task 2 (5) + Task 5 (7) + Task 6 (6) ≈ 207.

- [ ] **Step 6: Commit + tag + push**

```bash
git add -A && git commit -m "chore: bump to 0.3.0-alpha, README updates, catalog regen"
git tag v0.3.0-alpha
git push origin main
git push origin v0.3.0-alpha
```

---

## Self-Review Checklist

After all tasks ship, verify:

- [ ] Every new component (`Image`, `PrettyChart`, `FlowChart`) has: catalog entry, registry entry, CSS file, test file, SKILL.md table row.
- [ ] Every theme file (`notion`, `notion-dark`, `linear`) defines the full token set — no undefined `var()` warnings in browser console.
- [ ] Theme switcher appears in every rendered page and lists all three themes.
- [ ] Switching themes in the browser does not reload the page and the choice survives refresh.
- [ ] Mermaid components in dark themes pick up the correct colors (via `getComputedStyle` hook in the loader).
- [ ] Sequence component note box colors respond to theme changes.
- [ ] `node --test` passes.
- [ ] Local-file image test uses a temp file and cleans up.
- [ ] Version string `0.3.0-alpha` appears consistently in: `package.json`, `plugin.json`, `SKILL.md`, `render.mjs --version` output.
