# artifact-organizer

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node >= 20](https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg)](https://nodejs.org/)
[![Claude Code plugin](https://img.shields.io/badge/claude--code-plugin-6E56CF.svg)](https://docs.claude.com/en/docs/claude-code)
[![Status: alpha](https://img.shields.io/badge/status-alpha-orange.svg)](#roadmap)

Agent skill that turns semantic JSON into self-contained HTML — no raw markup, no token waste, no external dependencies at runtime.

The model emits a component envelope. The renderer handles layout, theming, validation, and packaging. Output is a single `.html` file that opens offline.

---

## Why

LLMs are bad at HTML. Token cost is high, output is inconsistent, and a single misplaced `</div>` breaks everything. This project flips the contract:

- **The model emits semantic data only** — picks components from a fixed catalog, fills in props. No CSS, no class names, no markup.
- **The renderer owns presentation** — validates the schema, picks a theme, inlines all CSS / fonts / JS, and writes one HTML file.
- **The output ships offline** — no CDN, no build step, no server. Open the file, see the result.

---

## Quick start

```bash
git clone https://github.com/keepYaoung/artifact-organizer.git
cd artifact-organizer

cat > /tmp/hello.json <<'EOF'
{
  "template": "canvas",
  "meta": {
    "title": "Deploy Status",
    "agent": "Claude"
  },
  "featured": {
    "component": "artifact-organizer/StepList",
    "props": { "steps": [
      { "title": "Run test suite",    "state": "done"  },
      { "title": "DB migration",      "state": "doing" },
      { "title": "Deploy to staging", "state": "todo"  }
    ]}
  }
}
EOF

node plugins/artifact-organizer/scripts/render.mjs --in /tmp/hello.json --out /tmp/hello.html
open /tmp/hello.html      # macOS — use xdg-open on Linux
```

That's the whole loop: write semantic JSON, run the renderer, open the HTML.

---

## Two render modes

A doc is either a **canvas** (persistent agent dashboard, default) or a **page** (one-shot document). The renderer picks automatically based on envelope shape.

### Canvas mode — default

Full-viewport dashboard the agent updates over time. A hero carousel cycles through past outputs; `featured` is the current run. The `history` array builds a linked archive below.

```json
{
  "template": "canvas",
  "meta": {
    "title": "Product Analytics",
    "navLabel": "Analytics Hub",
    "subtitle": "Updated weekly by Claude",
    "agent": "Claude",
    "topic": "Growth",
    "divisionsLabel": "Past Reports",
    "statement": {
      "eyebrow": "Artifact Organizer",
      "text": "One agent. Every output, beautifully rendered.",
      "cta": { "label": "Browse archive", "href": "#canvas-divisions" }
    }
  },
  "featured": {
    "component": "artifact-organizer/Chart",
    "props": { "kind": "bar", "data": { "labels": ["Jan","Feb","Mar"], "series": [{ "name": "MAU", "values": [1200, 3400, 8100] }] } }
  },
  "history": [
    {
      "title": "March Growth Report",
      "navLabel": "March",
      "eyebrow": "2026-03-31  ·  Growth",
      "description": "MAU up 140% MoM. Channel breakdown inside.",
      "date": "2026-03-31",
      "href": "march-report.html",
      "content": { "component": "artifact-organizer/KPICard", "props": { "label": "MAU", "value": "8 100" } }
    }
  ]
}
```

#### Canvas `meta` fields

| Field | Purpose |
|---|---|
| `title` | Page `<title>` + hero slide heading |
| `navLabel` | Nav link label for the featured slide (defaults to `title`) |
| `subtitle` | Hero slide subtitle |
| `agent` | Agent name shown in header badge |
| `topic` | Topic badge shown alongside agent name |
| `divisionsLabel` | Section heading above the history cards (default: `"Previous Outputs"`) |
| `statement` | Editorial statement block: `eyebrow`, `text`, `cta` |

#### Canvas `history[]` item fields

| Field | Purpose |
|---|---|
| `title` | Card title + hero slide heading |
| `navLabel` | Nav link label (defaults to `title`) |
| `subtitle` | Hero slide subtitle |
| `eyebrow` | Division card eyebrow (default: `date · type`) |
| `description` | Division card description |
| `date` | ISO date string — used in auto eyebrow |
| `href` | Path to a linked HTML file — makes the whole card a clickable link |
| `content` | Component node **or** array of component nodes to render in the slide |

> **Multi-component slides:** pass `content` as an array to render multiple components side-by-side in a responsive grid.

### Page mode — `parts[]`

A traditional one-shot document. Every component sits inside a `Page` (or `SlideDeck`).

```json
{
  "a2ui_version": "0.9",
  "catalog": "artifact-organizer/v1",
  "parts": [{
    "component": "artifact-organizer/Page",
    "props": {
      "title": "Q1 Metrics",
      "subtitle": "January – March 2026",
      "backHref": "index.html",
      "backLabel": "← All Reports"
    },
    "children": [
      { "component": "artifact-organizer/Section", "props": { "id": "kpis", "title": "KPIs" }, "children": [
        { "component": "artifact-organizer/KPICard", "props": { "label": "Revenue", "value": "$1.2 M" } }
      ]}
    ]
  }]
}
```

`backHref` + `backLabel` render a sticky frosted-glass back-navigation bar at the top of the page — useful when the page is part of a multi-HTML set linked from a canvas hub.

### Choosing a mode

| Use canvas when… | Use page when… |
|---|---|
| Agent runs repeatedly, outputs build up over time | Single render, one-off artifact |
| Dashboard, brief, "what did the agent do this week" | Document, report, slide deck |
| You want a persistent hub with linked sub-pages | You're sending a standalone file |

Default is `canvas`. Force either side:

```bash
node plugins/artifact-organizer/scripts/render.mjs --in envelope.json --out out.html --renderer page
node plugins/artifact-organizer/scripts/render.mjs --in envelope.json --out out.html --renderer canvas
```

---

## Multi-HTML linking

Canvas outputs can link to individual page-mode reports. The result is a navigable set of HTML files that work offline or over a tunnel — no server, no framework.

```
index.html  (canvas hub)
├── Division Card → 01-q1-launch.html
├── Division Card → 02-april-growth.html
└── Division Card → 03-week18-team.html
```

**Hub side** — add `href` to each `history[]` item:

```json
{ "title": "April Growth", "href": "02-april-growth.html", ... }
```

**Sub-page side** — add `backHref` to the `Page` props:

```json
{ "component": "artifact-organizer/Page", "props": { "title": "April Growth", "backHref": "index.html" } }
```

See [`examples/multi-html/`](examples/multi-html/) for a fully rendered working example with `build.sh`.

---

## Components

35 components across page mode, slide mode, and canvas / site mode.

| Category | Components |
|---|---|
| Structure | `Page` `Section` `Heading` `Prose` `FileTree` `FileCard` |
| Data | `DataTable` `Chart` `KPICard` `Comparison` |
| Diagrams | `Mermaid` `Sequence` `ArchitectureGrid` `FlowChart` `Quadrant` `Swimlane` `ERDDiagram` |
| Code | `CodeBlock` `CodeDiff` `AnnotatedCode` |
| Narrative | `StepList` `Callout` `Image` `ArticleCard` |
| Slides | `SlideDeck` `Slide` |
| Canvas / Site | `SiteHeader` `HeroCarousel` `EditorialStatement` `DivisionCard` `SiteFooter` `PressMentions` `ProjectTile` `MosaicGrid` `CountdownTimer` |

Components carry **semantic data only** — styling props (`color`, `backgroundColor`, `fontSize`, `className`, …) are rejected by the schema. If you want a red warning box, ask for `Callout severity="warn"`, never a hex code.

Full prop schemas: [`plugins/artifact-organizer/references/catalog.md`](plugins/artifact-organizer/references/catalog.md).

### Slide deck modes

`SlideDeck` supports three scroll modes via the `mode` prop:

| Mode | Behaviour |
|---|---|
| `deck` (default) | Click/keyboard navigation, no scroll |
| `scroll-snap` | Native CSS scroll-snap; each slide snaps into view |
| `scroll-jack` | Sticky scroll-jacking via IntersectionObserver; cinematic feel |

Respects `prefers-reduced-motion` — scroll animations are suppressed when the user has reduced motion enabled.

---

## Themes

5 bundled themes — each strictly per their public DESIGN.md tokens. Every output inlines both light and dark variants; the toggle button + system `prefers-color-scheme` switch them at view time, so color mode is **not** a render-time setting.

| Theme | Character |
|---|---|
| `notion` | Warm cream surfaces, whisper borders, Notion Blue accent — reading-first |
| `linear` | Dark-native canvas, Inter Variable + cv01/ss03, indigo accent |
| `vercel` | Gallery white, Geist + Geist Mono, shadow-as-border |
| `stripe` | Weight-300 luxury headlines, deep navy `#061b31`, blue-tinted shadow |
| `supabase` | Dark-native, emerald `#3ecf8e` accent, NO box-shadows (border hierarchy) |

Default: `notion`. Override per call:

```bash
node plugins/artifact-organizer/scripts/render.mjs --in envelope.json --out out.html --theme stripe
```

Themes live as pure CSS-variable overrides under [`plugins/artifact-organizer/themes/`](plugins/artifact-organizer/themes/).

---

## Configuration

User preferences live in `~/.artifact-organizer/preference.md` (global) or `./.artifact-organizer/preference.md` (project-local; takes priority).

```yaml
---
theme: notion
renderer: auto
created_at: 2026-04-30T...
---
```

| Field | Values | Default | Purpose |
|---|---|---|---|
| `theme` | `notion` `linear` `vercel` `stripe` `supabase` | `notion` | Brand-aligned theme |
| `renderer` | `auto` `canvas` `page` | `auto` | Force renderer; `auto` infers from envelope |

The skill prompts for these on first run via `Step 0` in `SKILL.md` and writes the file. Delete it to re-prompt.

### CLI flags

| Flag | Effect |
|---|---|
| `--theme <name>` | Override theme for this call |
| `--renderer <auto\|canvas\|page>` | Override renderer for this call |
| `--mode <light\|dark\|auto>` | Force initial color mode (rare; the toggle handles it) |
| `--in <path>` | JSON input (or pipe via stdin) |
| `--out <path>` | HTML output |
| `--title <s>` | Override `Page.title` |
| `--validate-only` | Validate JSON, do not render |

---

## Install

### Claude Code

```
/plugin marketplace add keepYaoung/artifact-organizer
/plugin install outprint@artifact-organizer-marketplace
```

### Any agent (Codex, Cursor, Gemini CLI, …)

```bash
npx skills add keepYaoung/artifact-organizer
```

### Manual

```bash
git clone https://github.com/keepYaoung/artifact-organizer.git
cd artifact-organizer
node plugins/artifact-organizer/scripts/render.mjs --in envelope.json --out out.html
```

---

## Slash commands (Claude Code)

| Command | Description |
|---|---|
| `/outprint` | Canvas-first output — dashboard, report, recap |
| `/artifact-organizer:slides` | Forces `SlideDeck` root |
| `/artifact-organizer:diff` | PR / diff review with `CodeDiff` + `ArchitectureGrid` |
| `/artifact-organizer:share` | Deploy output to Vercel, return public URL |

---

## Serving & sharing

Every output is a single self-contained `.html` file — all CSS and JS are inlined.

### Local file (offline)

```bash
open out.html          # macOS
xdg-open out.html      # Linux
```

Multi-HTML sets (canvas hub + sub-pages) work the same way — just keep all files in the same folder.

### Local server + tunnel (shareable URL, no hosting)

```bash
# Terminal 1 — static file server
cd examples/multi-html     # or wherever your HTML files are
npx serve .                # → http://localhost:3000
# alternative: python3 -m http.server 8080

# Terminal 2 — public tunnel
npx cloudflared tunnel --url http://localhost:3000
# alternative: ngrok http 3000
```

The tunnel prints a URL like `https://xxxx.trycloudflare.com`. Anyone with the link can browse the full HTML set, including inter-page navigation.

> Google Fonts load from the CDN. Everything else is inlined. Fonts fall back gracefully offline.

### Deploy to Vercel (permanent URL)

```bash
npx vercel examples/multi-html --prod
```

Or use `/artifact-organizer:share` in Claude Code — it runs the deploy and returns the URL automatically.

---

## Project structure

```
.
├── plugins/artifact-organizer/        # Renderer + components + themes
│   ├── scripts/
│   │   ├── render.mjs            # CLI entry + resolveRenderer()
│   │   ├── canvas.mjs            # Canvas-mode renderer
│   │   ├── components/           # 34 component renderers
│   │   └── lib/                  # Schema validation, theme loader, preference parser
│   ├── assets/                   # base.css + per-component CSS + interactive.js
│   ├── themes/                   # 5 brand themes
│   ├── spec/catalog.json         # Component catalog (source of truth)
│   └── references/catalog.md    # Human-readable prop docs
├── skills/                  # Mirror for non-plugin agent runtimes
│   ├── outprint/                 # Base skill (page + canvas)
│   ├── outprint-slides/          # Slide-deck variant
│   ├── outprint-diff/            # PR review variant
│   └── outprint-share/           # Vercel deploy variant
├── examples/
│   └── multi-html/               # Canvas hub + 3 linked page-mode reports
├── tools/claw/              # Optional Slack/agent wrapper
├── tests/                   # Unit + golden-snapshot tests
└── benchmark/               # Token-cost comparison vs hand-written HTML
```

---

## Optional tooling — `tools/claw/`

`tools/claw/outprint-render` is a bash wrapper for agent runtimes that need:

- **Forced theme/mode defaults** when the LLM drops them
- **Envelope diversity check** — rejects flat prose-only outputs (skip with `--allow-prose-only`)
- **Opt-in canvas wrap** (`--canvas-wrap`) — converts page envelope to canvas template

See [`tools/claw/README.md`](tools/claw/README.md) for install and env vars.

---

## Roadmap

- Richer canvas interactions (inline editing, pinning, reordering history)
- More data components (pivot table, timeline, heatmap)
- Agent SDK streaming — partial renders as the envelope arrives
- Inline font bundling for fully offline output (no Google Fonts CDN)

---

## Contributing

Node 20+. Run `npm test` before opening a PR. Keep the renderer (`render.mjs` / `canvas.mjs`) and the catalog (`spec/catalog.json` + `references/catalog.md`) in sync when touching component schemas.

Issues: [github.com/keepYaoung/artifact-organizer/issues](https://github.com/keepYaoung/artifact-organizer/issues)

---

## License

MIT — see [LICENSE](LICENSE).
