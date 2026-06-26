# Themes, Catalog Extensions, and Preference System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename the two existing themes, add two new themes (`void`, `gallery`) with light/dark modes, add five new code-visualization components (`FileTree`, `DependencyGraph`, `FileCard`, `AnnotatedCode`, `ERDDiagram`), introduce a persistent user preference file (`~/.hyperscribe/preference.md`) with project-local override, and wire a first-call UX that prompts for theme + mode across all agents.

**Architecture:** Theme toggling is pure CSS var switching via `[data-theme="X"]` and `[data-theme="X"][data-mode="Y"]` selectors — new themes drop a single CSS file into `themes/`. Components are ESM modules under `scripts/components/` paired with per-component CSS under `assets/components/`. The renderer auto-loads CSS for used components. Preference I/O is a small Node helper (`scripts/lib/preference.mjs`) with a Bash-friendly YAML frontmatter format so every agent can read/write without Node. The first-call UX lives in SKILL.md / commands as a bash Step 0 block that checks the file, prompts if missing, saves defaults, then invokes the renderer with `--theme` and `--mode`.

**Tech Stack:** Node.js 20+ (ESM), zero runtime deps, `node:test` + `node:assert/strict`, plain CSS with custom properties, bash/awk for preference parsing in SKILL.md.

**Spec reference:** `docs/superpowers/specs/2026-04-19-themes-and-catalog-design.md`

---

## File structure

### New files
```
plugins/artifact-organizer/themes/void.css
plugins/artifact-organizer/themes/gallery.css
plugins/artifact-organizer/scripts/lib/preference.mjs
plugins/artifact-organizer/scripts/components/file-tree.mjs
plugins/artifact-organizer/scripts/components/dependency-graph.mjs
plugins/artifact-organizer/scripts/components/file-card.mjs
plugins/artifact-organizer/scripts/components/annotated-code.mjs
plugins/artifact-organizer/scripts/components/erd-diagram.mjs
plugins/artifact-organizer/assets/components/file-tree.css
plugins/artifact-organizer/assets/components/dependency-graph.css
plugins/artifact-organizer/assets/components/file-card.css
plugins/artifact-organizer/assets/components/annotated-code.css
plugins/artifact-organizer/assets/components/erd-diagram.css
tests/lib/preference.test.mjs
tests/components/file-tree.test.mjs
tests/components/dependency-graph.test.mjs
tests/components/file-card.test.mjs
tests/components/annotated-code.test.mjs
tests/components/erd-diagram.test.mjs
```

### Renamed files
```
plugins/artifact-organizer/themes/notion.css    -> plugins/artifact-organizer/themes/studio.css
plugins/artifact-organizer/themes/linear.css    -> plugins/artifact-organizer/themes/midnight.css
```

### Modified files
```
plugins/artifact-organizer/scripts/render.mjs           # --mode flag, data-mode injection, REGISTRY +5, default theme rename
plugins/artifact-organizer/spec/catalog.json            # 5 new component schemas
plugins/artifact-organizer/references/catalog.md        # regenerated
plugins/artifact-organizer/SKILL.md                     # Step 0 preference block + inventory rows
plugins/artifact-organizer/commands/hyperscribe.md      # Step 0 preference block
plugins/artifact-organizer/commands/slides.md           # Step 0 preference block
plugins/artifact-organizer/commands/diff.md             # Step 0 preference block
skills/artifact-organizer/SKILL.md                      # mirror of plugin SKILL.md changes
skills/artifact-organizer-slides/SKILL.md               # reference Step 0 block
skills/artifact-organizer-diff/SKILL.md                 # reference Step 0 block
tests/render-theme.test.mjs                      # notion/linear -> studio/midnight, 4-theme coverage
README.md                                        # rewrite Themes section
package.json                                     # bump version to 0.4.0-alpha
```

---

## Phase 1 — Theme rename (no aliases)

### Task 1: Rename `notion.css` → `studio.css`

**Files:**
- Rename: `plugins/artifact-organizer/themes/notion.css` → `plugins/artifact-organizer/themes/studio.css`
- Modify: inside the renamed file — change the two `[data-theme="notion"]` selectors to `[data-theme="studio"]`

- [ ] **Step 1: Git-aware rename**

```bash
git mv plugins/artifact-organizer/themes/notion.css plugins/artifact-organizer/themes/studio.css
```

- [ ] **Step 2: Update selectors inside the file**

Replace both occurrences (one for light, one for dark). The `:root:not([data-theme])` fallback is removed since `studio` becomes the default but explicitly-set only.

```bash
sed -i.bak 's/data-theme="notion"/data-theme="studio"/g' plugins/artifact-organizer/themes/studio.css
sed -i.bak 's/:root:not(\[data-theme\])/[data-theme="studio"]/g' plugins/artifact-organizer/themes/studio.css
rm plugins/artifact-organizer/themes/studio.css.bak
```

- [ ] **Step 3: Verify**

```bash
grep -c 'data-theme="studio"' plugins/artifact-organizer/themes/studio.css
```

Expected: `2` (light + dark).

- [ ] **Step 4: Commit**

```bash
git add plugins/artifact-organizer/themes/studio.css
git commit -m "refactor(theme): rename notion theme to studio"
```

---

### Task 2: Rename `linear.css` → `midnight.css`

**Files:**
- Rename: `plugins/artifact-organizer/themes/linear.css` → `plugins/artifact-organizer/themes/midnight.css`

- [ ] **Step 1: Git rename**

```bash
git mv plugins/artifact-organizer/themes/linear.css plugins/artifact-organizer/themes/midnight.css
```

- [ ] **Step 2: Update selectors**

```bash
sed -i.bak 's/data-theme="linear"/data-theme="midnight"/g' plugins/artifact-organizer/themes/midnight.css
rm plugins/artifact-organizer/themes/midnight.css.bak
```

- [ ] **Step 3: Verify**

```bash
grep -c 'data-theme="midnight"' plugins/artifact-organizer/themes/midnight.css
```

Expected: `2`.

- [ ] **Step 4: Commit**

```bash
git add plugins/artifact-organizer/themes/midnight.css
git commit -m "refactor(theme): rename linear theme to midnight"
```

---

### Task 3: Change renderer default theme from `notion` to `studio`

**Files:**
- Modify: `plugins/artifact-organizer/scripts/render.mjs` (line ~73 `themeName` default, line ~179 `printHelp` text)

- [ ] **Step 1: Patch the default**

In `render.mjs`, locate:
```js
const themeName = options.theme || "notion";
```
Replace with:
```js
const themeName = options.theme || "studio";
```

And in `printHelp()`, change:
```
  --theme <name>       Theme name (e.g. "notion"); defaults to "notion"
```
to:
```
  --theme <name>       Theme name (studio|midnight|void|gallery); defaults to "studio"
```

- [ ] **Step 2: Run existing theme test — expect failures**

```bash
node --test tests/render-theme.test.mjs
```

Expected: the `default theme notion applied`, `linear theme applied` tests fail (they assert `"notion"`/`"linear"` in output).

- [ ] **Step 3: Update `tests/render-theme.test.mjs`**

Replace the entire file contents with:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { render } from "../plugins/artifact-organizer/scripts/render.mjs";

const envelope = {
  a2ui_version: "0.9",
  catalog: "hyperscribe/v1",
  is_task_complete: true,
  parts: [{ component: "artifact-organizer/Page", props: { title: "t" }, children: [] }]
};

test("render: default theme is studio", async () => {
  const html = await render(envelope);
  assert.match(html, /data-theme="studio"/);
  assert.match(html, /\[data-theme="studio"\]/);
});

for (const name of ["studio", "midnight", "void", "gallery"]) {
  test(`render: --theme ${name} applied`, async () => {
    const html = await render(envelope, { theme: name });
    assert.match(html, new RegExp(`data-theme="${name}"`));
    assert.match(html, new RegExp(`\\[data-theme="${name}"\\]`));
  });
}

test("render: mode toggler always injected", async () => {
  const html = await render(envelope, { theme: "studio" });
  assert.match(html, /id="hs-mode-toggler"/);
});

test("render: unknown theme throws", async () => {
  await assert.rejects(() => render(envelope, { theme: "nope" }), /theme/i);
});

test("render: old theme name notion throws with clear error", async () => {
  await assert.rejects(() => render(envelope, { theme: "notion" }), /Unknown theme/);
});

test("render: old theme name linear throws with clear error", async () => {
  await assert.rejects(() => render(envelope, { theme: "linear" }), /Unknown theme/);
});
```

- [ ] **Step 4: Run — studio/midnight pass, void/gallery fail**

```bash
node --test tests/render-theme.test.mjs
```

Expected: studio and midnight tests pass; void and gallery tests fail with `Unknown theme "void"` / `"gallery"`. These failures are resolved in Task 4 / Task 5.

- [ ] **Step 5: Commit**

```bash
git add plugins/artifact-organizer/scripts/render.mjs tests/render-theme.test.mjs
git commit -m "refactor(theme): default is studio; tests cover all 4 theme names"
```

---

## Phase 2 — New themes

### Task 4: Add `themes/void.css` (Framer-inspired)

**Files:**
- Create: `plugins/artifact-organizer/themes/void.css`

- [ ] **Step 1: Run failing test**

```bash
node --test --test-name-pattern="void" tests/render-theme.test.mjs
```

Expected: FAIL — `Unknown theme "void"`.

- [ ] **Step 2: Create the file**

Content:

```css
/* ===== Void theme — dark-native, pure black, Framer-inspired ===== */

[data-theme="void"] {
  /* Surfaces (light variant of a dark-first theme) */
  --hs-color-fg: #0a0a0a;
  --hs-color-bg: #fafafa;
  --hs-color-surface: #ffffff;
  --hs-color-surface-alt: #f0f0f0;
  --hs-color-surface-dark: #0a0a0a;

  --hs-color-fg-muted: #4d4d4d;
  --hs-color-fg-placeholder: #8a8a8a;

  --hs-color-accent: #0066cc;
  --hs-color-accent-active: #0055b3;
  --hs-color-navy: #0a2b66;
  --hs-color-purple: #3b1780;
  --hs-color-pink: #d946ef;
  --hs-color-teal: #0e7490;
  --hs-color-brown: #5c3317;
  --hs-color-focus: #0099ff;
  --hs-color-badge-bg: rgba(0, 153, 255, 0.08);
  --hs-color-badge-text: #0066cc;
  --hs-color-success: #15803d;
  --hs-color-warn: #c2410c;

  --hs-border-whisper: 1px solid rgba(0, 0, 0, 0.08);
  --hs-shadow-card: rgba(0,0,0,0.06) 0 4px 18px,
                    rgba(0,0,0,0.04) 0 2px 8px;
  --hs-shadow-deep: rgba(0,0,0,0.04) 0 1px 3px,
                    rgba(0,0,0,0.06) 0 10px 30px;

  --hs-font-sans: "Inter Variable", Inter, -apple-system, system-ui,
                  "Segoe UI", Helvetica, Arial, sans-serif;
  --hs-font-mono: "JetBrains Mono", ui-monospace, SFMono-Regular,
                  Menlo, Consolas, monospace;

  --hs-tone-info-bg:    rgba(0, 102, 204, 0.08);
  --hs-tone-info-fg:    #0066cc;
  --hs-tone-warn-bg:    rgba(194, 65, 12, 0.08);
  --hs-tone-warn-fg:    #c2410c;
  --hs-tone-success-bg: rgba(21, 128, 61, 0.08);
  --hs-tone-success-fg: #15803d;
  --hs-tone-danger-bg:  rgba(153, 27, 27, 0.08);
  --hs-tone-danger-fg:  #991b1b;

  --hs-note-bg:     rgba(234, 179, 8, 0.10);
  --hs-note-border: #ca8a04;
  --hs-note-text:   #713f12;
}

