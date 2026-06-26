# Artifact Organizer Component Catalog — hyperscribe/v1

**This file is auto-generated from `plugins/artifact-organizer/spec/catalog.json`. Do not edit by hand. Run `node tools/build-catalog-md.mjs` to regenerate.**

## Envelope

Every Artifact Organizer document uses this envelope:

```json
{
  "a2ui_version": "0.9",
  "catalog": "artifact-organizer/v1",
  "is_task_complete": true,
  "parts": [ /* exactly one artifact-organizer/Page */ ]
}
```

Required envelope fields: `a2ui_version`, `catalog`, `parts`.

Root component must be `artifact-organizer/Page`.

## Components (33 default + 2 slide-mode-only)

The default `/outprint` page mode uses the components below.

`artifact-organizer/SlideDeck` and `artifact-organizer/Slide` are **slide-mode-only** components owned by `/artifact-organizer:slides`.

## Structure

### `artifact-organizer/Page`

Root container. Exactly one Page per envelope.

- **Children:** required

| Prop | Type | Required | Notes |
|---|---|---|---|
| `title` | `string` | **required** |  |
| `subtitle` | `string` | optional |  |
| `toc` | `boolean` | optional | default: `false` |
| `chromeless` | `boolean` | optional | default: `false` |

### `artifact-organizer/Section`

First-class section. Auto TOC anchor.

- **Children:** allowed

| Prop | Type | Required | Notes |
|---|---|---|---|
| `id` | `string` | **required** | pattern: `^[a-z0-9][a-z0-9-]*$` |
| `title` | `string` | **required** |  |
| `lead` | `string` | optional |  |

### `artifact-organizer/Heading`

In-section heading (h2-h4).

- **Children:** forbidden

| Prop | Type | Required | Notes |
|---|---|---|---|
| `level` | `2 | 3 | 4` | **required** |  |
| `text` | `string` | **required** |  |
| `anchor` | `string` | optional | pattern: `^[a-z0-9][a-z0-9-]*$` |

### `artifact-organizer/Prose`

Markdown paragraph block (inline formatting + lists).

- **Children:** forbidden

| Prop | Type | Required | Notes |
|---|---|---|---|
| `markdown` | `string` | **required** |  |

### `artifact-organizer/FileTree`

Directory/file structure visualization. Recursive nodes with optional highlights.

- **Children:** forbidden

| Prop | Type | Required | Notes |
|---|---|---|---|
| `nodes` | `array<any>` | **required** |  |
| `showIcons` | `boolean` | optional | default: `true` |
| `caption` | `string` | optional |  |

### `artifact-organizer/FileCard`

Per-file summary card — name, path, LOC, responsibility, exports, change state.

- **Children:** forbidden

| Prop | Type | Required | Notes |
|---|---|---|---|
| `name` | `string` | **required** |  |
| `path` | `string` | optional |  |
| `loc` | `number` | optional |  |
| `responsibility` | `string` | **required** |  |
| `exports` | `array<any>` | optional |  |
| `state` | `"modified" | "added" | "removed" | "stable"` | optional | default: `"stable"` |
| `icon` | `string` | optional |  |

## Media

### `artifact-organizer/Image`

Inline image. Accepts https:// URLs (passed through) or local paths (base64-inlined at render time to keep the HTML self-contained).

- **Children:** forbidden

| Prop | Type | Required | Notes |
|---|---|---|---|
| `src` | `string` | **required** |  |
| `alt` | `string` | **required** |  |
| `caption` | `string` | optional |  |
| `width` | `number` | optional |  |
| `height` | `number` | optional |  |

## Emphasis

### `artifact-organizer/Callout`

Boxed highlight.

- **Children:** forbidden

| Prop | Type | Required | Notes |
|---|---|---|---|
| `severity` | `"info" | "note" | "warn" | "success" | "danger"` | **required** |  |
| `title` | `string` | optional |  |
| `body` | `string` | **required** |  |

### `artifact-organizer/KPICard`

Metric card with optional delta.

- **Children:** forbidden

| Prop | Type | Required | Notes |
|---|---|---|---|
| `label` | `string` | **required** |  |
| `value` | `string` | **required** |  |
| `delta` | `{ value: string, direction: "up" | "down" | "flat" }` | optional |  |
| `hint` | `string` | optional |  |

## Code

### `artifact-organizer/CodeBlock`

