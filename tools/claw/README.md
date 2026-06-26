# claw / hyperscribe wrapper tooling

Slack/agent-side helpers for invoking `artifact-organizer` from the claw bot.

## Files

- `outprint-render` — wrapper that calls `plugins/artifact-organizer/scripts/render.mjs`
- `canvas-wrap.py` — auto-converts general envelope (`parts[]`) to canvas template

## Wrapper behaviors (on top of vanilla `render.mjs`)

1. **Force `--theme` / `--mode` defaults** when LLM drops them.
2. **Envelope diversity check** — rejects flat prose-only envelopes (Section + Prose only). Pass `--allow-prose-only` to skip.
3. **Optional canvas-wrap** — pass `--canvas-wrap` to convert a general envelope (`a2ui_version` + `parts[Page]`) into a canvas template (`featured` = `Page.children[0]`, `history[]` = `Page.children[1..]`). **Off by default**: page envelopes render as page mode so the caller's intent is honored. Skipped for site-mode (SiteHeader / etc.) and slide-mode (SlideDeck) envelopes even when the flag is set.

## Install (user-local)

    ln -s "$(pwd)/tools/claw/outprint-render" ~/.local/bin/outprint-render
    chmod +x tools/claw/canvas-wrap.py
    export HYPERSCRIBE_REPO="$(pwd)"

## Env

| var | default | purpose |
|---|---|---|
| HYPERSCRIBE_REPO | ~/src/artifact-organizer | this checkout |
| CLAW_HYPERSCRIBE_THEME | notion | default theme when caller drops --theme |
| CLAW_HYPERSCRIBE_MODE | auto | default mode when caller drops --mode |

## Flags (claw-only, not forwarded)

- `--allow-prose-only` — skip diversity check
- `--canvas-wrap` — convert page envelope to canvas template (opt-in; default is page mode pass-through)

## Origin

Forked from claw bot wrapper (2026-04-30). Wrapper lives at `~/.local/bin/outprint-render` in the bot's runtime; this directory tracks it as part of artifact-organizer so the canvas-wrap behavior travels with the source.