[data-theme="void"][data-mode="dark"] {
  /* The signature Framer-inspired variant — pure black */
  --hs-color-fg: #ffffff;
  --hs-color-bg: #000000;
  --hs-color-surface: #000000;
  --hs-color-surface-alt: #090909;
  --hs-color-surface-dark: #000000;

  --hs-color-fg-muted: #a6a6a6;
  --hs-color-fg-placeholder: rgba(255, 255, 255, 0.4);

  --hs-color-accent: #0099ff;
  --hs-color-accent-active: #33aeff;
  --hs-color-navy: #6d8ad0;
  --hs-color-purple: #c084fc;
  --hs-color-pink: #f472b6;
  --hs-color-teal: #5eead4;
  --hs-color-brown: #a8784d;
  --hs-color-focus: #0099ff;
  --hs-color-badge-bg: rgba(0, 153, 255, 0.12);
  --hs-color-badge-text: #33aeff;
  --hs-color-success: #4ade80;
  --hs-color-warn: #fb923c;

  /* Signature blue ring shadow for containment */
  --hs-border-whisper: 1px solid rgba(0, 153, 255, 0.15);
  --hs-shadow-card: rgba(255, 255, 255, 0.10) 0 0.5px 0 0.5px,
                    rgba(0, 0, 0, 0.25) 0 10px 30px;
  --hs-shadow-deep: rgba(255, 255, 255, 0.10) 0 0.5px 0 0.5px,
                    rgba(0, 0, 0, 0.45) 0 20px 60px;

  --hs-tone-info-bg:    rgba(0, 153, 255, 0.12);
  --hs-tone-info-fg:    #33aeff;
  --hs-tone-warn-bg:    rgba(251, 146, 60, 0.14);
  --hs-tone-warn-fg:    #fdba74;
  --hs-tone-success-bg: rgba(74, 222, 128, 0.12);
  --hs-tone-success-fg: #86efac;
  --hs-tone-danger-bg:  rgba(248, 113, 113, 0.15);
  --hs-tone-danger-fg:  #fca5a5;

  --hs-note-bg:     rgba(234, 179, 8, 0.15);
  --hs-note-border: #eab308;
  --hs-note-text:   #fde68a;
}
```

- [ ] **Step 3: Run test — void tests now pass**

```bash
node --test --test-name-pattern="void" tests/render-theme.test.mjs
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add plugins/artifact-organizer/themes/void.css
git commit -m "feat(theme): add void — pure-black dark-first with blue ring"
```

---

### Task 5: Add `themes/gallery.css` (Apple-inspired)

**Files:**
- Create: `plugins/artifact-organizer/themes/gallery.css`

- [ ] **Step 1: Run failing test**

```bash
node --test --test-name-pattern="gallery" tests/render-theme.test.mjs
```

Expected: FAIL — `Unknown theme "gallery"`.

- [ ] **Step 2: Create the file**

```css
/* ===== Gallery theme — Apple-inspired, cinematic binary surfaces ===== */

[data-theme="gallery"] {
  --hs-color-fg: #1d1d1f;
  --hs-color-bg: #ffffff;
  --hs-color-surface: #ffffff;
  --hs-color-surface-alt: #f5f5f7;
  --hs-color-surface-dark: #1d1d1f;

  --hs-color-fg-muted: rgba(0, 0, 0, 0.8);
  --hs-color-fg-placeholder: rgba(0, 0, 0, 0.48);

  --hs-color-accent: #0071e3;
  --hs-color-accent-active: #0058b0;
  --hs-color-navy: #001e4a;
  --hs-color-purple: #5856d6;
  --hs-color-pink: #ff2d92;
  --hs-color-teal: #30b0c7;
  --hs-color-brown: #a2845e;
  --hs-color-focus: #0071e3;
  --hs-color-badge-bg: rgba(0, 113, 227, 0.08);
  --hs-color-badge-text: #0066cc;
  --hs-color-success: #30a14c;
  --hs-color-warn: #ca5010;

  /* Apple almost never uses visible borders */
  --hs-border-whisper: 1px solid transparent;
  /* Signature Apple soft diffused shadow */
  --hs-shadow-card: rgba(0, 0, 0, 0.22) 3px 5px 30px 0px;
  --hs-shadow-deep: rgba(0, 0, 0, 0.12) 0 10px 40px,
                    rgba(0, 0, 0, 0.08) 0 4px 16px;

  --hs-font-sans: -apple-system, BlinkMacSystemFont, "SF Pro Text",
                  "SF Pro Display", "Helvetica Neue", Helvetica, Arial,
                  "Inter Variable", Inter, system-ui, sans-serif;
  --hs-font-mono: ui-monospace, "SF Mono", SFMono-Regular, Menlo,
                  "Cascadia Mono", Consolas, "Courier New", monospace;

  --hs-tone-info-bg:    rgba(0, 113, 227, 0.08);
  --hs-tone-info-fg:    #0066cc;
  --hs-tone-warn-bg:    rgba(202, 80, 16, 0.10);
  --hs-tone-warn-fg:    #ca5010;
  --hs-tone-success-bg: rgba(48, 161, 76, 0.10);
  --hs-tone-success-fg: #30a14c;
  --hs-tone-danger-bg:  rgba(215, 58, 73, 0.10);
  --hs-tone-danger-fg:  #d73a49;

  --hs-note-bg:     #fef9c3;
  --hs-note-border: #eab308;
  --hs-note-text:   #713f12;
}

[data-theme="gallery"][data-mode="dark"] {
  --hs-color-fg: #f5f5f7;
  --hs-color-bg: #000000;
  --hs-color-surface: #1d1d1f;
  --hs-color-surface-alt: #272729;
  --hs-color-surface-dark: #000000;

  --hs-color-fg-muted: rgba(255, 255, 255, 0.7);
  --hs-color-fg-placeholder: rgba(255, 255, 255, 0.4);

  --hs-color-accent: #2997ff;
  --hs-color-accent-active: #5eb0ff;
  --hs-color-navy: #8e9fcd;
  --hs-color-purple: #a3a3ff;
  --hs-color-pink: #ff6bb0;
  --hs-color-teal: #5eead4;
  --hs-color-brown: #c4a47c;
  --hs-color-focus: #2997ff;
  --hs-color-badge-bg: rgba(41, 151, 255, 0.12);
  --hs-color-badge-text: #5eb0ff;
  --hs-color-success: #4ade80;
  --hs-color-warn: #fb923c;

  --hs-border-whisper: 1px solid transparent;
  --hs-shadow-card: rgba(0, 0, 0, 0.50) 3px 5px 30px 0px;
  --hs-shadow-deep: rgba(0, 0, 0, 0.35) 0 10px 40px,
                    rgba(0, 0, 0, 0.25) 0 4px 16px;

  --hs-tone-info-bg:    rgba(41, 151, 255, 0.12);
  --hs-tone-info-fg:    #5eb0ff;
  --hs-tone-warn-bg:    rgba(251, 146, 60, 0.14);
  --hs-tone-warn-fg:    #fdba74;
  --hs-tone-success-bg: rgba(74, 222, 128, 0.12);
  --hs-tone-success-fg: #86efac;
  --hs-tone-danger-bg:  rgba(248, 113, 113, 0.15);
  --hs-tone-danger-fg:  #fca5a5;

  --hs-note-bg:     rgba(234, 179, 8, 0.15);
  --hs-note-border: #eab308;
  --hs-note-text:   #fde68a;
}
```

- [ ] **Step 3: Run all 4-theme tests**

```bash
node --test tests/render-theme.test.mjs
```

Expected: all 4 theme tests PASS.

- [ ] **Step 4: Commit**

```bash
git add plugins/artifact-organizer/themes/gallery.css
git commit -m "feat(theme): add gallery — Apple-inspired binary surfaces + soft diffused shadow"
```

---

## Phase 3 — Renderer `--mode` flag + initial `data-mode` injection

### Task 6: Add `--mode` CLI flag and initial `data-mode` on `<html>`

**Files:**
- Modify: `plugins/artifact-organizer/scripts/render.mjs` (`render()`, `parseArgs()`, `buildDocument()`, `printHelp()`, `main()`)
- Modify: `tests/render-theme.test.mjs` (add `--mode` coverage)

- [ ] **Step 1: Write failing tests**

Append to `tests/render-theme.test.mjs`:

```js
test("render: mode=dark injects data-mode on <html>", async () => {
  const html = await render(envelope, { theme: "void", mode: "dark" });
  assert.match(html, /<html[^>]*data-mode="dark"/);
});

test("render: mode=light injects data-mode on <html>", async () => {
  const html = await render(envelope, { theme: "gallery", mode: "light" });
  assert.match(html, /<html[^>]*data-mode="light"/);
});

test("render: mode=auto omits data-mode attribute", async () => {
  const html = await render(envelope, { theme: "studio", mode: "auto" });
  assert.doesNotMatch(html, /data-mode="auto"/);
  // toggler script still controls data-mode at runtime
  assert.match(html, /id="hs-mode-toggler"/);
});

test("render: no mode option omits data-mode attribute", async () => {
  const html = await render(envelope, { theme: "studio" });
  assert.doesNotMatch(html, /<html[^>]*data-mode=/);
});

test("render: invalid mode value throws", async () => {
  await assert.rejects(() => render(envelope, { theme: "studio", mode: "twilight" }), /mode/i);
});
```

- [ ] **Step 2: Run — expect 5 failures**

```bash
node --test tests/render-theme.test.mjs
```

Expected: 5 new tests FAIL.

- [ ] **Step 3: Patch `render.mjs`**

In the exported `render()` function, after `const themeName = options.theme || "studio";`, add:

```js
  const MODES = new Set(["light", "dark", "auto"]);
  const mode = options.mode;
  if (mode !== undefined && !MODES.has(mode)) {
    throw new Error(`Invalid mode "${mode}". Allowed: light|dark|auto`);
  }
```

Pass `mode` through to `buildDocument`:

```js
  return buildDocument({ title, bodyHtml, css, theme: themeName, mode, toggler });
```

Update `buildDocument` signature and top line:

```js
function buildDocument({ title, bodyHtml, css, theme, mode, toggler }) {
  const modeAttr = (mode === "light" || mode === "dark") ? ` data-mode="${escapeHtml(mode)}"` : "";
  return `<!doctype html>
<html lang="en" data-theme="${escapeHtml(theme)}"${modeAttr}>
...
```

In `parseArgs`, add the `--mode` case:

```js
      case "--mode": args.mode = argv[++i]; break;
```

And initialize `args.mode = null` in the defaults object at the top of `parseArgs`.

In `printHelp()`, add the line:

```
  --mode <light|dark|auto>  Initial color mode. Omitted = follow user preference / prefers-color-scheme.
```

In `main()`, pass `mode` when calling `render()`:

```js
  const html = await render(doc, { theme: args.theme, mode: args.mode, title: args.title });
```

- [ ] **Step 4: Run — all tests pass**

```bash
node --test tests/render-theme.test.mjs
```

Expected: all PASS (4 themes × initial 2 cases + 5 new mode tests).

- [ ] **Step 5: Commit**

```bash
git add plugins/artifact-organizer/scripts/render.mjs tests/render-theme.test.mjs
git commit -m "feat(render): --mode flag injects initial data-mode to prevent FOUC"
```

---

## Phase 4 — Preference helper

### Task 7: Create `scripts/lib/preference.mjs` with full TDD

**Files:**
- Create: `plugins/artifact-organizer/scripts/lib/preference.mjs`
- Create: `tests/lib/preference.test.mjs`

- [ ] **Step 1: Write the failing test file**

Create `tests/lib/preference.test.mjs`:

```js
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync, existsSync, readFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  defaults,
  parsePreference,
  formatPreference,
  resolvePreferencePath,
  readPreference,
  writePreference
} from "../../plugins/artifact-organizer/scripts/lib/preference.mjs";

test("defaults: studio + light", () => {
  assert.deepEqual(defaults(), { theme: "studio", mode: "light" });
});

test("parsePreference: reads YAML frontmatter", () => {
  const src = `---\ntheme: void\nmode: dark\n---\n\n# body`;
  assert.deepEqual(parsePreference(src), { theme: "void", mode: "dark" });
});