Single code snippet.

- **Children:** forbidden

| Prop | Type | Required | Notes |
|---|---|---|---|
| `lang` | `string` | **required** |  |
| `code` | `string` | **required** |  |
| `filename` | `string` | optional |  |
| `highlight` | `array<number>` | optional |  |

### `artifact-organizer/CodeDiff`

Before/after unified diff.

- **Children:** forbidden

| Prop | Type | Required | Notes |
|---|---|---|---|
| `filename` | `string` | **required** |  |
| `lang` | `string` | **required** |  |
| `hunks` | `array<{ before: string, after: string, atLine: number? }>` | **required** |  |

### `artifact-organizer/AnnotatedCode`

Code block with numbered pins linking to side annotations.

- **Children:** forbidden

| Prop | Type | Required | Notes |
|---|---|---|---|
| `lang` | `string` | **required** |  |
| `code` | `string` | **required** |  |
| `filename` | `string` | optional |  |
| `annotations` | `array<any>` | **required** |  |
| `pinStyle` | `"numbered" | "lettered"` | optional | default: `"numbered"` |

## Diagrams

### `artifact-organizer/Mermaid`

Mermaid.js diagram wrapper with zoom/pan.

- **Children:** forbidden

| Prop | Type | Required | Notes |
|---|---|---|---|
| `kind` | `"flowchart" | "sequence" | "er" | "state" | "mindmap" | "class"` | **required** |  |
| `source` | `string` | **required** |  |
| `direction` | `"TD" | "LR"` | optional |  |

### `artifact-organizer/Sequence`

Native SVG sequence diagram, Artifact Organizer-styled. Prefer over Mermaid 'sequence' when you want consistent design and no external CDN.

- **Children:** forbidden

| Prop | Type | Required | Notes |
|---|---|---|---|
| `participants` | `array<{ id: string, title: string, subtitle: string? }>` | **required** |  |
| `messages` | `array<{ from: string?, to: string?, text: string, kind: "sync" | "async" | "return" | "self" | "note"?, over: array<string>? }>` | **required** |  |

### `artifact-organizer/ArchitectureGrid`

Card-based architecture with SVG connectors.

- **Children:** forbidden

| Prop | Type | Required | Notes |
|---|---|---|---|
| `nodes` | `array<{ id: string, title: string, description: string?, icon: string?, tag: string? }>` | **required** |  |
| `edges` | `array<{ from: string, to: string, label: string?, style: "data" | "control" | "dep"? }>` | optional |  |
| `layout` | `"grid" | "columns" | "layers"` | **required** |  |
| `groups` | `array<{ id: string, title: string, nodeIds: array<string> }>` | optional |  |

### `artifact-organizer/FlowChart`

Native SVG directed graph. Ranked layout (TD or LR) — caller provides `ranks` (array of arrays of node ids) so no layout solver is needed. Prefer over Mermaid flowchart for simple pipelines with consistent design.

- **Children:** forbidden

| Prop | Type | Required | Notes |
|---|---|---|---|
| `layout` | `"TD" | "LR"` | **required** |  |
| `nodes` | `array<{ id: string, label: string, shape: "box" | "pill" | "diamond"?, tag: string? }>` | **required** |  |
| `edges` | `array<{ from: string, to: string, label: string? }>` | **required** |  |
| `ranks` | `array<array<string>>` | **required** |  |

### `artifact-organizer/Quadrant`

2x2 prioritization matrix with plotted points.

- **Children:** forbidden

| Prop | Type | Required | Notes |
|---|---|---|---|
| `xLabel` | `string` | **required** |  |
| `yLabel` | `string` | **required** |  |
| `quadrants` | `array<{ id: string, title: string, description: string? }>` | **required** |  |
| `points` | `array<{ label: string, x: number, y: number, tag: string?, tone: "accent" | "muted" | "success" | "warn"? }>` | optional |  |

### `artifact-organizer/Swimlane`

Lane-based process diagram laid out on a shared timeline.

- **Children:** forbidden

| Prop | Type | Required | Notes |
|---|---|---|---|
| `lanes` | `array<{ id: string, title: string, subtitle: string? }>` | **required** |  |
| `steps` | `array<{ id: string, lane: string, title: string, description: string?, tag: string? }>` | **required** |  |
| `edges` | `array<{ from: string, to: string, label: string? }>` | optional |  |

