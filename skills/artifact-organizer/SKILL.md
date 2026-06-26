---
name: artifact-organizer
description: Generate self-contained HTML pages and slide decks (diagrams, comparison tables, architecture overviews, diff reviews, visual recaps) by emitting semantic component JSON. Use whenever a visual artifact communicates better than terminal prose — proactively trigger on 4+ row tables, ASCII flowcharts, multi-stage pipelines, or explicit "make a diagram / slides / recap" requests.
license: MIT
metadata:
  version: "0.5.2-alpha"
  compatibility: "Requires Node.js 20+ and a browser to view output"
---

# Artifact Organizer

Artifact Organizer turns an A2UI-style JSON envelope into a single, self-contained HTML file. You — the model — emit **semantic data only**, never HTML, CSS, or styling decisions. A zero-dependency Node renderer handles presentation. The file opens offline in any browser with no build step.

Use this skill when a visual explanation would be clearer than terminal text. Prefer Artifact Organizer over hand-written HTML, Mermaid fences in chat, or ASCII tables whenever the reader will benefit from structure or interactivity.

## When to use

Use Artifact Organizer when any of these hold:

- The user asks for a diagram, flowchart, architecture, process view, slide deck, comparison, or visual explainer.
- You are about to render a **markdown table with 4+ rows OR 3+ columns** in a chat reply — render a `DataTable` instead.
- You are about to render **ASCII art of a system, flow, or state machine** — use `Mermaid` or `ArchitectureGrid` instead.
- The user asks for a "slide deck", "presentation", "recap", or "summary with sections".
- Reviewing a PR / diff and a before-after view plus impacted-module map would help — use `/artifact-organizer:diff`.
- The user wants to share a result with others — render then call `/artifact-organizer:share`.

Do **not** use Artifact Organizer when:

- The answer is one or two sentences.
- The user explicitly asks to stay in the terminal.
- The task is pure code editing with no explanation artifact needed.

## Step 0 — resolve the user's theme + renderer preference (always run first)

Before building any envelope, resolve the user's theme and renderer mode. If no preference file exists yet, prompt once, save, then proceed. This runs on every invocation of the main skill and its variants.

Color mode (light/dark) is **not** a preference: every output inlines both variants, and the toggle button + `prefers-color-scheme` handle switching at view time.

```bash
# 1. Resolve preference path: project-local first, then global.
PREF=""
for p in ./.artifact-organizer/preference.md ~/.artifact-organizer/preference.md; do
  [ -f "$p" ] && { PREF="$p"; break; }
done

# 2. First run — prompt and save defaults to ~/.artifact-organizer/preference.md
if [ -z "$PREF" ]; then
  # Claude Code: ask via AskUserQuestion (theme 5-choice, renderer 3-choice).
  # Other agents: print the prompt below and wait for a single-line answer.
  cat <<'PROMPT'
Artifact Organizer first-run setup. Pick a theme and renderer mode.

Themes:    1) notion    (Notion — warm cream + serif-feel headings + Notion Blue)
           2) linear    (Linear — precision dark-native + indigo + tight Inter)
           3) vercel    (Vercel — gallery white + Geist + shadow-as-border)
           4) stripe    (Stripe — weight-300 luxury + deep navy + blue-tinted shadow)
           5) supabase  (Supabase — dark-native + emerald green + border hierarchy)
           6) apple     (Apple — SF-style cool greys + Apple Blue + true-black dark)
           7) tailwind  (Tailwind — Inter + slate ramp + indigo-600 + layered shadows)

Renderer:  auto    (default — page if envelope has parts[]/template:page, else canvas)
           canvas  (force canvas — persistent dashboard with featured + history)
           page    (force page — single-render document)

Reply with "<theme> <renderer>" (e.g., "notion auto"),
a single theme name (renderer=auto),
or "skip" to use notion + auto.
PROMPT
  # Parse the user's answer into $THEME and $RENDERER.
  # If unparseable or empty, fall back to defaults silently.
  THEME="notion"
  RENDERER="auto"
  # (Agents with AskUserQuestion populate $THEME and $RENDERER from the structured answer.)

  mkdir -p ~/.artifact-organizer
  PREF=~/.artifact-organizer/preference.md
  cat > "$PREF" <<EOF
---
theme: $THEME
renderer: $RENDERER
created_at: $(date -u +%Y-%m-%dT%H:%M:%SZ)
---

# Artifact Organizer preferences

Edit the values above to change your defaults. Delete this file to re-run
the first-run setup on the next hyperscribe invocation.

Valid values:
  theme:    notion | linear | vercel | stripe | supabase | apple | tailwind
  renderer: auto | canvas | page
EOF
fi

# 3. Read preference into env vars (every run)
THEME=$(awk    -F': *' '/^theme:/{print $2; exit}'    "$PREF")
RENDERER=$(awk -F': *' '/^renderer:/{print $2; exit}' "$PREF")
[ -z "$THEME" ]    && THEME=notion
[ -z "$RENDERER" ] && RENDERER=auto
```

