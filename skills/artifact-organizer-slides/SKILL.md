---
name: artifact-organizer-slides
description: Generate a self-contained HTML slide deck (SlideDeck + Slides with keyboard nav) from a topic or outline. Use whenever the user asks for "slides", "a deck", "a presentation", a "walkthrough", or a 5+ step recap. Requires the `artifact-organizer` skill to be installed (provides the renderer engine).
license: MIT
metadata:
  version: "0.5.2-alpha"
  requires: "hyperscribe"
---

> **Step 0 — Preference:** Before running any renderer command, perform the theme-preference resolution block from the base `artifact-organizer` skill (`~/.claude/skills/artifact-organizer/SKILL.md`, section "Step 0"). It sets `$THEME` and `$RENDERER`. If absent, this wrapper falls back to `notion` + `auto`.

# Artifact Organizer — Slides mode

Forces a `artifact-organizer/SlideDeck` root (NOT `Page`) and emits a slide-oriented HTML file via the Artifact Organizer renderer. This skill is a thin wrapper over the `artifact-organizer` skill: the envelope format and renderer contract live there, this skill adds the slide-specific rules.

## When to use

- User says "slides", "deck", "presentation", "walk me through", "recap as slides".
- You're about to produce 5+ sequential points that would benefit from pagination.
- User asks for a kickoff deck, readout, review, demo script, or training material.

Do **not** use for: single-page docs (use `hyperscribe`), diff reviews (use `hyperscribe-diff`), or linear prose.

## Rules for slide mode

1. **Root MUST be `artifact-organizer/SlideDeck`**, never `artifact-organizer/Page`. Slides don't nest inside Page.
2. `SlideDeck.children` must be an array of `artifact-organizer/Slide` objects — nothing else.
3. Pick `aspect`: `"16:9"` (default widescreen) or `"4:3"` (compact/legacy).
4. Optional `transition: "fade" | "slide"` for visual polish (deck mode only).
5. Optional `mode`: navigation/interaction style (see table below).
6. Include a `footer` with topic + date.

## Mode picker

| `mode` | Interaction | Use when |
|---|---|---|
| `"deck"` (default) | Keyboard / button nav, one slide at a time | Tech share-outs, demos, training — viewer controls pacing |
| `"scroll-snap"` | Vertical scroll-snap inside a 100vh container, IntersectionObserver-driven reveal | Mobile-friendly walkthroughs, longer decks where the reader scrolls |
| `"scroll-jack"` | Page-level scroll pinned via `position: sticky`, slides crossfade with scroll progress (Apple-style) | Impact pieces, product launches, hero storytelling |

Notes:
- `transition` is ignored in scroll-snap and scroll-jack modes (the modes own their motion).
- Both scroll modes respect `prefers-reduced-motion` and degrade to instant slide swaps.
- `scroll-jack` consumes page scroll, so reserve it for full-page decks (one deck per HTML output, no other long content below).
- Keyboard arrows + button nav still work in scroll modes (they programmatically scroll to the target slide).

## Slide layout picker

| Layout | Use when | Props |
|---|---|---|
| `title` | Opening/cover slide | `title`, `subtitle` |
| `section` | Divider between parts | `title`, `subtitle` |
| `content` | Single-topic slide with bullets | `title`, `bullets` |
| `two-col` | Comparing two related lists | `title`, `bullets` (auto-split in half) |
| `quote` | Featured quote or big statement | `quote`, `subtitle` (attribution) |
| `image` | Screenshot or visual | `title`, `image` (URL), `subtitle` (caption) |

## Typical deck structure

1. `title` — cover
2. `section` — "Context" / intro divider
3. `content` × 3–5 — each major point
4. `quote` or `image` — emphasis beat
5. `two-col` — comparison if relevant
6. `section` — "Next steps" divider
7. `content` — action items
8. `title` — closing / thank you

Aim for 5–12 slides. If the topic is huge, suggest splitting into multiple decks rather than one 40-slider.

## Envelope

```json
{
  "a2ui_version": "0.9",
  "catalog": "artifact-organizer/v1",
  "is_task_complete": true,
  "parts": [
    {
      "component": "artifact-organizer/SlideDeck",
      "props": { "aspect": "16:9", "transition": "fade", "footer": "My topic · 2026" },
      "children": [
        { "component": "artifact-organizer/Slide", "props": { "layout": "title", "title": "...", "subtitle": "..." }},
        { "component": "artifact-organizer/Slide", "props": { "layout": "content", "title": "...", "bullets": ["...", "..."] }},
        { "component": "artifact-organizer/Slide", "props": { "layout": "title", "title": "Thanks", "subtitle": "Q&A" }}
      ]
    }
  ]
}
```

## Render + open

Same workflow as the base `artifact-organizer` skill — resolve the renderer, pipe JSON, write output, open.

```bash
# Locate the artifact-organizer renderer (installed via `npx skills add keepYaoung/artifact-organizer` or plugin marketplace).
HS=$(for p in \
  ./.claude/skills/artifact-organizer ~/.claude/skills/artifact-organizer \
  ./.codex/skills/artifact-organizer ~/.codex/skills/artifact-organizer \
  ./.cursor/skills/artifact-organizer ~/.cursor/skills/artifact-organizer \
  ./.opencode/skills/artifact-organizer ~/.opencode/skills/artifact-organizer \
  ~/.claude/plugins/cache/artifact-organizer-marketplace/*/plugins/artifact-organizer
do [ -x "$p/scripts/outprint" ] && { echo "$p/scripts/outprint"; break; }; done)

if [ -z "$HS" ]; then
  echo "artifact-organizer renderer not found. Install with: npx skills add keepYaoung/artifact-organizer" >&2
  exit 1
fi

mkdir -p ~/.artifact-organizer/out
OUT=~/.artifact-organizer/out/slides-$(date +%Y%m%d-%H%M%S).html
cat <<'EOF' | "$HS" --theme "${THEME:-notion}" --renderer "${RENDERER:-auto}" --out "$OUT"
<the JSON you built>
EOF
open "$OUT"    # macOS; use xdg-open on Linux
```

## Interaction in output

- **`deck` mode (default):** users navigate with **arrow keys / space / Home / End**, or click the bottom nav buttons.
- **`scroll-snap` mode:** users scroll vertically inside the deck — each slide snaps into place. Buttons/keys still jump between slides.
- **`scroll-jack` mode:** users scroll the page — slides crossfade as they scroll. The deck pins to the viewport while it owns the scroll.

Mention the relevant interaction when reporting the path.

## Avoid

- Putting too much text on a single slide — if bullets exceed 5–6 items, split into multiple slides.
- Using `Slide` inside a `Page` (fails schema validation).
- Copying the user's document verbatim — distill the essence.
- Nesting markdown inside Slide props — `bullets` is `string[]`, plain text only.