### `artifact-organizer/ERDDiagram`

Entity-relationship diagram — DB/type schemas with pk/fk/nullable markers and cardinality links.

- **Children:** forbidden

| Prop | Type | Required | Notes |
|---|---|---|---|
| `entities` | `array<any>` | **required** |  |
| `relationships` | `array<any>` | **required** |  |
| `layout` | `"grid" | "columns"` | optional | default: `"grid"` |

## Data

### `artifact-organizer/DataTable`

Semantic HTML table.

- **Children:** forbidden

| Prop | Type | Required | Notes |
|---|---|---|---|
| `columns` | `array<{ key: string, label: string, align: "left" | "center" | "right"?, wrap: boolean? }>` | **required** |  |
| `rows` | `array<object>` | **required** |  |
| `caption` | `string` | optional |  |
| `footer` | `object` | optional |  |
| `density` | `"compact" | "standard"` | optional |  |

### `artifact-organizer/Chart`

Chart.js wrapper.

- **Children:** forbidden

| Prop | Type | Required | Notes |
|---|---|---|---|
| `kind` | `"line" | "bar" | "pie" | "area" | "scatter"` | **required** |  |
| `data` | `{ labels: array<string>, series: array<{ name: string, values: array<number> }> }` | **required** |  |
| `xLabel` | `string` | optional |  |
| `yLabel` | `string` | optional |  |
| `unit` | `string` | optional |  |

### `artifact-organizer/Comparison`

N-way comparison layout.

- **Children:** forbidden

| Prop | Type | Required | Notes |
|---|---|---|---|
| `items` | `array<{ title: string, subtitle: string?, bullets: array<string>, verdict: { label: string, tone: string }? }>` | **required** |  |
| `mode` | `"vs" | "grid"` | **required** |  |

## Narrative

### `artifact-organizer/StepList`

Ordered steps / checklist.

- **Children:** forbidden

| Prop | Type | Required | Notes |
|---|---|---|---|
| `steps` | `array<{ title: string, body: string, state: "done" | "doing" | "todo" | "skipped"? }>` | **required** |  |
| `numbered` | `boolean` | optional | default: `true` |

## Other

### `artifact-organizer/ProjectTile`

Portfolio project tile — image + categories + title + optional client/year. Hover lift + image zoom on link variant. Use inside MosaicGrid for varied tile sizing, or in normal flow with intrinsic aspect.

- **Children:** forbidden

| Prop | Type | Required | Notes |
|---|---|---|---|
| `title` | `string` | **required** |  |
| `image` | `string` | optional |  |
| `categories` | `array<string>` | optional |  |
| `client` | `string` | optional |  |
| `year` | `string` | optional |  |
| `href` | `string` | optional |  |
| `aspect` | `"square" | "landscape" | "portrait" | "wide"` | optional | default: `"landscape"` |
| `span` | `number` | optional |  |
| `rowSpan` | `number` | optional |  |

### `artifact-organizer/MosaicGrid`

Audi F1-inspired tile grid — CSS grid wrapper with auto-flow dense. Children (typically ProjectTile) declare span/rowSpan to create varied mosaic sizing. Collapses to 8-col @ 960px and 4-col @ 640px.

- **Children:** required

| Prop | Type | Required | Notes |
|---|---|---|---|
| `columns` | `number` | optional | default: `12` |
| `gap` | `string` | optional | default: `"1rem"` |
| `rowHeight` | `string` | optional | default: `"minmax(200px, auto)"` |
| `dense` | `boolean` | optional | default: `true` |

### `artifact-organizer/CountdownTimer`

Live-updating countdown to a target datetime. Renders 4 cells (days/hours/minutes/seconds) with pulsing status label. Switches to 'LIVE' state at target.

- **Children:** forbidden

| Prop | Type | Required | Notes |
|---|---|---|---|
| `target` | `string` | **required** |  |
| `label` | `string` | optional |  |
| `liveLabel` | `string` | optional |  |

### `artifact-organizer/SiteHeader`

Sticky site-mode header — brand wordmark + nav links + CTA pill. Use as first child of a chromeless Page.

- **Children:** forbidden

| Prop | Type | Required | Notes |
|---|---|---|---|
| `brand` | `string` | **required** |  |
| `brandHref` | `string` | optional |  |
| `links` | `array<{ label: string, href: string }>` | optional |  |
| `cta` | `{ label: string, href: string? }` | optional |  |