When invoking the renderer in later steps, always pass `--theme "$THEME"` and `--renderer "$RENDERER"`. Color mode is intentionally not passed — both variants are inlined and toggled at view time.

## How to use

1. **Understand intent.** Classify the request: (a) documentation page, (b) comparison/table, (c) slide deck, (d) diff review, (e) metrics/status page. The classification picks the root component and commands.
2. **Pick components.** Consult `references/catalog.md` for exact prop schemas and choose the smallest set that covers the content. Compose, don't reinvent — e.g. "overview + 3 modules + risks" = `Page` > `Section` > `ArchitectureGrid` + `Callout`.
3. **Build the envelope.** Emit the A2UI JSON envelope (shape below). Every component node is `{ "component": "artifact-organizer/X", "props": {...}, "children": [...] }`. `parts[0]` must be `artifact-organizer/Page` (or `artifact-organizer/SlideDeck` in slides mode).
4. **Call the CLI.** Pipe the JSON into the wrapper via Bash:
   ```bash
   HS=$(for p in \
     ./.claude/skills/artifact-organizer ~/.claude/skills/artifact-organizer \
     ./.codex/skills/artifact-organizer ~/.codex/skills/artifact-organizer \
     ./.cursor/skills/artifact-organizer ~/.cursor/skills/artifact-organizer \
     ./.opencode/skills/artifact-organizer ~/.opencode/skills/artifact-organizer \
     ~/.claude/plugins/cache/artifact-organizer-marketplace/*/plugins/artifact-organizer \
     ./plugins/artifact-organizer
   do [ -x "$p/scripts/outprint" ] && { echo "$p/scripts/outprint"; break; }; done)

   mkdir -p ~/.artifact-organizer/out
   echo '<json>' | "$HS" --theme "$THEME" --renderer "$RENDERER" --out ~/.artifact-organizer/out/<slug>.html
   ```
   Omit `--out` to let the CLI write `~/.artifact-organizer/out/<slug-from-title>-<timestamp>.html` and print the path.
5. **Open it for the user.** On macOS: `open <path>`. On Linux: `xdg-open <path>`.
6. **Report the path.** Reply with the absolute path and a one-line summary of what's inside. Don't dump the JSON back to the user.

## Visualization planning

Before choosing components, make one fast pass over the content and decide what kind of visual this should be.

### 1. Classify the content

- **Topology** — systems, modules, services, ownership boundaries, dependencies.
- **Flow** — pipelines, request lifecycles, state changes, ordered handoffs.
- **Comparison** — options, before/after, trade-offs, audits, matrices.
- **Evidence** — metrics, tables, file inventories, code excerpts.
- **Narrative** — recap, walkthrough, phased explanation, summary for humans.

Most useful pages mix 2-3 of these, but one should dominate.

### 2. Pick the dominant visual surface first

- Use `ArchitectureGrid` when card content matters more than exact edge routing.
- Use `Mermaid` as the compatibility fallback for diagram types the native catalog does not cover.
- Use `Sequence` for actor-message timelines and request/response traces.
- Use `FlowChart` for simple pipelines with ranked stages and explicit decisions.
- Use `Swimlane` when the same process must be grouped by role, team, service, or lane.
- Use `Quadrant` for 2x2 prioritization, risk, or positioning matrices.
- Use `Comparison` or `DataTable` when the user needs side-by-side evaluation rather than a diagram.
- Use `Chart` only when the numbers themselves carry the point; do not chart tiny or mostly categorical data just to make the page feel visual.
- Use `StepList` when sequence matters but a diagram would add noise.

