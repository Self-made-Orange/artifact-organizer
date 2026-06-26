---
name: slides
description: Generate a slide deck (SlideDeck + multiple Slides) for presentations. Uses keyboard navigation (arrow keys, Home/End).
argument-hint: <topic or outline>
---

## Step 0 — theme + renderer preference (run first, every invocation)

**When `PREF` is empty below, you MUST prompt the user for theme + renderer via `AskUserQuestion` BEFORE writing the preference file — theme options: `notion` (warm cream + Notion Blue), `linear` (dark-native + indigo), `vercel` (gallery white + Geist), `stripe` (weight-300 luxury + deep navy), `supabase` (dark-native + emerald), `apple` (SF + Apple Blue + true-black dark), `tailwind` (Inter + slate + indigo-600); renderer options: `auto` / `canvas` / `page`. Use the answer to set `THEME` and `RENDERER`. If the user skips or the tool is unavailable, fall back silently to `notion` + `auto`. Color mode is not a setting — every output inlines both light and dark; the toggle button + `prefers-color-scheme` switch them at view time.**

```bash
PREF=""
for p in ./.artifact-organizer/preference.md ~/.artifact-organizer/preference.md; do
  [ -f "$p" ] && { PREF="$p"; break; }
done

if [ -z "$PREF" ]; then
  # See the instruction above — populate from AskUserQuestion or fall back.
  THEME=notion; RENDERER=auto
  mkdir -p ~/.artifact-organizer; PREF=~/.artifact-organizer/preference.md
  printf -- '---\ntheme: %s\nrenderer: %s\ncreated_at: %s\n---\n' \
    "$THEME" "$RENDERER" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$PREF"
fi

THEME=$(awk    -F': *' '/^theme:/{print $2; exit}'    "$PREF")
RENDERER=$(awk -F': *' '/^renderer:/{print $2; exit}' "$PREF")
[ -z "$THEME" ]    && THEME=notion
[ -z "$RENDERER" ] && RENDERER=auto
```

You are invoking Artifact Organizer's slide-deck mode. The user asked for slides about:

$ARGUMENTS

## Rules for slide mode

1. **Root MUST be `artifact-organizer/SlideDeck`.** NOT Page. Slides never nest inside Page.
2. SlideDeck's `children` must be an array of `artifact-organizer/Slide` objects — nothing else.
3. Choose `aspect`: `"16:9"` (default for widescreen) or `"4:3"` (compact/legacy).
4. Optional `transition: "fade" | "slide"` for visual polish (deck mode only).
5. Optional `mode`: `"deck"` (default — keyboard nav, one slide at a time), `"scroll-snap"` (vertical scroll-snap inside a 100vh viewport, reveal-on-enter), or `"scroll-jack"` (page scroll pinned via sticky, slides crossfade with scroll progress, Apple-style). Both scroll modes respect `prefers-reduced-motion`. Reserve `scroll-jack` for full-page hero decks (it consumes page scroll).
6. Include a `footer` with the topic or date.

## Slide layout picker

| Layout | Use when | Props used |
|---|---|---|
| `title` | Opening/cover slide | title, subtitle |
| `section` | Divider between major parts | title, subtitle |
| `content` | Single-topic slide with bullets | title, bullets |
| `two-col` | Comparing two related lists | title, bullets (auto-split in half) |
| `quote` | Featured quote or big statement | quote, subtitle (attribution) |
| `image` | Screenshot or visual | title, image (URL), subtitle (caption) |

## Typical deck structure

1. `title` — deck cover
2. `section` — "Context" / intro divider
3. `content` × 3-5 — each major point
4. `quote` or `image` — emphasis beat
5. `two-col` — comparison if relevant
6. `section` — "Next steps" divider
7. `content` — action items
8. `title` — closing / thank you

Aim for 5-12 slides for most topics. If the topic is huge, suggest splitting into multiple decks rather than one 40-slider.

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
        /* ... more slides ... */
        { "component": "artifact-organizer/Slide", "props": { "layout": "title", "title": "Thanks", "subtitle": "Q&A" }}
      ]
    }
  ]
}
```

## Render + open

Same workflow as `/outprint` — pipe the JSON to the CLI, write to `~/.artifact-organizer/out/<slug>.html`, then `open` it.

```bash
mkdir -p ~/.artifact-organizer/out
OUT=~/.artifact-organizer/out/slides-$(date +%Y%m%d-%H%M%S).html
MODE_FLAG=""
[ "$MODE" = "light" ] && MODE_FLAG="--mode light"
[ "$MODE" = "dark" ]  && MODE_FLAG="--mode dark"

cat <<'EOF' | ~/.claude/plugins/cache/artifact-organizer-marketplace/*/plugins/artifact-organizer/scripts/outprint --theme "$THEME" $MODE_FLAG --out "$OUT"
<the JSON you built>
EOF
open "$OUT"
```

## Interaction in output

- **`deck` mode (default):** users navigate with **arrow keys / space / Home / End**, or click the nav buttons at the bottom.
- **`scroll-snap` mode:** users scroll vertically inside the deck — each slide snaps into place. Buttons/keys still jump.
- **`scroll-jack` mode:** users scroll the page — the deck pins to the viewport and slides crossfade with scroll progress.

Tell the user which interaction applies.

## Avoid

- Putting too much text on a single slide — if bullets go beyond 5-6 items, split into multiple slides.
- Using Slide components inside a Page (that fails schema validation).
- Copying the user's entire document verbatim — distill the essence.
- Nesting markdown inside Slide props — props are plain text (bullets is `string[]`, not markdown).