### `artifact-organizer/HeroCarousel`

Full-viewport-height rotating image carousel. Slides crossfade automatically; counter '1/N' and Play Reel pill overlay at bottom. Pauses on hover.

- **Children:** forbidden

| Prop | Type | Required | Notes |
|---|---|---|---|
| `slides` | `array<{ image: string, title: string?, subtitle: string? }>` | **required** |  |
| `interval` | `number` | optional | default: `5500` |
| `playReel` | `{ label: string, url: string? }` | optional |  |
| `lead` | `string` | optional |  |

### `artifact-organizer/EditorialStatement`

Massive centered editorial text block — for brand statements like 'Three unique companies under one roof'. ~70vh tall.

- **Children:** forbidden

| Prop | Type | Required | Notes |
|---|---|---|---|
| `text` | `string` | **required** |  |
| `eyebrow` | `string` | optional |  |
| `cta` | `{ label: string, href: string? }` | optional |  |

### `artifact-organizer/DivisionCard`

Vertical division card — image (4:5 portrait) + title + description + linked project list + CTA. Place 3 in a Section to recreate a Studios/Productions/Touring layout.

- **Children:** forbidden

| Prop | Type | Required | Notes |
|---|---|---|---|
| `title` | `string` | **required** |  |
| `eyebrow` | `string` | optional |  |
| `description` | `string` | optional |  |
| `image` | `string` | optional |  |
| `projects` | `array<{ label: string, href: string? }>` | optional |  |
| `cta` | `{ label: string, href: string? }` | optional |  |

### `artifact-organizer/WorkTypeRow`

Horizontal alternating row — image one side, body the other. Stacks on mobile. Use multiple in sequence with alternating align values.

- **Children:** forbidden

| Prop | Type | Required | Notes |
|---|---|---|---|
| `title` | `string` | **required** |  |
| `description` | `string` | optional |  |
| `image` | `string` | optional |  |
| `meta` | `array<string>` | optional |  |
| `align` | `"left" | "right"` | optional | default: `"left"` |
| `cta` | `{ label: string, href: string? }` | optional |  |

### `artifact-organizer/PressMentions`

Press/media credit row — eyebrow label + list of publication names with optional notes. Use between Divisions and Work sections.

- **Children:** forbidden

| Prop | Type | Required | Notes |
|---|---|---|---|
| `eyebrow` | `string` | optional |  |
| `mentions` | `array<{ name: string, note: string? }>` | **required** |  |

### `artifact-organizer/SiteFooter`

Multi-column site footer with link groups + meta + credit lines. Place as last child of a chromeless Page.

- **Children:** forbidden

| Prop | Type | Required | Notes |
|---|---|---|---|
| `columns` | `array<{ title: string, links: array<{ label: string, href: string? }>? }>` | **required** |  |
| `meta` | `string` | optional |  |
| `credit` | `string` | optional |  |

## Slide Mode Only

These components are intentionally separated from the default page-mode inventory. Use them through `/artifact-organizer:slides`, not through the default `/outprint` flow.

### `artifact-organizer/SlideDeck`

Slide container.

- **Children:** required

| Prop | Type | Required | Notes |
|---|---|---|---|
| `aspect` | `"16:9" | "4:3"` | **required** |  |
| `transition` | `"none" | "fade" | "slide"` | optional |  |
| `footer` | `string` | optional |  |
| `mode` | `"deck" | "scroll-snap" | "scroll-jack"` | optional |  |

### `artifact-organizer/Slide`

Single slide.

- **Children:** forbidden

| Prop | Type | Required | Notes |
|---|---|---|---|
| `layout` | `"title" | "content" | "two-col" | "quote" | "image" | "section"` | **required** |  |
| `title` | `string` | optional |  |
| `subtitle` | `string` | optional |  |
| `bullets` | `array<string>` | optional |  |
| `image` | `string` | optional |  |
| `quote` | `string` | optional |  |

## Rules

- `props` must contain ONLY semantic data — never colors, fonts, sizes, or layout hints.
- `children` is used for container components (Page, Section). In slide mode, `SlideDeck` owns `Slide[]`.
- Unknown component names or props are rejected at schema validation (exit 2).
- Enum values are case-sensitive.
- String patterns (e.g. Section.id) are regex-matched.