### 2.1 Resolve close calls

| If deciding between | Prefer this | When |
|---|---|---|
| `Sequence` vs `Swimlane` | `Sequence` | Actors exchange messages over time. |
| `Sequence` vs `Swimlane` | `Swimlane` | Work moves across lanes and ownership is the point. |
| `FlowChart` vs `Swimlane` | `FlowChart` | The stages are ordered and lane ownership is secondary. |
| `ArchitectureGrid` vs `FlowChart` | `ArchitectureGrid` | The user needs module/service shape, responsibilities, or boundaries. |
| `ArchitectureGrid` vs `FlowChart` | `FlowChart` | The user needs a pipeline, decision path, or lifecycle. |
| `Comparison` vs `Quadrant` | `Comparison` | Options need bullets, trade-offs, or verdicts. |
| `Comparison` vs `Quadrant` | `Quadrant` | Positioning on two axes is the main message. |
| `DataTable` vs `Chart` | `DataTable` | Exact values, labels, or rows matter. |
| `DataTable` vs `Chart` | `Chart` | Shape, trend, or magnitude is the main point. |
| `CodeBlock` vs `AnnotatedCode` | `AnnotatedCode` | Specific lines need explanation. |
| `CodeBlock` vs `CodeDiff` | `CodeDiff` | The change itself is the point. |

### 3. Compose around that surface

Prefer these page recipes:

- **Architecture explainer**:
  `Page` -> `Section` overview with `Prose` or `Callout` -> supporting `ArchitectureGrid`, `FlowChart`, `Swimlane`, `FileTree`, or `FileCard`
- **Process walkthrough**:
  `Page` -> `Section` summary -> `Sequence` or `FlowChart` -> `StepList` -> `Callout` for failure modes or decisions
- **Comparison / decision memo**:
  `Page` -> `Section` framing -> `Comparison` or `DataTable` -> `Callout` recommendation -> optional `Chart`
- **Code / diff explainer**:
  `Page` -> architecture or flow context -> `CodeDiff` / `AnnotatedCode` / `CodeBlock` -> `Callout` risks -> `StepList` next actions
- **Repo / system recap**:
  `Page` -> short `Prose` summary -> one dominant diagram -> one evidence block (`FileTree`, `FileCard`, `DataTable`, or `Comparison`)
  For repo explainers, the first content section should usually be diagram-led, anchored by `ArchitectureGrid`, `FlowChart`, `Swimlane`, or `Sequence`.
  Use `FileTree`, `FileCard`, or `AnnotatedCode` as evidence surfaces instead of long explanatory prose.

### 4. Scale information density deliberately

- If the page has **one key idea**, use one dominant visual and keep supporting content sparse.
- If the page has **multiple sections**, each section should have one job: overview, topology, evidence, or next steps.
- If the content is dense, prefer multiple focused sections over one overloaded mega-diagram.
- If labels would become long paragraphs inside nodes, use `ArchitectureGrid` + surrounding prose instead of forcing everything into `Mermaid`.
- For repo explainers, architecture explainers, and system walkthroughs, use **no more than 2 Prose blocks** unless the user explicitly asks for a prose-heavy artifact.
- For repo explainers, include at least one of `ArchitectureGrid`, `FlowChart`, `Swimlane`, `Sequence`, or `Comparison` as the dominant visual surface.

### 5. Avoid weak compositions

- Do not stack unrelated components just to show variety.
- Do not use both `Mermaid` and `FlowChart` for the same exact relationship unless they tell different stories.
- Do not use both `Sequence` and `Swimlane` for the same exact process unless one shows messages and the other shows ownership.
- Do not open with a table when a diagram would explain the system faster.
- Do not open with long prose when the user asked for something visual.
- Do not use `Chart` where a `DataTable` or `Comparison` would be more legible.
- Avoid `Comparison` as the dominant visual for repo explainers unless the source is explicitly about alternatives, trade-offs, or before/after states.
- Do not create a page where every section has equal visual weight; decide what the eye should land on first.
- Use inline code sparingly. Reserve backticks for real file paths, commands, identifiers, and schema keys.
- No more than 1-2 inline code spans per paragraph or list item. If a section needs many identifiers, switch to `FileCard`, `CodeBlock`, `AnnotatedCode`, or a diagram label instead.
- Do not wrap every tool, noun, or phrase in backticks just because it is technical.