test("parsePreference: missing frontmatter returns null", () => {
  assert.equal(parsePreference("no frontmatter here"), null);
});

test("parsePreference: extra fields preserved only for known keys", () => {
  const src = `---\ntheme: midnight\nmode: auto\nout_dir: ~/x\n---`;
  assert.deepEqual(parsePreference(src), { theme: "midnight", mode: "auto" });
});

test("parsePreference: trims whitespace around values", () => {
  const src = `---\ntheme:   gallery \nmode:  light  \n---`;
  assert.deepEqual(parsePreference(src), { theme: "gallery", mode: "light" });
});

test("formatPreference: produces canonical YAML + body", () => {
  const out = formatPreference({ theme: "void", mode: "dark" });
  assert.match(out, /^---\ntheme: void\nmode: dark\ncreated_at: /);
  assert.match(out, /# Artifact Organizer preferences/);
  assert.match(out, /Valid values:/);
});

test("resolvePreferencePath: project-local wins over global", () => {
  const tmp = mkdtempSync(join(tmpdir(), "hs-pref-"));
  try {
    const local = join(tmp, ".hyperscribe");
    mkdirSync(local, { recursive: true });
    const localFile = join(local, "preference.md");
    writeFileSync(localFile, "---\ntheme: void\nmode: dark\n---");
    const globalFile = join(tmp, "_global_preference.md");
    writeFileSync(globalFile, "---\ntheme: studio\nmode: light\n---");
    const found = resolvePreferencePath({ cwd: tmp, homeFile: globalFile });
    assert.equal(found, localFile);
  } finally { rmSync(tmp, { recursive: true, force: true }); }
});

test("resolvePreferencePath: falls back to global when no project-local", () => {
  const tmp = mkdtempSync(join(tmpdir(), "hs-pref-"));
  try {
    const globalFile = join(tmp, "_global_preference.md");
    writeFileSync(globalFile, "---\ntheme: gallery\nmode: auto\n---");
    const found = resolvePreferencePath({ cwd: tmp, homeFile: globalFile });
    assert.equal(found, globalFile);
  } finally { rmSync(tmp, { recursive: true, force: true }); }
});

test("resolvePreferencePath: returns null when neither exists", () => {
  const tmp = mkdtempSync(join(tmpdir(), "hs-pref-"));
  try {
    const found = resolvePreferencePath({ cwd: tmp, homeFile: join(tmp, "nope.md") });
    assert.equal(found, null);
  } finally { rmSync(tmp, { recursive: true, force: true }); }
});

test("readPreference: returns parsed values or null", () => {
  const tmp = mkdtempSync(join(tmpdir(), "hs-pref-"));
  try {
    const p = join(tmp, "pref.md");
    writeFileSync(p, "---\ntheme: midnight\nmode: dark\n---\n");
    assert.deepEqual(readPreference(p), { theme: "midnight", mode: "dark" });
    assert.equal(readPreference(join(tmp, "nope.md")), null);
  } finally { rmSync(tmp, { recursive: true, force: true }); }
});

test("writePreference: creates parent dir and writes frontmatter", () => {
  const tmp = mkdtempSync(join(tmpdir(), "hs-pref-"));
  try {
    const target = join(tmp, "nested", "preference.md");
    writePreference(target, { theme: "void", mode: "light" });
    assert.ok(existsSync(target));
    const content = readFileSync(target, "utf8");
    assert.match(content, /theme: void/);
    assert.match(content, /mode: light/);
  } finally { rmSync(tmp, { recursive: true, force: true }); }
});

test("writePreference: throws on invalid theme", () => {
  const tmp = mkdtempSync(join(tmpdir(), "hs-pref-"));
  try {
    assert.throws(() => writePreference(join(tmp, "p.md"), { theme: "nope", mode: "light" }), /theme/i);
  } finally { rmSync(tmp, { recursive: true, force: true }); }
});

test("writePreference: throws on invalid mode", () => {
  const tmp = mkdtempSync(join(tmpdir(), "hs-pref-"));
  try {
    assert.throws(() => writePreference(join(tmp, "p.md"), { theme: "studio", mode: "rainy" }), /mode/i);
  } finally { rmSync(tmp, { recursive: true, force: true }); }
});
```

- [ ] **Step 2: Run — expect "Cannot find module"**

```bash
node --test tests/lib/preference.test.mjs
```

Expected: FAIL with import error.

- [ ] **Step 3: Create the implementation**

Create `plugins/artifact-organizer/scripts/lib/preference.mjs`:

```js
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { homedir } from "node:os";

const VALID_THEMES = new Set(["studio", "midnight", "void", "gallery"]);
const VALID_MODES  = new Set(["light", "dark", "auto"]);

export function defaults() {
  return { theme: "studio", mode: "light" };
}

export function parsePreference(src) {
  if (typeof src !== "string") return null;
  const m = src.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!m) return null;
  const body = m[1];
  const out = {};
  for (const line of body.split(/\r?\n/)) {
    const kv = line.match(/^\s*([a-z_][a-z0-9_]*)\s*:\s*(.*?)\s*$/i);
    if (!kv) continue;
    const key = kv[1];
    const val = kv[2];
    if (key === "theme" || key === "mode") out[key] = val;
  }
  if (!out.theme && !out.mode) return null;
  return {
    theme: out.theme ?? defaults().theme,
    mode:  out.mode  ?? defaults().mode
  };
}

export function formatPreference({ theme, mode }) {
  const created = new Date().toISOString().replace(/\.\d+Z$/, "Z");
  return `---
theme: ${theme}
mode: ${mode}
created_at: ${created}
---

# Artifact Organizer preferences

Edit the values above to change your defaults. Delete this file to re-run
the first-run setup on the next hyperscribe invocation.

Valid values:
  theme: studio | midnight | void | gallery
  mode:  light | dark | auto
`;
}

export function resolvePreferencePath({ cwd = process.cwd(), homeFile } = {}) {
  const local = resolve(cwd, ".hyperscribe", "preference.md");
  if (existsSync(local)) return local;
  const globalPath = homeFile ?? join(homedir(), ".hyperscribe", "preference.md");
  if (existsSync(globalPath)) return globalPath;
  return null;
}

export function readPreference(path) {
  if (!path || !existsSync(path)) return null;
  const src = readFileSync(path, "utf8");
  return parsePreference(src);
}

export function writePreference(path, { theme, mode }) {
  if (!VALID_THEMES.has(theme)) {
    throw new Error(`Invalid theme "${theme}". Allowed: ${[...VALID_THEMES].join("|")}`);
  }
  if (!VALID_MODES.has(mode)) {
    throw new Error(`Invalid mode "${mode}". Allowed: ${[...VALID_MODES].join("|")}`);
  }
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, formatPreference({ theme, mode }), "utf8");
}
```

- [ ] **Step 4: Run — all pass**

```bash
node --test tests/lib/preference.test.mjs
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add plugins/artifact-organizer/scripts/lib/preference.mjs tests/lib/preference.test.mjs
git commit -m "feat(preference): add preference.mjs read/write helpers with validation"
```

---

## Phase 5 — Five new components

Each component follows the exact same shape: `.mjs` module + per-component `.css` + `REGISTRY` entry + schema in `catalog.json` + unit test. Tasks share a template; code is shown in full for each.

### Task 8: `FileTree` component

**Files:**
- Create: `plugins/artifact-organizer/scripts/components/file-tree.mjs`
- Create: `plugins/artifact-organizer/assets/components/file-tree.css`
- Create: `tests/components/file-tree.test.mjs`
- Modify: `plugins/artifact-organizer/scripts/render.mjs` (REGISTRY)
- Modify: `plugins/artifact-organizer/spec/catalog.json`

- [ ] **Step 1: Write the failing test**

`tests/components/file-tree.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { FileTree } from "../../plugins/artifact-organizer/scripts/components/file-tree.mjs";

const sample = {
  nodes: [
    { name: "src", type: "dir", children: [
      { name: "index.ts", type: "file" },
      { name: "lib", type: "dir", children: [
        { name: "util.ts", type: "file", highlight: "primary" }
      ]}
    ]},
    { name: "README.md", type: "file" }
  ]
};

