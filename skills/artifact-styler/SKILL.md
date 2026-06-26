---
name: artifact-styler
description: Restyle an artifact (an Artifact Organizer HTML/JSON output, or any content you can express as a component envelope) into a chosen visual theme — notion, linear, vercel, stripe, supabase, apple, or tailwind. Use when the user says "restyle this", "make it look like apple/tailwind/stripe", "apply the X theme", "change the theme", or "give me this in our brand style". Re-renders to a single self-contained HTML file. Requires the `artifact-organizer` skill (renderer engine).
license: MIT
metadata:
  version: "0.5.2-alpha"
  compatibility: "Requires Node.js 20+ and the artifact-organizer skill"
---

# Artifact Styler

Take an existing artifact and re-render it in a **different theme**. The styler
never edits HTML by hand — it works on the *semantic envelope* and lets the
renderer own every visual decision. Theme is the only thing that changes; the
content stays identical.

## When to use

- "Restyle this in the **apple** theme" / "make it look like **tailwind**".
- "Apply our brand style to this report."
- "Same dashboard, but the **stripe** look."
- You produced an Artifact Organizer output earlier and want a themed variant.

## The 7 themes

| Theme | Character |
|---|---|
| `notion` | Warm cream, Notion Blue, reading-first (default) |
| `linear` | Dark-native, indigo, tight Inter |
| `vercel` | Gallery white, Geist, shadow-as-border |
| `stripe` | Weight-300 luxury, deep navy |
| `supabase` | Dark-native, emerald, border hierarchy |
| `apple` | SF-style, cool greys, Apple Blue, soft elevation, true-black dark |
| `tailwind` | Inter, slate ramp, indigo-600, layered shadows |

## How the input is obtained

The renderer parses **JSON envelopes, never HTML**. So:

1. **Artifact Organizer output** — every render saves a `<name>.json` envelope
   next to the `<name>.html`. Restyle by re-rendering that sidecar JSON with a
   new `--theme`. No re-extraction needed.
2. **Raw HTML with no sidecar** (e.g. a Claude chat artifact) — *you* (the
   model) read the HTML and reconstruct the semantic envelope: map each block to
   a catalog component (`Section`, `DataTable`, `Callout`, `KPICard`, `Chart`,
   `CodeBlock`, diagrams, …). Emit data only — no colors, fonts, or classes.
   This "HTML → envelope" step is a model job, by design.

See `references/catalog.md` in the `artifact-organizer` skill for prop schemas.

## How to use

1. **Locate the renderer engine** (shipped with the `artifact-organizer` skill):

   ```bash
   AO=$(for p in \
     ./.claude/skills/artifact-organizer ~/.claude/skills/artifact-organizer \
     ./.codex/skills/artifact-organizer ~/.codex/skills/artifact-organizer \
     ./.cursor/skills/artifact-organizer ~/.cursor/skills/artifact-organizer \
     ./.opencode/skills/artifact-organizer ~/.opencode/skills/artifact-organizer \
     ~/.claude/plugins/cache/artifact-organizer-marketplace/*/plugins/artifact-organizer \
     ./plugins/artifact-organizer
   do [ -x "$p/scripts/outprint" ] && { echo "$p/scripts/outprint"; break; }; done)
   ```

2. **Get the envelope.** If restyling an Artifact Organizer output, use its
   sidecar `.json`. Otherwise build the envelope from the source content.

3. **Re-render with the target theme:**

   ```bash
   mkdir -p ~/.artifact-organizer/out
   "$AO" --theme apple --out ~/.artifact-organizer/out/<slug>-apple.html < envelope.json
   ```

   `--theme` is the whole point — swap it for any of the 7 names. The renderer
   auto-detects page vs canvas from the envelope; pass `--renderer page|canvas`
   to force one.

4. **Open and report.** `open <path>` (macOS) / `xdg-open <path>` (Linux), then
   reply with the path and the theme applied.

## Rules

- Change the **theme only** — never rewrite the content while restyling.
- `props` carry semantic data exclusively. A styling request is satisfied by the
  theme, never by `color`/`fontSize`/`className` props (the schema rejects them).
- To stack restyled artifacts into one growing dashboard, hand off to the
  `artifact-organizer` skill instead.