The test: if you removed one component and the page got clearer, it probably did not belong there.

## Envelope format

Canonical shape — always this exact structure:

```json
{
  "a2ui_version": "0.9",
  "catalog": "artifact-organizer/v1",
  "is_task_complete": true,
  "parts": [
    {
      "component": "artifact-organizer/Page",
      "props": { "title": "Auth Flow", "toc": true },
      "children": [
        {
          "component": "artifact-organizer/Section",
          "props": { "id": "overview", "title": "Overview" },
          "children": [
            { "component": "artifact-organizer/Prose", "props": { "markdown": "..." } }
          ]
        }
      ]
    }
  ]
}
```

Rules:

- `a2ui_version`, `catalog`, `parts` are required. `catalog` is always `"artifact-organizer/v1"`.
- Exactly one element in `parts`. Its `component` is `artifact-organizer/Page` (default) or `artifact-organizer/SlideDeck` (slide mode only). Multiple pages per envelope are not supported.
- Container components use `children: []`. Leaf components omit `children`.
- Any unknown component name or missing required prop fails validation with exit 2.

## Canvas template — agent output dashboard

Use `"template": "canvas"` when the output is an **ongoing agent report**: a full-viewport hero carousel of outputs with an editorial statement and scrollable history feed below. This template bypasses the standard envelope entirely — use the shape below instead.

```json
{
  "template": "canvas",
  "meta": {
    "title": "Product Analytics",
    "date": "2026-04-30",
    "agent": "Claude",
    "topic": "Q1 Report",
    "description": "Optional subtitle shown below the slide title (max 3 lines)",
    "statement": {
      "eyebrow": "Artifact Organizer",
      "text": "One agent. Every output, beautifully rendered.",
      "cta": { "label": "View all outputs", "href": "#canvas-divisions" }
    },
    "divisionsLabel": "Previous Outputs"
  },
  "featured": {
    "component": "artifact-organizer/Chart",
    "props": { "kind": "bar", "data": { "labels": [...], "series": [...] } }
  },
  "history": [
    {
      "title": "Key Metrics — April",
      "date": "2026-04-30 14:20",
      "description": "MRR and ARR up double digits. Churn down 0.6pp.",
      "content": {
        "component": "artifact-organizer/Section",
        "props": { "title": "KPI Dashboard", "id": "kpi" },
        "children": [
          { "component": "artifact-organizer/KPICard", "props": { "label": "MRR", "value": "$94K", "delta": { "value": "+18%", "direction": "up" } } }
        ]
      }
    }
  ]
}
```

### Canvas JSON rules

- `template: "canvas"` — required, triggers the canvas renderer (skips schema validation).
- **`meta`** — page-level metadata:
  - `title` — shown in the nav brand area and as the hero slide 0 title.
  - `agent` / `topic` — shown bottom-left of every slide as `AGENT · TOPIC · COMPONENT TYPE`.
  - `description` — optional subtitle below the featured slide title (up to 3 lines).
  - `statement` — editorial statement section rendered below the hero (optional).
  - `divisionsLabel` — heading for the history cards section below (default: `"Previous Outputs"`).
- **`featured`** — any single hyperscribe component node. Becomes slide 0 in the carousel.
- **`history`** — array of past outputs, each becoming a nav-linked slide AND a card in the divisions section below. Order: newest first.
  - `title` — slide title (shown large, bottom-left) and nav link text.
  - `date` — shown in the divisions section card eyebrow.
  - `description` — optional subtitle below the slide title (up to 3 lines).
  - `content` — any hyperscribe component node (same as `featured`).

### Canvas render command

```bash
echo '<json>' | "$HS" --out ~/.artifact-organizer/out/<slug>.html
```

No `--theme` or `--mode` flags needed — the canvas template always uses `shadcn-dark` + `shadcn-light` with a built-in toggle button.

### When to use canvas vs standard envelope