test("FileTree: root wrapper with hs-file-tree class", () => {
  const html = FileTree(sample);
  assert.match(html, /class="hs-file-tree/);
});

test("FileTree: renders all file names", () => {
  const html = FileTree(sample);
  for (const n of ["src", "index.ts", "lib", "util.ts", "README.md"]) {
    assert.match(html, new RegExp(`>${n}<`));
  }
});

test("FileTree: marks directory vs file with distinct classes", () => {
  const html = FileTree(sample);
  assert.match(html, /hs-file-tree-dir/);
  assert.match(html, /hs-file-tree-file/);
});

test("FileTree: highlight=primary emits highlight class", () => {
  const html = FileTree(sample);
  assert.match(html, /hs-file-tree-node-highlight-primary/);
});

test("FileTree: caption renders when provided", () => {
  const html = FileTree({ ...sample, caption: "Repo layout" });
  assert.match(html, /<figcaption[^>]*>Repo layout<\/figcaption>/);
});

test("FileTree: escapes filenames", () => {
  const html = FileTree({ nodes: [{ name: "<evil>.ts", type: "file" }] });
  assert.match(html, />&lt;evil&gt;\.ts</);
});

test("FileTree: showIcons=false omits icon markup", () => {
  const html = FileTree({ nodes: [{ name: "a.ts", type: "file" }], showIcons: false });
  assert.doesNotMatch(html, /hs-file-tree-icon/);
});

test("FileTree: showIcons default true emits icon span", () => {
  const html = FileTree({ nodes: [{ name: "a.ts", type: "file" }] });
  assert.match(html, /hs-file-tree-icon/);
});
```

- [ ] **Step 2: Run — FAIL**

```bash
node --test tests/components/file-tree.test.mjs
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create the component module**

`plugins/artifact-organizer/scripts/components/file-tree.mjs`:

```js
import { escape } from "../lib/html.mjs";

function renderNode(node, showIcons) {
  const isDir = node.type === "dir";
  const typeCls = isDir ? "hs-file-tree-dir" : "hs-file-tree-file";
  const hlCls = node.highlight ? ` hs-file-tree-node-highlight-${escape(node.highlight)}` : "";
  const icon = showIcons
    ? `<span class="hs-file-tree-icon" aria-hidden="true">${isDir ? "▸" : "·"}</span>`
    : "";
  const label = `<span class="hs-file-tree-label">${escape(node.name)}</span>`;
  const selfLine = `<div class="hs-file-tree-node ${typeCls}${hlCls}">${icon}${label}</div>`;
  if (isDir && Array.isArray(node.children) && node.children.length) {
    const inner = node.children.map(c => renderNode(c, showIcons)).join("");
    return `<li>${selfLine}<ul class="hs-file-tree-children">${inner}</ul></li>`;
  }
  return `<li>${selfLine}</li>`;
}

export function FileTree(props) {
  const showIcons = props.showIcons !== false;
  const items = (props.nodes || []).map(n => renderNode(n, showIcons)).join("");
  const caption = props.caption
    ? `<figcaption class="hs-file-tree-caption">${escape(props.caption)}</figcaption>`
    : "";
  return `<figure class="hs-file-tree"><ul class="hs-file-tree-root">${items}</ul>${caption}</figure>`;
}
```

- [ ] **Step 4: Create the CSS**

`plugins/artifact-organizer/assets/components/file-tree.css`:

```css
.hs-file-tree {
  margin: 1.5rem 0;
  font-family: var(--hs-font-mono);
  font-size: 14px;
  background: var(--hs-color-surface-alt);
  border: var(--hs-border-whisper);
  border-radius: 8px;
  padding: 1rem 1.25rem;
  box-shadow: var(--hs-shadow-card);
}

.hs-file-tree-root,
.hs-file-tree-children {
  list-style: none;
  margin: 0;
  padding: 0;
}

.hs-file-tree-children {
  padding-left: 1.25rem;
  border-left: 1px dashed rgba(127,127,127,0.2);
  margin-left: 0.5rem;
}

.hs-file-tree-node {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.15rem 0;
  color: var(--hs-color-fg);
}

.hs-file-tree-icon {
  width: 1rem;
  text-align: center;
  color: var(--hs-color-fg-muted);
  flex: 0 0 auto;
}

.hs-file-tree-dir .hs-file-tree-label {
  font-weight: 600;
}

.hs-file-tree-file .hs-file-tree-label {
  color: var(--hs-color-fg-muted);
}

.hs-file-tree-node-highlight-primary {
  background: var(--hs-color-badge-bg);
  color: var(--hs-color-badge-text);
  border-radius: 4px;
  padding-inline: 0.4rem;
}

.hs-file-tree-node-highlight-secondary {
  background: var(--hs-tone-info-bg);
  color: var(--hs-tone-info-fg);
  border-radius: 4px;
  padding-inline: 0.4rem;
}

.hs-file-tree-node-highlight-muted {
  opacity: 0.5;
}

.hs-file-tree-caption {
  margin-top: 0.75rem;
  font-family: var(--hs-font-sans);
  font-size: 13px;
  color: var(--hs-color-fg-muted);
  text-align: center;
}
```

- [ ] **Step 5: Wire into `REGISTRY` in `render.mjs`**

Add import at top:
```js
import { FileTree } from "./components/file-tree.mjs";
```

Add entry in `REGISTRY`:
```js
  "artifact-organizer/FileTree": FileTree,
```

- [ ] **Step 6: Add schema to `spec/catalog.json`**

Under `components`, after the existing `artifact-organizer/ArchitectureGrid` entry (in the `Diagrams` or structural group — place after `artifact-organizer/FlowChart` for consistency with the catalog.md ordering), add:

```json
    "artifact-organizer/FileTree": {
      "description": "Directory/file structure visualization. Recursive nodes with optional highlights.",
      "children": "forbidden",
      "props": {
        "nodes": { "type": "array", "required": true, "description": "Recursive tree of { name, type: 'dir'|'file', path?, children?, highlight?: 'primary'|'secondary'|'muted' }" },
        "showIcons": { "type": "boolean", "default": true },
        "caption": { "type": "string" }
      }
    },
```

- [ ] **Step 7: Run all tests**

```bash
npm test
```

Expected: all existing tests + new `file-tree.test.mjs` PASS.

- [ ] **Step 8: Commit**

```bash
git add plugins/artifact-organizer/scripts/components/file-tree.mjs \
        plugins/artifact-organizer/assets/components/file-tree.css \
        plugins/artifact-organizer/scripts/render.mjs \
        plugins/artifact-organizer/spec/catalog.json \
        tests/components/file-tree.test.mjs
git commit -m "feat(component): add FileTree — directory/file structure"
```

---

### Task 9: `DependencyGraph` component

**Files:**
- Create: `plugins/artifact-organizer/scripts/components/dependency-graph.mjs`
- Create: `plugins/artifact-organizer/assets/components/dependency-graph.css`
- Create: `tests/components/dependency-graph.test.mjs`
- Modify: `plugins/artifact-organizer/scripts/render.mjs`, `plugins/artifact-organizer/spec/catalog.json`

- [ ] **Step 1: Failing test**

`tests/components/dependency-graph.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { DependencyGraph } from "../../plugins/artifact-organizer/scripts/components/dependency-graph.mjs";

const sample = {
  layout: "ranks",
  nodes: [
    { id: "app", label: "app.ts", type: "module" },
    { id: "lib", label: "lib/util.ts", type: "module" },
    { id: "ext", label: "lodash", type: "external" }
  ],
  edges: [
    { from: "app", to: "lib", kind: "import" },
    { from: "lib", to: "ext", kind: "import" },
    { from: "app", to: "app", kind: "import", cyclic: true }
  ],
  ranks: [["app"], ["lib"], ["ext"]]
};

test("DependencyGraph: root element is SVG", () => {
  const html = DependencyGraph(sample);
  assert.match(html, /<svg[^>]*class="hs-dep-graph"/);
});

test("DependencyGraph: renders a node group per node id", () => {
  const html = DependencyGraph(sample);
  assert.match(html, /data-node-id="app"/);
  assert.match(html, /data-node-id="lib"/);
  assert.match(html, /data-node-id="ext"/);
});

test("DependencyGraph: node labels appear as text", () => {
  const html = DependencyGraph(sample);
  assert.match(html, />app\.ts</);
  assert.match(html, />lib\/util\.ts</);
});

test("DependencyGraph: cyclic edge gets hs-dep-graph-edge-cyclic class", () => {
  const html = DependencyGraph(sample);
  assert.match(html, /class="[^"]*hs-dep-graph-edge-cyclic/);
});

test("DependencyGraph: external node type class applied", () => {
  const html = DependencyGraph(sample);
  assert.match(html, /hs-dep-graph-node-external/);
});

test("DependencyGraph: throws when layout=ranks without ranks", () => {
  assert.throws(() => DependencyGraph({ layout: "ranks", nodes: sample.nodes, edges: [] }),
    /ranks/i);
});

test("DependencyGraph: escapes labels", () => {
  const html = DependencyGraph({
    layout: "ranks",
    nodes: [{ id: "a", label: "<x>" }],
    edges: [],
    ranks: [["a"]]
  });
  assert.match(html, />&lt;x&gt;</);
});
```

- [ ] **Step 2: Run — FAIL**

```bash
node --test tests/components/dependency-graph.test.mjs
```

- [ ] **Step 3: Implement**

`plugins/artifact-organizer/scripts/components/dependency-graph.mjs`:

```js
import { escape } from "../lib/html.mjs";

const NODE_W = 160;
const NODE_H = 40;
const GAP_X  = 60;
const GAP_Y  = 28;
const PAD    = 24;

export function DependencyGraph(props) {
  if (props.layout !== "ranks") {
    throw new Error(`DependencyGraph layout "${props.layout}" not supported (v1 supports "ranks" only)`);
  }
  if (!Array.isArray(props.ranks) || props.ranks.length === 0) {
    throw new Error("DependencyGraph with layout=ranks requires a non-empty ranks array");
  }

  const nodeById = new Map();
  for (const n of props.nodes || []) nodeById.set(n.id, n);

  // Layout: ranks = columns (left→right). x = rank index, y = position in rank.
  const positions = new Map();
  let maxRankHeight = 0;
  props.ranks.forEach((rank, xi) => {
    maxRankHeight = Math.max(maxRankHeight, rank.length);
    rank.forEach((id, yi) => {
      positions.set(id, {
        x: PAD + xi * (NODE_W + GAP_X),
        y: PAD + yi * (NODE_H + GAP_Y)
      });
    });
  });

  const width  = PAD * 2 + props.ranks.length * (NODE_W + GAP_X) - GAP_X;
  const height = PAD * 2 + maxRankHeight * (NODE_H + GAP_Y) - GAP_Y;

  const nodeSvg = [];
  for (const [id, pos] of positions) {
    const n = nodeById.get(id);
    if (!n) continue;
    const typeCls = n.type ? ` hs-dep-graph-node-${escape(n.type)}` : "";
    nodeSvg.push(
      `<g class="hs-dep-graph-node${typeCls}" data-node-id="${escape(id)}" transform="translate(${pos.x},${pos.y})">` +
      `<rect class="hs-dep-graph-node-box" width="${NODE_W}" height="${NODE_H}" rx="8"/>` +
      `<text class="hs-dep-graph-node-label" x="${NODE_W/2}" y="${NODE_H/2}" text-anchor="middle" dominant-baseline="central">${escape(n.label || id)}</text>` +
      `</g>`
    );
  }

  const edgeSvg = [];
  for (const e of props.edges || []) {
    const from = positions.get(e.from);
    const to   = positions.get(e.to);
    if (!from || !to) continue;
    const cycleCls = e.cyclic ? " hs-dep-graph-edge-cyclic" : "";
    const kindCls  = e.kind ? ` hs-dep-graph-edge-${escape(e.kind)}` : "";
    // Self-loop
    if (e.from === e.to) {
      const cx = from.x + NODE_W;
      const cy = from.y + NODE_H / 2;
      edgeSvg.push(`<path class="hs-dep-graph-edge${kindCls}${cycleCls}" d="M${cx},${cy} q 30,-20 0,-30 q -15,-5 -30,0" fill="none"/>`);
      continue;
    }
    const x1 = from.x + NODE_W;
    const y1 = from.y + NODE_H / 2;
    const x2 = to.x;
    const y2 = to.y + NODE_H / 2;
    const mx = (x1 + x2) / 2;
    edgeSvg.push(`<path class="hs-dep-graph-edge${kindCls}${cycleCls}" d="M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}" fill="none" marker-end="url(#hs-dep-arrow)"/>`);
  }

  return `<svg class="hs-dep-graph" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Dependency graph">
<defs>
  <marker id="hs-dep-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
    <path d="M0,0 L10,5 L0,10 z" class="hs-dep-graph-arrow-head"/>
  </marker>
</defs>
${edgeSvg.join("\n")}
${nodeSvg.join("\n")}
</svg>`;
}
```

- [ ] **Step 4: CSS**

`plugins/artifact-organizer/assets/components/dependency-graph.css`:

```css
.hs-dep-graph {
  display: block;
  max-width: 100%;
  height: auto;
  margin: 1.5rem auto;
  font-family: var(--hs-font-sans);
  font-size: 13px;
}

.hs-dep-graph-node-box {
  fill: var(--hs-color-surface);
  stroke: var(--hs-color-fg-muted);
  stroke-width: 1;
}

.hs-dep-graph-node-external .hs-dep-graph-node-box {
  fill: var(--hs-color-surface-alt);
  stroke-dasharray: 4 3;
}

.hs-dep-graph-node-package .hs-dep-graph-node-box {
  fill: var(--hs-color-badge-bg);
  stroke: var(--hs-color-badge-text);
}

.hs-dep-graph-node-label {
  fill: var(--hs-color-fg);
  font-weight: 500;
}

.hs-dep-graph-edge {
  stroke: var(--hs-color-fg-muted);
  stroke-width: 1.4;
  fill: none;
}

.hs-dep-graph-edge-cyclic {
  stroke: var(--hs-tone-warn-fg);
  stroke-width: 1.8;
  stroke-dasharray: 5 3;
}

.hs-dep-graph-arrow-head {
  fill: var(--hs-color-fg-muted);
}
```

- [ ] **Step 5: Register + catalog**

In `render.mjs`:
```js
import { DependencyGraph } from "./components/dependency-graph.mjs";
```
```js
  "artifact-organizer/DependencyGraph": DependencyGraph,
```

In `spec/catalog.json` after `artifact-organizer/FileTree`:
```json
    "artifact-organizer/DependencyGraph": {
      "description": "Module/import dependency visualization (ranked layout).",
      "children": "forbidden",
      "props": {
        "nodes": { "type": "array", "required": true, "description": "Array of { id, label, type?: 'module'|'package'|'external', tag?: string }" },
        "edges": { "type": "array", "required": true, "description": "Array of { from, to, kind?: 'import'|'type'|'runtime', cyclic?: boolean }" },
        "layout": { "type": "string", "enum": ["ranks"], "required": true },
        "ranks": { "type": "array", "required": true, "description": "Array of arrays of node ids (caller-supplied layout)" }
      }
    },
```

- [ ] **Step 6: Run tests**

```bash
npm test
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add plugins/artifact-organizer/scripts/components/dependency-graph.mjs \
        plugins/artifact-organizer/assets/components/dependency-graph.css \
        plugins/artifact-organizer/scripts/render.mjs \
        plugins/artifact-organizer/spec/catalog.json \
        tests/components/dependency-graph.test.mjs
git commit -m "feat(component): add DependencyGraph — ranked module/import graph"
```

---

### Task 10: `FileCard` component

**Files:**
- Create: `plugins/artifact-organizer/scripts/components/file-card.mjs`
- Create: `plugins/artifact-organizer/assets/components/file-card.css`
- Create: `tests/components/file-card.test.mjs`
- Modify: `plugins/artifact-organizer/scripts/render.mjs`, `plugins/artifact-organizer/spec/catalog.json`

- [ ] **Step 1: Test**

`tests/components/file-card.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { FileCard } from "../../plugins/artifact-organizer/scripts/components/file-card.mjs";

test("FileCard: base wrapper + name", () => {
  const html = FileCard({ name: "index.ts", responsibility: "entry point" });
  assert.match(html, /<article class="hs-file-card/);
  assert.match(html, />index\.ts</);
});

test("FileCard: responsibility renders", () => {
  const html = FileCard({ name: "a.ts", responsibility: "does X" });
  assert.match(html, />does X</);
});

test("FileCard: state=modified adds state class", () => {
  const html = FileCard({ name: "a.ts", responsibility: "x", state: "modified" });
  assert.match(html, /hs-file-card-state-modified/);
});

test("FileCard: default state=stable", () => {
  const html = FileCard({ name: "a.ts", responsibility: "x" });
  assert.match(html, /hs-file-card-state-stable/);
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
  assert.match(html, /hs-file-card-export hs-file-card-export-function/);
  assert.match(html, /hs-file-card-export hs-file-card-export-type/);
  assert.match(html, />render</);
  assert.match(html, />Props</);
});

test("FileCard: escapes name and path", () => {
  const html = FileCard({ name: "<x>.ts", path: "<y>/a", responsibility: "x" });
  assert.match(html, />&lt;x&gt;\.ts</);
  assert.match(html, />&lt;y&gt;\/a</);
});
```

- [ ] **Step 2: Run FAIL**

```bash
node --test tests/components/file-card.test.mjs
```

- [ ] **Step 3: Implement**

`plugins/artifact-organizer/scripts/components/file-card.mjs`:

```js
import { escape } from "../lib/html.mjs";

const STATES = new Set(["stable", "modified", "added", "removed"]);
const KINDS  = new Set(["function", "class", "const", "type"]);

export function FileCard(props) {
  const state = STATES.has(props.state) ? props.state : "stable";
  const stateCls = `hs-file-card-state-${state}`;
  const path = props.path
    ? `<div class="hs-file-card-path">${escape(props.path)}</div>`
    : "";
  const iconAttr = props.icon ? ` data-icon="${escape(props.icon)}"` : "";
  const exports = Array.isArray(props.exports) && props.exports.length
    ? `<ul class="hs-file-card-exports">` +
      props.exports.map(e => {
        const kind = KINDS.has(e.kind) ? e.kind : "const";
        return `<li class="hs-file-card-export hs-file-card-export-${kind}" data-kind="${kind}">${escape(e.name)}</li>`;
      }).join("") +
      `</ul>`
    : "";
  const loc = (typeof props.loc === "number")
    ? `<span class="hs-file-card-loc">${escape(String(props.loc))} LOC</span>`
    : "";
  const footer = (loc || state !== "stable")
    ? `<footer class="hs-file-card-footer">${loc}<span class="hs-file-card-state-chip">${escape(state)}</span></footer>`
    : "";
  return `<article class="hs-file-card ${stateCls}"${iconAttr}>
<header class="hs-file-card-header">
  <h4 class="hs-file-card-name">${escape(props.name)}</h4>
  ${path}
</header>
<p class="hs-file-card-resp">${escape(props.responsibility)}</p>
${exports}
${footer}
</article>`;
}
```

- [ ] **Step 4: CSS**

`plugins/artifact-organizer/assets/components/file-card.css`:

```css
.hs-file-card {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  background: var(--hs-color-surface);
  border: var(--hs-border-whisper);
  border-radius: 10px;
  padding: 1rem 1.15rem;
  box-shadow: var(--hs-shadow-card);
  font-family: var(--hs-font-sans);
  color: var(--hs-color-fg);
  position: relative;
}

.hs-file-card-header { display: flex; flex-direction: column; gap: 0.1rem; }

.hs-file-card-name {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  font-family: var(--hs-font-mono);
}

.hs-file-card-path {
  font-family: var(--hs-font-mono);
  font-size: 12px;
  color: var(--hs-color-fg-muted);
}

.hs-file-card-resp {
  margin: 0;
  font-size: 14px;
  line-height: 1.45;
  color: var(--hs-color-fg-muted);
}

.hs-file-card-exports {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  list-style: none;
  margin: 0;
  padding: 0;
}

.hs-file-card-export {
  font-family: var(--hs-font-mono);
  font-size: 11.5px;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--hs-color-surface-alt);
  color: var(--hs-color-fg-muted);
}

.hs-file-card-export-function { background: var(--hs-tone-info-bg); color: var(--hs-tone-info-fg); }
.hs-file-card-export-class    { background: var(--hs-tone-success-bg); color: var(--hs-tone-success-fg); }
.hs-file-card-export-type     { background: var(--hs-color-badge-bg); color: var(--hs-color-badge-text); }
.hs-file-card-export-const    { background: var(--hs-color-surface-alt); color: var(--hs-color-fg-muted); }

.hs-file-card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  font-size: 11.5px;
  color: var(--hs-color-fg-muted);
  padding-top: 0.4rem;
  border-top: var(--hs-border-whisper);
}

.hs-file-card-state-chip {
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-weight: 600;
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 4px;
  background: var(--hs-color-surface-alt);
  color: var(--hs-color-fg-muted);
}

.hs-file-card-state-modified { border-left: 3px solid var(--hs-tone-warn-fg); }
.hs-file-card-state-modified .hs-file-card-state-chip { background: var(--hs-tone-warn-bg); color: var(--hs-tone-warn-fg); }
.hs-file-card-state-added    { border-left: 3px solid var(--hs-tone-success-fg); }
.hs-file-card-state-added .hs-file-card-state-chip    { background: var(--hs-tone-success-bg); color: var(--hs-tone-success-fg); }
.hs-file-card-state-removed  { border-left: 3px solid var(--hs-tone-danger-fg); opacity: 0.7; }
.hs-file-card-state-removed .hs-file-card-state-chip  { background: var(--hs-tone-danger-bg); color: var(--hs-tone-danger-fg); }
```

- [ ] **Step 5: Register + catalog**

In `render.mjs`:
```js
import { FileCard } from "./components/file-card.mjs";
```
```js
  "artifact-organizer/FileCard": FileCard,
```

In `catalog.json` after `artifact-organizer/DependencyGraph`:

```json
    "artifact-organizer/FileCard": {
      "description": "Per-file summary card — name, path, LOC, responsibility, exports, change state.",
      "children": "forbidden",
      "props": {
        "name":           { "type": "string", "required": true },
        "path":           { "type": "string" },
        "loc":            { "type": "number" },
        "responsibility": { "type": "string", "required": true },
        "exports":        { "type": "array", "description": "Array of { name, kind: 'function'|'class'|'const'|'type' }" },
        "state":          { "type": "string", "enum": ["modified","added","removed","stable"], "default": "stable" },
        "icon":           { "type": "string" }
      }
    },
```

- [ ] **Step 6: Tests**

```bash
npm test
```

- [ ] **Step 7: Commit**

```bash
git add plugins/artifact-organizer/scripts/components/file-card.mjs \
        plugins/artifact-organizer/assets/components/file-card.css \
        plugins/artifact-organizer/scripts/render.mjs \
        plugins/artifact-organizer/spec/catalog.json \
        tests/components/file-card.test.mjs
git commit -m "feat(component): add FileCard — per-file summary with exports + state"
```

---

### Task 11: `AnnotatedCode` component

**Files:**
- Create: `plugins/artifact-organizer/scripts/components/annotated-code.mjs`
- Create: `plugins/artifact-organizer/assets/components/annotated-code.css`
- Create: `tests/components/annotated-code.test.mjs`
- Modify: `plugins/artifact-organizer/scripts/render.mjs`, `plugins/artifact-organizer/spec/catalog.json`

- [ ] **Step 1: Test**

`tests/components/annotated-code.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { AnnotatedCode } from "../../plugins/artifact-organizer/scripts/components/annotated-code.mjs";

const sample = {
  lang: "js",
  filename: "index.js",
  code: "const x = 1;\nconst y = 2;\nconsole.log(x + y);",
  annotations: [
    { line: 1, pin: 1, title: "Declare x", body: "x is the first operand." },
    { line: 3, pin: 2, title: "Log", body: "Output to stdout." }
  ]
};

test("AnnotatedCode: root wrapper + pair layout", () => {
  const html = AnnotatedCode(sample);
  assert.match(html, /<div class="hs-annotated-code/);
  assert.match(html, /hs-annotated-code-code/);
  assert.match(html, /hs-annotated-code-notes/);
});

test("AnnotatedCode: filename shown when provided", () => {
  const html = AnnotatedCode(sample);
  assert.match(html, />index\.js</);
});

test("AnnotatedCode: pins in code line correspond to annotations", () => {
  const html = AnnotatedCode(sample);
  // pin markers must appear twice: once in the code body near line 1 and line 3,
  // once in the notes column
  assert.equal((html.match(/hs-annotated-code-pin">1</g) || []).length, 2);
  assert.equal((html.match(/hs-annotated-code-pin">2</g) || []).length, 2);
});

test("AnnotatedCode: annotation title and body render", () => {
  const html = AnnotatedCode(sample);
  assert.match(html, />Declare x</);
  assert.match(html, />x is the first operand\.</);
});

test("AnnotatedCode: pinStyle=lettered uses A,B letters", () => {
  const html = AnnotatedCode({ ...sample, pinStyle: "lettered" });
  assert.match(html, /hs-annotated-code-pin">A</);
  assert.match(html, /hs-annotated-code-pin">B</);
});

test("AnnotatedCode: escapes code html", () => {
  const html = AnnotatedCode({
    lang: "html",
    code: "<script>alert(1)</script>",
    annotations: [{ line: 1, pin: 1, title: "t", body: "b" }]
  });
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /<script>alert/);
});

test("AnnotatedCode: annotation for line beyond code length is skipped in-line but shown in notes", () => {
  const html = AnnotatedCode({
    lang: "js",
    code: "a",
    annotations: [{ line: 99, pin: 1, title: "gone", body: "missing line" }]
  });
  assert.match(html, />gone</);
});
```

- [ ] **Step 2: FAIL**

```bash
node --test tests/components/annotated-code.test.mjs
```

- [ ] **Step 3: Implement**

`plugins/artifact-organizer/scripts/components/annotated-code.mjs`:

```js
import { escape } from "../lib/html.mjs";

function pinLabel(n, style) {
  if (style === "lettered") {
    return String.fromCharCode(64 + n); // 1 -> A, 2 -> B, ...
  }
  return String(n);
}

export function AnnotatedCode(props) {
  const lang = escape(props.lang || "text");
  const filename = props.filename
    ? `<div class="hs-annotated-code-filename">${escape(props.filename)}</div>`
    : "";
  const pinStyle = props.pinStyle === "lettered" ? "lettered" : "numbered";
  const anns = Array.isArray(props.annotations) ? props.annotations : [];

  // Group annotations by line (1-based)
  const byLine = new Map();
  for (const a of anns) {
    if (!byLine.has(a.line)) byLine.set(a.line, []);
    byLine.get(a.line).push(a);
  }

  const codeLines = String(props.code ?? "").split(/\r?\n/);
  const codeBody = codeLines.map((raw, i) => {
    const lineNo = i + 1;
    const pins = (byLine.get(lineNo) || [])
      .map(a => `<span class="hs-annotated-code-pin" data-pin="${a.pin}">${escape(pinLabel(a.pin, pinStyle))}</span>`)
      .join("");
    return `<tr class="hs-annotated-code-line"><td class="hs-annotated-code-lineno">${lineNo}</td><td class="hs-annotated-code-src"><pre>${escape(raw)}</pre>${pins}</td></tr>`;
  }).join("");

  const notes = anns.map(a => `
<li class="hs-annotated-code-note" data-pin="${a.pin}">
  <span class="hs-annotated-code-pin" data-pin="${a.pin}">${escape(pinLabel(a.pin, pinStyle))}</span>
  <div class="hs-annotated-code-note-body">
    <div class="hs-annotated-code-note-title">${escape(a.title)}</div>
    <div class="hs-annotated-code-note-text">${escape(a.body)}</div>
  </div>
</li>`).join("");

  return `<div class="hs-annotated-code" data-lang="${lang}" data-pin-style="${pinStyle}">
${filename}
<div class="hs-annotated-code-grid">
  <div class="hs-annotated-code-code">
    <table><tbody>${codeBody}</tbody></table>
  </div>
  <ol class="hs-annotated-code-notes">${notes}</ol>
</div>
</div>`;
}
```

- [ ] **Step 4: CSS**

`plugins/artifact-organizer/assets/components/annotated-code.css`:

```css
.hs-annotated-code {
  margin: 1.5rem 0;
  background: var(--hs-color-surface);
  border: var(--hs-border-whisper);
  border-radius: 10px;
  overflow: hidden;
  box-shadow: var(--hs-shadow-card);
}

.hs-annotated-code-filename {
  padding: 0.5rem 1rem;
  font-family: var(--hs-font-mono);
  font-size: 12px;
  color: var(--hs-color-fg-muted);
  background: var(--hs-color-surface-alt);
  border-bottom: var(--hs-border-whisper);
}

.hs-annotated-code-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 360px);
  gap: 0;
}

@media (max-width: 720px) {
  .hs-annotated-code-grid { grid-template-columns: 1fr; }
}

.hs-annotated-code-code {
  padding: 0.75rem 0.5rem 0.75rem 0;
  overflow-x: auto;
  font-family: var(--hs-font-mono);
  font-size: 13px;
}

.hs-annotated-code-code table { border-collapse: collapse; width: 100%; }
.hs-annotated-code-code pre { margin: 0; white-space: pre; font: inherit; }

.hs-annotated-code-line td { padding: 0.1rem 0.5rem; vertical-align: top; }
.hs-annotated-code-lineno {
  color: var(--hs-color-fg-muted);
  text-align: right;
  user-select: none;
  font-variant-numeric: tabular-nums;
  width: 2.5rem;
}
.hs-annotated-code-src { position: relative; }

.hs-annotated-code-notes {
  list-style: none;
  margin: 0;
  padding: 1rem;
  border-left: var(--hs-border-whisper);
  background: var(--hs-color-surface-alt);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

@media (max-width: 720px) {
  .hs-annotated-code-notes { border-left: 0; border-top: var(--hs-border-whisper); }
}

.hs-annotated-code-note {
  display: flex;
  gap: 0.6rem;
  align-items: flex-start;
}

.hs-annotated-code-note-title {
  font-weight: 600;
  font-size: 13px;
  font-family: var(--hs-font-sans);
  color: var(--hs-color-fg);
}

.hs-annotated-code-note-text {
  font-size: 13px;
  color: var(--hs-color-fg-muted);
  font-family: var(--hs-font-sans);
  line-height: 1.45;
}

.hs-annotated-code-pin {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  margin-inline: 0.35rem;
  border-radius: 999px;
  background: var(--hs-color-accent);
  color: #fff;
  font-family: var(--hs-font-sans);
  font-size: 11px;
  font-weight: 600;
  flex: 0 0 auto;
}
```

- [ ] **Step 5: Register + catalog**

In `render.mjs`:
```js
import { AnnotatedCode } from "./components/annotated-code.mjs";
```
```js
  "artifact-organizer/AnnotatedCode": AnnotatedCode,
```

In `catalog.json`:

```json
    "artifact-organizer/AnnotatedCode": {
      "description": "Code block with numbered pins linking to side annotations.",
      "children": "forbidden",
      "props": {
        "lang":        { "type": "string", "required": true },
        "code":        { "type": "string", "required": true },
        "filename":    { "type": "string" },
        "annotations": { "type": "array", "required": true, "description": "Array of { line, pin, title, body }" },
        "pinStyle":    { "type": "string", "enum": ["numbered","lettered"], "default": "numbered" }
      }
    },
```

- [ ] **Step 6: Tests**

```bash
npm test
```

- [ ] **Step 7: Commit**

```bash
git add plugins/artifact-organizer/scripts/components/annotated-code.mjs \
        plugins/artifact-organizer/assets/components/annotated-code.css \
        plugins/artifact-organizer/scripts/render.mjs \
        plugins/artifact-organizer/spec/catalog.json \
        tests/components/annotated-code.test.mjs
git commit -m "feat(component): add AnnotatedCode — pinned code with side notes"
```

---

### Task 12: `ERDDiagram` component

**Files:**
- Create: `plugins/artifact-organizer/scripts/components/erd-diagram.mjs`
- Create: `plugins/artifact-organizer/assets/components/erd-diagram.css`
- Create: `tests/components/erd-diagram.test.mjs`
- Modify: `plugins/artifact-organizer/scripts/render.mjs`, `plugins/artifact-organizer/spec/catalog.json`

- [ ] **Step 1: Test**

`tests/components/erd-diagram.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { ERDDiagram } from "../../plugins/artifact-organizer/scripts/components/erd-diagram.mjs";

const sample = {
  entities: [
    { id: "user", name: "User", fields: [
      { name: "id", type: "uuid", key: "pk" },
      { name: "email", type: "text" }
    ]},
    { id: "post", name: "Post", fields: [
      { name: "id", type: "uuid", key: "pk" },
      { name: "user_id", type: "uuid", key: "fk" },
      { name: "body", type: "text", nullable: true }
    ]}
  ],
  relationships: [
    { from: "user", to: "post", cardinality: "1-n", label: "authors" }
  ]
};

test("ERDDiagram: root + entity tables", () => {
  const html = ERDDiagram(sample);
  assert.match(html, /class="hs-erd/);
  assert.match(html, />User</);
  assert.match(html, />Post</);
});

test("ERDDiagram: pk/fk fields get key classes", () => {
  const html = ERDDiagram(sample);
  assert.match(html, /hs-erd-field-key-pk/);
  assert.match(html, /hs-erd-field-key-fk/);
});

test("ERDDiagram: nullable fields marked", () => {
  const html = ERDDiagram(sample);
  assert.match(html, /hs-erd-field-nullable/);
});

test("ERDDiagram: relationship cardinality label rendered", () => {
  const html = ERDDiagram(sample);
  assert.match(html, />1-n</);
  assert.match(html, />authors</);
});

test("ERDDiagram: layout default = grid", () => {
  const html = ERDDiagram(sample);
  assert.match(html, /data-layout="grid"/);
});

test("ERDDiagram: layout columns renders", () => {
  const html = ERDDiagram({ ...sample, layout: "columns" });
  assert.match(html, /data-layout="columns"/);
});

test("ERDDiagram: escapes entity names and fields", () => {
  const html = ERDDiagram({
    entities: [{ id: "x", name: "<x>", fields: [{ name: "<f>", type: "<t>" }] }],
    relationships: []
  });
  assert.match(html, />&lt;x&gt;</);
  assert.match(html, />&lt;f&gt;</);
  assert.match(html, />&lt;t&gt;</);
});
```

- [ ] **Step 2: FAIL**

```bash
node --test tests/components/erd-diagram.test.mjs
```

- [ ] **Step 3: Implement**

`plugins/artifact-organizer/scripts/components/erd-diagram.mjs`:

```js
import { escape } from "../lib/html.mjs";

const LAYOUTS = new Set(["grid", "columns"]);

function renderEntity(e) {
  const rows = (e.fields || []).map(f => {
    const keyCls = f.key ? ` hs-erd-field-key-${escape(f.key)}` : "";
    const nullCls = f.nullable ? " hs-erd-field-nullable" : "";
    const keyTag = f.key ? `<span class="hs-erd-field-key-tag">${escape(f.key.toUpperCase())}</span>` : "";
    return `<tr class="hs-erd-field${keyCls}${nullCls}">
      <td class="hs-erd-field-name">${escape(f.name)}${keyTag}</td>
      <td class="hs-erd-field-type">${escape(f.type)}${f.nullable ? "?" : ""}</td>
    </tr>`;
  }).join("");
  return `<article class="hs-erd-entity" data-entity-id="${escape(e.id)}">
<header class="hs-erd-entity-name">${escape(e.name)}</header>
<table class="hs-erd-fields"><tbody>${rows}</tbody></table>
</article>`;
}

function renderRelationship(r) {
  return `<li class="hs-erd-rel" data-from="${escape(r.from)}" data-to="${escape(r.to)}">
  <span class="hs-erd-rel-from">${escape(r.from)}</span>
  <span class="hs-erd-rel-arrow" aria-hidden="true">→</span>
  <span class="hs-erd-rel-card">${escape(r.cardinality)}</span>
  <span class="hs-erd-rel-arrow" aria-hidden="true">→</span>
  <span class="hs-erd-rel-to">${escape(r.to)}</span>
  ${r.label ? `<span class="hs-erd-rel-label">${escape(r.label)}</span>` : ""}
</li>`;
}

export function ERDDiagram(props) {
  const layout = LAYOUTS.has(props.layout) ? props.layout : "grid";
  const entities = (props.entities || []).map(renderEntity).join("");
  const rels = (props.relationships || []).map(renderRelationship).join("");
  return `<section class="hs-erd" data-layout="${layout}">
<div class="hs-erd-entities">${entities}</div>
${rels ? `<ul class="hs-erd-rels">${rels}</ul>` : ""}
</section>`;
}
```

- [ ] **Step 4: CSS**

`plugins/artifact-organizer/assets/components/erd-diagram.css`:

```css
.hs-erd {
  margin: 1.5rem 0;
  font-family: var(--hs-font-sans);
  color: var(--hs-color-fg);
}

.hs-erd-entities {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
}

.hs-erd[data-layout="columns"] .hs-erd-entities {
  display: flex;
  flex-direction: row;
  overflow-x: auto;
  gap: 1rem;
}

.hs-erd[data-layout="columns"] .hs-erd-entity { min-width: 260px; }

.hs-erd-entity {
  background: var(--hs-color-surface);
  border: var(--hs-border-whisper);
  border-radius: 10px;
  overflow: hidden;
  box-shadow: var(--hs-shadow-card);
}

.hs-erd-entity-name {
  font-weight: 700;
  padding: 0.55rem 0.9rem;
  background: var(--hs-color-surface-alt);
  border-bottom: var(--hs-border-whisper);
  font-size: 14px;
}

.hs-erd-fields { width: 100%; border-collapse: collapse; }
.hs-erd-fields td {
  padding: 0.35rem 0.9rem;
  border-top: var(--hs-border-whisper);
  font-family: var(--hs-font-mono);
  font-size: 12.5px;
  vertical-align: top;
}
.hs-erd-fields tr:first-child td { border-top: 0; }

.hs-erd-field-name { display: flex; align-items: center; gap: 0.4rem; }
.hs-erd-field-type { color: var(--hs-color-fg-muted); }

.hs-erd-field-key-tag {
  font-family: var(--hs-font-sans);
  font-size: 9.5px;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 3px;
  letter-spacing: 0.04em;
}

.hs-erd-field-key-pk .hs-erd-field-key-tag {
  background: var(--hs-color-badge-bg);
  color: var(--hs-color-badge-text);
}
.hs-erd-field-key-fk .hs-erd-field-key-tag {
  background: var(--hs-tone-info-bg);
  color: var(--hs-tone-info-fg);
}

.hs-erd-field-nullable .hs-erd-field-type { opacity: 0.85; }

.hs-erd-rels {
  list-style: none;
  margin: 1rem 0 0;
  padding: 0.75rem 1rem;
  background: var(--hs-color-surface-alt);
  border: var(--hs-border-whisper);
  border-radius: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
}

.hs-erd-rel {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-family: var(--hs-font-mono);
  font-size: 12.5px;
}

.hs-erd-rel-card {
  background: var(--hs-color-badge-bg);
  color: var(--hs-color-badge-text);
  padding: 1px 6px;
  border-radius: 4px;
  font-family: var(--hs-font-sans);
  font-weight: 600;
  font-size: 11px;
}

.hs-erd-rel-arrow { color: var(--hs-color-fg-muted); }
.hs-erd-rel-label { color: var(--hs-color-fg-muted); font-style: italic; }
```

- [ ] **Step 5: Register + catalog**

In `render.mjs`:
```js
import { ERDDiagram } from "./components/erd-diagram.mjs";
```
```js
  "artifact-organizer/ERDDiagram": ERDDiagram,
```

In `catalog.json`:

```json
    "artifact-organizer/ERDDiagram": {
      "description": "Entity-relationship diagram — DB/type schemas with pk/fk/nullable markers and cardinality links.",
      "children": "forbidden",
      "props": {
        "entities":      { "type": "array", "required": true, "description": "Array of { id, name, fields: [{ name, type, key?: 'pk'|'fk', nullable?: boolean }] }" },
        "relationships": { "type": "array", "required": true, "description": "Array of { from, to, cardinality: '1-1'|'1-n'|'n-n', label? }" },
        "layout":        { "type": "string", "enum": ["grid","columns"], "default": "grid" }
      }
    },
```

- [ ] **Step 6: Tests**

```bash
npm test
```

- [ ] **Step 7: Commit**

```bash
git add plugins/artifact-organizer/scripts/components/erd-diagram.mjs \
        plugins/artifact-organizer/assets/components/erd-diagram.css \
        plugins/artifact-organizer/scripts/render.mjs \
        plugins/artifact-organizer/spec/catalog.json \
        tests/components/erd-diagram.test.mjs
git commit -m "feat(component): add ERDDiagram — entity-relationship tables"
```

---

## Phase 6 — Docs and wiring

### Task 13: Regenerate `references/catalog.md`

**Files:**
- Modify (regen): `plugins/artifact-organizer/references/catalog.md`

- [ ] **Step 1: Run the generator**

```bash
node tools/build-catalog-md.mjs
```

Expected: file overwritten with 27 components (22 existing + 5 new).

- [ ] **Step 2: Verify**

```bash
grep -c '^### `hyperscribe/' plugins/artifact-organizer/references/catalog.md
```

Expected: `27`.

- [ ] **Step 3: Confirm the five new names are present**

```bash
for n in FileTree DependencyGraph FileCard AnnotatedCode ERDDiagram; do
  grep -q "hyperscribe/$n" plugins/artifact-organizer/references/catalog.md && echo "ok $n" || echo "MISSING $n"
done
```

Expected: five `ok ...` lines.

- [ ] **Step 4: Commit**

```bash
git add plugins/artifact-organizer/references/catalog.md
git commit -m "docs(catalog): regenerate catalog.md with 5 new components"
```

---

### Task 14: Update `plugins/artifact-organizer/SKILL.md` — Step 0 block + inventory rows

**Files:**
- Modify: `plugins/artifact-organizer/SKILL.md`

- [ ] **Step 1: Insert Step 0 block before existing "How to use" section**

Locate the section `## How to use` (line ~34). Above it, insert a new section:

````markdown
## Step 0 — resolve the user's theme preference (always run first)

Before building any envelope, resolve the user's theme + mode. If no preference file exists yet, prompt once, save, then proceed. This runs on every invocation of the main skill and its variants.

```bash
# 1. Resolve preference path: project-local first, then global.
PREF=""
for p in ./.hyperscribe/preference.md ~/.hyperscribe/preference.md; do
  [ -f "$p" ] && { PREF="$p"; break; }
done

# 2. First run — prompt and save defaults to ~/.hyperscribe/preference.md
if [ -z "$PREF" ]; then
  # Claude Code: ask via AskUserQuestion (theme 4-choice, mode 3-choice).
  # Other agents: print the prompt below and wait for a single-line answer.
  cat <<'PROMPT'
Artifact Organizer first-run setup. Pick a theme and mode.

Themes:  1) studio    (warm, paper-feel)
         2) midnight  (cool, developer-dark)
         3) void      (pure black, electric blue accent)
         4) gallery   (cinematic alternating surfaces)

Modes:   light / dark / auto

Reply with "<theme> <mode>" (e.g., "studio light"),
a single theme name (mode=light),
or "skip" to use studio + light.
PROMPT
  # Parse the user's answer into $THEME and $MODE.
  # If unparseable or empty, fall back to defaults silently.
  THEME="studio"
  MODE="light"
  # (Agents with AskUserQuestion populate $THEME and $MODE from the structured answer.)

  mkdir -p ~/.artifact-organizer
  PREF=~/.hyperscribe/preference.md
  cat > "$PREF" <<EOF
---
theme: $THEME
mode: $MODE
created_at: $(date -u +%Y-%m-%dT%H:%M:%SZ)
---

# Artifact Organizer preferences

Edit the values above to change your defaults. Delete this file to re-run
the first-run setup on the next hyperscribe invocation.

Valid values:
  theme: studio | midnight | void | gallery
  mode:  light | dark | auto
EOF
fi

# 3. Read preference into env vars (every run)
THEME=$(awk -F': *' '/^theme:/{print $2; exit}' "$PREF")
MODE=$(awk -F': *'  '/^mode:/{print $2; exit}'  "$PREF")
[ -z "$THEME" ] && THEME=studio
[ -z "$MODE" ]  && MODE=light
```

When invoking the renderer in later steps, always pass `--theme "$THEME"` and — when `$MODE` is `light` or `dark` — `--mode "$MODE"`. When `$MODE` is `auto`, omit `--mode` so the page follows `prefers-color-scheme` and localStorage at load time.
````

- [ ] **Step 2: Update the "How to use" step-4 bash block to use `$THEME` / `$MODE`**

Replace the bash snippet in step 4 of "How to use":

```bash
HS=$(for p in \
  ./.claude/skills/hyperscribe ~/.claude/skills/hyperscribe \
  ./.codex/skills/hyperscribe ~/.codex/skills/hyperscribe \
  ./.cursor/skills/hyperscribe ~/.cursor/skills/hyperscribe \
  ./.opencode/skills/hyperscribe ~/.opencode/skills/hyperscribe \
  ~/.claude/plugins/cache/hyperscribe-marketplace/*/plugins/hyperscribe \
  ./plugins/hyperscribe
do [ -x "$p/scripts/outprint" ] && { echo "$p/scripts/outprint"; break; }; done)

MODE_FLAG=""
[ "$MODE" = "light" ] && MODE_FLAG="--mode light"
[ "$MODE" = "dark" ]  && MODE_FLAG="--mode dark"

mkdir -p ~/.artifact-organizer/out
echo '<json>' | "$HS" --theme "$THEME" $MODE_FLAG --out ~/.hyperscribe/out/<slug>.html
```

- [ ] **Step 3: Append five rows to the "Component inventory" table**

In the existing inventory table, add five new rows (place under their categorical groupings):

```markdown
| Structure | `artifact-organizer/FileTree` | Directory/file structure. Props: `nodes` (recursive), `showIcons?`, `caption?`. |
| Diagrams | `artifact-organizer/DependencyGraph` | Module import graph (ranked). Props: `nodes`, `edges`, `layout: "ranks"`, `ranks`. |
| Structure | `artifact-organizer/FileCard` | Per-file summary card. Props: `name`, `path?`, `loc?`, `responsibility`, `exports?[]`, `state?`. |
| Code | `artifact-organizer/AnnotatedCode` | Code with pinned side annotations. Props: `lang`, `code`, `annotations[]`, `pinStyle?`. |
| Diagrams | `artifact-organizer/ERDDiagram` | DB/type ERD. Props: `entities[]`, `relationships[]`, `layout?`. |
```

- [ ] **Step 4: Commit**

```bash
git add plugins/artifact-organizer/SKILL.md
git commit -m "docs(skill): add Step 0 preference flow + 5 new components in inventory"
```

---

### Task 15: Update the three slash-command files with the Step 0 block

**Files:**
- Modify: `plugins/artifact-organizer/commands/hyperscribe.md`
- Modify: `plugins/artifact-organizer/commands/slides.md`
- Modify: `plugins/artifact-organizer/commands/diff.md`

- [ ] **Step 1: Insert Step 0 at the top of each command body**

For each of the three files, insert the following block **after** the frontmatter (between `---` line and the `You are invoking…` line):

```markdown
## Step 0 — theme preference (run first, every invocation)

```bash
PREF=""
for p in ./.hyperscribe/preference.md ~/.hyperscribe/preference.md; do
  [ -f "$p" ] && { PREF="$p"; break; }
done

if [ -z "$PREF" ]; then
  # Prompt once (Claude Code: AskUserQuestion; other agents: text prompt).
  THEME=studio; MODE=light  # populate from user answer; defaults on skip.
  mkdir -p ~/.artifact-organizer; PREF=~/.hyperscribe/preference.md
  printf -- '---\ntheme: %s\nmode: %s\ncreated_at: %s\n---\n' \
    "$THEME" "$MODE" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$PREF"
fi

THEME=$(awk -F': *' '/^theme:/{print $2; exit}' "$PREF")
MODE=$(awk -F': *'  '/^mode:/{print $2; exit}'  "$PREF")
[ -z "$THEME" ] && THEME=studio
[ -z "$MODE" ]  && MODE=light
```
```

- [ ] **Step 2: In each file's final render bash block, add `--theme "$THEME"` and conditional `--mode`**

Search each file for the `| ~/.claude/plugins/cache/hyperscribe-marketplace/*/plugins/artifact-organizer/scripts/outprint --out` invocation and replace with:

```bash
MODE_FLAG=""
[ "$MODE" = "light" ] && MODE_FLAG="--mode light"
[ "$MODE" = "dark" ]  && MODE_FLAG="--mode dark"

cat <<'EOF' | ~/.claude/plugins/cache/hyperscribe-marketplace/*/plugins/artifact-organizer/scripts/outprint --theme "$THEME" $MODE_FLAG --out "$OUT"
<the JSON you built>
EOF
```

- [ ] **Step 3: Commit**

```bash
git add plugins/artifact-organizer/commands/hyperscribe.md \
        plugins/artifact-organizer/commands/slides.md \
        plugins/artifact-organizer/commands/diff.md
git commit -m "docs(commands): add Step 0 preference block; pipe --theme/--mode flags"
```

---

### Task 16: Update `skills/artifact-organizer-slides/SKILL.md` and `skills/artifact-organizer-diff/SKILL.md` to reference Step 0

**Files:**
- Modify: `skills/artifact-organizer-slides/SKILL.md`
- Modify: `skills/artifact-organizer-diff/SKILL.md`

- [ ] **Step 1: Insert a "Step 0" cross-reference after frontmatter in each file**

Add this paragraph directly below the frontmatter:

```markdown
> **Step 0 — Preference:** Before running any renderer command, perform the theme-preference resolution block from the base `artifact-organizer` skill (`~/.claude/skills/artifact-organizer/SKILL.md`, section "Step 0"). It sets `$THEME` and `$MODE`. If absent, this wrapper falls back to `studio` + `light`.
```

- [ ] **Step 2: In each file's render bash block, pass `--theme "$THEME"` and conditional `--mode`**

Change:
```bash
cat <<'EOF' | "$HS" --out "$OUT"
```
to:
```bash
MODE_FLAG=""
[ "${MODE:-}" = "light" ] && MODE_FLAG="--mode light"
[ "${MODE:-}" = "dark" ]  && MODE_FLAG="--mode dark"

cat <<'EOF' | "$HS" --theme "${THEME:-studio}" $MODE_FLAG --out "$OUT"
```

- [ ] **Step 3: Commit**

```bash
git add skills/artifact-organizer-slides/SKILL.md skills/artifact-organizer-diff/SKILL.md
git commit -m "docs(skills): wire --theme/--mode through sub-skills"
```

---

## Phase 7 — Sync, release

### Task 17: Sync engine assets from `plugins/artifact-organizer/` into `skills/artifact-organizer/`

The `skills/artifact-organizer/` copy must include all engine changes (themes, components, preference helper, render updates). A simple `rsync` covers it.

- [ ] **Step 1: Run rsync with --delete-after for clean sync**

```bash
rsync -a --delete \
  plugins/artifact-organizer/SKILL.md \
  plugins/artifact-organizer/scripts/ \
  plugins/artifact-organizer/assets/ \
  plugins/artifact-organizer/spec/ \
  plugins/artifact-organizer/themes/ \
  plugins/artifact-organizer/references/ \
  skills/artifact-organizer/
```

(The first argument must list individual source files/dirs, each copied to the destination. Run the commands individually to avoid rsync's single-target confusion:)

```bash
rsync -a --delete plugins/artifact-organizer/scripts/    skills/artifact-organizer/scripts/
rsync -a --delete plugins/artifact-organizer/assets/     skills/artifact-organizer/assets/
rsync -a --delete plugins/artifact-organizer/spec/       skills/artifact-organizer/spec/
rsync -a --delete plugins/artifact-organizer/themes/     skills/artifact-organizer/themes/
rsync -a --delete plugins/artifact-organizer/references/ skills/artifact-organizer/references/
cp plugins/artifact-organizer/SKILL.md                    skills/artifact-organizer/SKILL.md
```

- [ ] **Step 2: Verify the 4 theme files exist in skills/**

```bash
ls skills/artifact-organizer/themes/
```

Expected: `studio.css  midnight.css  void.css  gallery.css`.

- [ ] **Step 3: Verify no orphan `notion.css` / `linear.css`**

```bash
ls skills/artifact-organizer/themes/ | grep -E '^(notion|linear)\.css$' && echo "LEAK" || echo "clean"
```

Expected: `clean`.

- [ ] **Step 4: Run full test suite for engine**

```bash
npm test
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add skills/artifact-organizer/
git commit -m "chore(skills): sync engine — new themes, 5 components, preference helper"
```

---

### Task 18: Rewrite README `## Themes` section

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Locate and replace the `## Themes` section**

Replace the entire existing section with:

```markdown
## Themes

Four bundled themes, each shipping both **light and dark modes** in a single CSS file. Pass `--theme <name>` at render time to pick one; use `--mode light|dark` to force initial color mode (omit for `prefers-color-scheme` + localStorage).

| Name | Character | Best for |
|---|---|---|
| `studio` | Warm, paper-feel — the default | Docs, long reads, stable reference pages |
| `midnight` | Cool, developer-dark — Inter Variable + OpenType | Terminal-adjacent technical content |
| `void` | Pure-black dark-first, electric blue ring accents | Product pages, launch decks, high-contrast demos |
| `gallery` | Cinematic alternating surfaces, soft diffused shadow | Executive summaries, product showcases |

Themes are pure CSS-variable overrides (`plugins/artifact-organizer/themes/*.css`). Each defines tokens under `[data-theme="<name>"]` (light) and `[data-theme="<name>"][data-mode="dark"]` (dark). Semantic tones (`--hs-tone-{info|warn|success|danger}-{bg|fg}`) and surface palette (`--hs-color-surface*`) keep components legible across all four.

**Breaking change in v0.4:** The former `notion` and `midnight` theme names are renamed to `studio` and `midnight` respectively; `linear` is renamed to `midnight`. The old names no longer resolve — update any `--theme notion` / `--theme linear` calls to the new names. Running with the old names now throws `Unknown theme "notion". Available: studio, midnight, void, gallery`.

Your per-user theme + mode preference is stored at `~/.hyperscribe/preference.md` after first run. A project-local `./.hyperscribe/preference.md` overrides it. Delete either file to re-run first-run setup.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs(readme): rewrite Themes section for 4-theme lineup"
```

---

### Task 19: Bump version in `plugin.json` and `package.json`

**Files:**
- Modify: `plugins/artifact-organizer/.claude-plugin/plugin.json`
- Modify: `package.json`
- Modify: all four `skills/hyperscribe*/SKILL.md` version metadata (search for `version: "0.3.1-alpha"`)

- [ ] **Step 1: Update versions**

```bash
sed -i.bak 's/"version": "0.3.1-alpha"/"version": "0.4.0-alpha"/' \
  plugins/artifact-organizer/.claude-plugin/plugin.json \
  package.json
rm plugins/artifact-organizer/.claude-plugin/plugin.json.bak package.json.bak

# Update skill frontmatter
for f in skills/artifact-organizer/SKILL.md skills/artifact-organizer-slides/SKILL.md \
         skills/artifact-organizer-diff/SKILL.md skills/artifact-organizer-share/SKILL.md; do
  sed -i.bak 's/version: "0.3.1-alpha"/version: "0.4.0-alpha"/' "$f"
  rm "$f.bak"
done
```

- [ ] **Step 2: Verify**

```bash
grep -r '"0.3.1-alpha"' plugins/ skills/ package.json && echo "LEAK" || echo "clean"
```

Expected: `clean`.

- [ ] **Step 3: Commit**

```bash
git add plugins/artifact-organizer/.claude-plugin/plugin.json package.json skills/hyperscribe*/SKILL.md
git commit -m "chore: bump to 0.4.0-alpha (themes + catalog extensions)"
```

---

### Task 20: Smoke test the 24 render combinations (4 themes × 2 modes × 3 representative envelopes)

**Files:**
- Read-only (validation only); no code commit.

- [ ] **Step 1: Create a throwaway test fixture**

```bash
mkdir -p /tmp/hs-smoke
cat > /tmp/hs-smoke/envelope.json <<'JSON'
{
  "a2ui_version": "0.9",
  "catalog": "hyperscribe/v1",
  "is_task_complete": true,
  "parts": [
    {
      "component": "artifact-organizer/Page",
      "props": { "title": "Smoke test", "toc": false },
      "children": [
        {
          "component": "artifact-organizer/Section",
          "props": { "id": "tree", "title": "Tree + card" },
          "children": [
            { "component": "artifact-organizer/FileTree", "props": {
              "nodes": [{"name":"src","type":"dir","children":[{"name":"a.ts","type":"file","highlight":"primary"}]}]
            }},
            { "component": "artifact-organizer/FileCard", "props": {
              "name": "a.ts", "path": "src/a.ts", "loc": 42,
              "responsibility": "Entry point", "state": "modified",
              "exports": [{"name":"run","kind":"function"}]
            }}
          ]
        }
      ]
    }
  ]
}
JSON
```

- [ ] **Step 2: Render all 8 combinations (theme × mode)**

```bash
cd /Users/seongil/works/hyperscribe
for theme in studio midnight void gallery; do
  for mode in light dark; do
    node plugins/artifact-organizer/scripts/render.mjs \
      --in /tmp/hs-smoke/envelope.json \
      --out "/tmp/hs-smoke/$theme-$mode.html" \
      --theme "$theme" --mode "$mode" --quiet
    echo "ok $theme-$mode -> /tmp/hs-smoke/$theme-$mode.html"
  done
done
```

Expected: 8 `ok` lines; each HTML file exists and non-empty.

- [ ] **Step 3: Size check**

```bash
wc -c /tmp/hs-smoke/*.html
```

Expected: all files ~30 KB or more (full page with CSS inlined).

- [ ] **Step 4: Grep for `data-theme`/`data-mode` on each**

```bash
for f in /tmp/hs-smoke/*.html; do
  grep -o 'data-theme="[a-z]*" data-mode="[a-z]*"' "$f" | head -1
done
```

Expected: 8 lines, one per theme+mode combination.

- [ ] **Step 5: Open a spot-check in the default browser**

```bash
open /tmp/hs-smoke/void-dark.html
open /tmp/hs-smoke/gallery-light.html
```

Expected: both pages render with their theme tokens applied. `void-dark` should be pure black with blue-ring cards; `gallery-light` should have soft diffused card shadow on a white background.

- [ ] **Step 6: (Optional) clean up**

```bash
rm -rf /tmp/hs-smoke
```

No commit — smoke test is release-gate only.

---

## Self-review (completed — fixes applied inline)

- **Spec coverage:** Every numbered section of the spec maps to at least one task. §3 → Tasks 8–12. §4.1 rename → Tasks 1–3. §4.2 void → Task 4. §4.3 gallery → Task 5. §4.4 loading → covered implicitly by `listThemes()` picking up new files (no task needed). §5 first-call UX → Task 14 (SKILL.md Step 0) + Tasks 15–16 (commands + sub-skills). §6 preference → Task 7 (helper) + Tasks 14–16 (bash block in skills/commands). §6.4 renderer `--mode` → Task 6. §7 touched files → covered across all tasks with exact paths.
- **Placeholders:** none — all bash commands, code blocks, and JSON snippets are concrete.
- **Type consistency:** `FileNode.highlight` value set is `primary|secondary|muted` in both schema (Task 8) and CSS classes. `FileCard.state` matches CSS selectors. `DependencyGraph.edge.kind` values match CSS classes. `AnnotatedCode.pinStyle` values match module switch. `ERDDiagram.field.key` values match CSS selectors. Preference validation uses the same enums as `render.mjs` mode validation.
- **Scope:** Four sub-areas merged into one plan (per user decision). Total ~20 tasks with frequent commits keeps it digestible.