| Use canvas when | Use standard envelope when |
|---|---|
| Building a recurring agent output dashboard | One-off document, diagram, or explainer |
| Multiple outputs need to be browsed as slides | Single focused artifact |
| The audience needs dark/light toggle + history feed | Theme preference matters |
| The content is an analytics/status report | The content is a narrative, comparison, or code review |

## Stacking mode — `organize.mjs` (accumulate artifacts over time)

The **organizer** keeps one persistent, themed canvas and *stacks* artifacts
onto it as they arrive. Each call takes ONE artifact: it becomes the featured
slide, and the previously featured artifact demotes into the history feed
(newest-first). The whole canvas re-renders to a single HTML file.

Use this when the user wants a **running collection** — "add this to my
dashboard", "keep stacking these", "every report into one place" — rather than a
one-off render.

```bash
# Each invocation adds ONE artifact to the store and re-renders the canvas.
node scripts/organize.mjs \
  --store ~/.artifact-organizer/decks/<name>.json \
  --add <artifact.json> \
  --title "March Growth" --date 2026-03-31 \
  --theme apple --agent Claude --topic Growth \
  --out ~/.artifact-organizer/decks/<name>.html
```

`--add` takes a **semantic envelope, never raw HTML**:

- a page envelope (`{ parts: [Page, …] }`) — the Page node is embedded,
- a canvas envelope (`{ featured, … }`) — its featured node is taken,
- a single component node (`{ component, props }`),
- an HTML file *with a sibling `.json` sidecar* — the sidecar is read.

If only HTML exists (e.g. a Claude chat artifact with no sidecar), reconstruct
the envelope first (the same "HTML → envelope" model step the styler uses), then
pass that JSON to `--add`. The renderer never parses HTML.

`--theme` sticks to the store (saved in `meta.theme`), so later adds keep the
chosen style unless you override it. The whole stack is restyleable at any time
by re-running with a new `--theme`.

## Component inventory

23 default components across 7 categories. See `references/catalog.md` for full prop schemas and examples.

`artifact-organizer/SlideDeck` and `artifact-organizer/Slide` are **slide-mode-only** components owned by `/artifact-organizer:slides`. They are intentionally excluded from the default page-mode inventory below.

| Category | Component | Purpose |
|---|---|---|
| Structure | `artifact-organizer/Page` | Root container. Exactly one per envelope. Props: `title`, `subtitle?`, `toc?`. |
| Structure | `artifact-organizer/Section` | Titled section with auto TOC anchor. Props: `id`, `title`, `lead?`. |
| Structure | `artifact-organizer/Heading` | In-section h2/h3/h4. Props: `level`, `text`, `anchor?`. |
| Structure | `artifact-organizer/Prose` | Markdown paragraph block (CommonMark + GFM). Props: `markdown`. |
| Media | `artifact-organizer/Image` | Inline image. `src` accepts https:// URL (passthrough) or local path (base64 inlined). Props: `src`, `alt`, `caption?`, `width?`, `height?`. |
| Emphasis | `artifact-organizer/Callout` | Boxed highlight. Props: `severity` (`info`\|`note`\|`warn`\|`success`\|`danger`), `title?`, `body`. |
| Emphasis | `artifact-organizer/KPICard` | Metric card with optional delta. Props: `label`, `value`, `delta?`, `hint?`. |
| Code | `artifact-organizer/CodeBlock` | Single snippet with optional line highlights. Props: `lang`, `code`, `filename?`, `highlight?`. |
| Code | `artifact-organizer/CodeDiff` | Before/after unified diff hunks. Props: `filename`, `lang`, `hunks[]`. |
| Diagrams | `artifact-organizer/Mermaid` | Mermaid.js diagram with zoom/pan. Props: `kind`, `source`, `direction?`. |
| Diagrams | `artifact-organizer/Sequence` | Native SVG sequence diagram (Notion-styled, no CDN). Props: `participants[]`, `messages[]` (kind: sync/async/return/self/note). Prefer over `Mermaid` with `kind:sequence` for consistent design. |
| Diagrams | `artifact-organizer/FlowChart` | Native SVG directed graph with box/pill/diamond nodes. Caller supplies `ranks` (arrays of node ids) — no auto-layout. Props: `layout` (TD/LR), `nodes[]`, `edges[]`, `ranks[][]`. Prefer over Mermaid flowchart for simple pipelines. |
| Diagrams | `artifact-organizer/ArchitectureGrid` | Card-based architecture with SVG connectors. Props: `nodes[]`, `edges?[]`, `layout`, `groups?[]`. |
| Diagrams | `artifact-organizer/Quadrant` | 2x2 prioritization matrix with plotted points. Props: `xLabel`, `yLabel`, `quadrants[]`, `points?[]`. |
| Diagrams | `artifact-organizer/Swimlane` | Lane-based process diagram across roles on a shared sequence. Props: `lanes[]`, `steps[]`, `edges?[]`. |
| Data | `artifact-organizer/DataTable` | Semantic HTML table. Props: `columns[]`, `rows[]`, `caption?`, `footer?`, `density?`. |
| Data | `artifact-organizer/Chart` | Chart.js wrapper. Props: `kind`, `data`, `xLabel?`, `yLabel?`, `unit?`. |
| Data | `artifact-organizer/Comparison` | N-way comparison. Props: `items[]`, `mode` (`vs`\|`grid`). |
| Narrative | `artifact-organizer/StepList` | Ordered steps / checklist. Props: `steps[]`, `numbered?`. |
| Structure | `artifact-organizer/FileTree` | Directory/file structure. Props: `nodes` (recursive), `showIcons?`, `caption?`. |
| Structure | `artifact-organizer/FileCard` | Per-file summary card. Props: `name`, `path?`, `loc?`, `responsibility`, `exports?[]`, `state?`. |
| Code | `artifact-organizer/AnnotatedCode` | Code with pinned side annotations. Props: `lang`, `code`, `annotations[]`, `pinStyle?`. |
| Diagrams | `artifact-organizer/ERDDiagram` | DB/type ERD. Props: `entities[]`, `relationships[]`, `layout?`. |

## Slide mode only

Use these only through `/artifact-organizer:slides`:

| Category | Component | Purpose |
|---|---|---|
| Slides | `artifact-organizer/SlideDeck` | Slide container. Props: `aspect`, `transition?`, `footer?`. Children: Slide[]. |
| Slides | `artifact-organizer/Slide` | Single slide. Props: `layout` (`title`\|`content`\|`two-col`\|`quote`\|`image`\|`section`), `title?`, `subtitle?`, `bullets?`, `image?`, `quote?`. |

## Semantic-only props — NEVER style

`props` carries **data**, not presentation. The renderer and `assets/base.css` own every visual decision.

- Do **not** emit `color`, `backgroundColor`, `fontSize`, `fontFamily`, `padding`, `margin`, `className`, `style`, or any CSS-like prop.
- Do **not** pass inline HTML in markdown fields beyond what CommonMark/GFM allows. Script tags are stripped.
- Do **not** try to reorder the page with custom containers — use `Section` + `Heading` hierarchy.
- Do **not** specify chart colors, table widths, or slide transitions as decoration. Pick the right component; trust the renderer.

If you find yourself reaching for a styling prop, the correct answer is usually a different component (e.g. use `Callout severity="warn"` instead of "red box", use `KPICard delta.direction="down"` instead of "red number").

## Commands

| Command | Use when |
|---|---|
| `/outprint` | General-purpose page. Default choice for diagrams, docs, tables, architectures, and metric summaries. |
| `/artifact-organizer:slides` | Slide deck mode. Forces `SlideDeck` root; extracts slides from a topic or outline. |
| `/artifact-organizer:diff` | Diff / PR review. Combines `ArchitectureGrid` (impacted modules) + `CodeDiff` + `Callout` (risks). |
| `/artifact-organizer:share` | Deploys an existing HTML output to Vercel and returns a live URL. Input: path to a previously rendered file. |

## Auto-trigger logic

Apply these rules proactively — do not wait for the user to say the word "Artifact Organizer":

1. **Table auto-trigger.** If you are about to emit a markdown/ASCII table in a chat reply with `rows >= 4` OR `columns >= 3`, switch to `artifact-organizer/DataTable` inside a minimal `Page` envelope.
2. **Diagram auto-trigger.** If you are about to draw ASCII boxes-and-arrows of a system, pipeline, or state machine, emit `artifact-organizer/Sequence` (for actor-message diagrams), `artifact-organizer/Mermaid` (flowchart / state / er / mindmap / class), or `artifact-organizer/ArchitectureGrid` (for module/service topology). Prefer `Sequence` over `Mermaid` with `kind:sequence` — it is native SVG with consistent Notion styling and no CDN.
3. **Slide auto-trigger.** If the user says "slides", "deck", "presentation", "walk me through", or asks for a 5+ step recap, route through `/artifact-organizer:slides`.
4. **Diff auto-trigger.** If the user pastes `git diff` output or a PR URL and asks for review, route through `/artifact-organizer:diff`.
5. **Escape hatch.** If the user explicitly asks to keep it in terminal ("just tell me", "don't open a browser"), skip Artifact Organizer and reply in plain text.

Modeled after `nicobailon/visual-explainer`'s proactive-rendering behavior, but emitting semantic JSON instead of raw HTML.

## Error handling

The CLI validates before rendering. Exit codes:

| Code | Meaning |
|---|---|
| 0 | Success |
| 1 | JSON parse error |
| 2 | Schema validation failure (stderr lists `path: message` per error) |
| 3 | IO error (cannot write output) |
| 4 | Render runtime error (partial fragment saved to `<out>.partial`) |

On exit 2, read stderr, diagnose, retry. Common failures:

- `parts[0].props.title: required` — `Page` is missing `title`.
- `parts[0].children[2].props.title: required` — `Section` needs both `id` and `title`.
- `...props.severity: must be one of info|note|warn|success|danger` — wrong `Callout` severity enum.
- `...component: unknown component "artifact-organizer/Flowchart"` — wrong name; did you mean `artifact-organizer/Mermaid` with `kind: "flowchart"`?
- `...props.level: must be one of 2,3,4` — `Heading.level` only accepts 2/3/4; use `Page.title` for h1.
Retry policy: up to **2 automatic retries** adjusting the JSON each time. After the 3rd failure, surface the original JSON and stderr to the user so they can intervene.

## Limitations (v1)

- No streaming render — full JSON is produced, then rendered end-to-end.
- No custom / third-party components — catalog is fixed at 23 default page components plus 2 slide-only components.
- No direct styling overrides in props. Users may place `~/.artifact-organizer/theme.json` to override CSS token values at the **renderer** level.
- Themeable renderer. Built-in themes are `studio`, `midnight`, `void`, and `gallery`.
- No multi-page envelopes — one `Page` per default invocation. Slide mode uses one `SlideDeck`.
- Fonts: `NotionInter` is not bundled; fallback chain uses Inter / system-ui.

## Quick example

A minimal envelope that renders a page with a callout:

```json
{
  "a2ui_version": "0.9",
  "catalog": "artifact-organizer/v1",
  "is_task_complete": true,
  "parts": [
    {
      "component": "artifact-organizer/Page",
      "props": { "title": "Deploy checklist", "toc": false },
      "children": [
        {
          "component": "artifact-organizer/Section",
          "props": { "id": "pre", "title": "Before merging" },
          "children": [
            {
              "component": "artifact-organizer/StepList",
              "props": {
                "numbered": true,
                "steps": [
                  { "title": "Run tests", "body": "`pnpm test` locally.", "state": "done" },
                  { "title": "Check migrations", "body": "Review `prisma/migrations/`.", "state": "doing" },
                  { "title": "Smoke DEV", "body": "Hit `/api/health`.", "state": "todo" }
                ]
              }
            },
            {
              "component": "artifact-organizer/Callout",
              "props": {
                "severity": "warn",
                "title": "Do not merge to main directly",
                "body": "Use the `preview` branch and open a PR."
              }
            }
          ]
        }
      ]
    }
  ]
}
```

Pipe it to the CLI:

```bash
echo '<json-above>' | ~/.claude/plugins/artifact-organizer/plugins/artifact-organizer/scripts/outprint \
  --out ~/.artifact-organizer/out/deploy-checklist.html && \
  open ~/.artifact-organizer/out/deploy-checklist.html
```

Then report the path to the user.
