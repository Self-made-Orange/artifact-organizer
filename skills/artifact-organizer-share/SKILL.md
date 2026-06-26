---
name: artifact-organizer-share
description: Deploy a previously rendered Artifact Organizer HTML file to Vercel and return a live shareable URL. Use whenever the user asks to "share", "publish", "deploy", or "send" a Artifact Organizer output. Requires the `vercel` CLI (`npm i -g vercel`, then `vercel login`) and the `artifact-organizer` skill for the share script.
license: MIT
metadata:
  version: "0.5.2-alpha"
  requires: "hyperscribe"
---

# Artifact Organizer — Share mode

Deploys an existing `.html` file (typically from `~/.artifact-organizer/out/`) to Vercel and returns a public URL. Thin wrapper over the `artifact-organizer` skill's `scripts/share.sh`.

## When to use

- User just rendered a Artifact Organizer page and says "share this", "send me a link", "can I send this to someone".
- User explicitly asks to deploy an HTML file.
- User wants a public URL for an existing output.

Do **not** use for: generating new pages (use `hyperscribe` or `hyperscribe-slides`), deploying arbitrary sites (this only handles Artifact Organizer outputs).

## Preconditions

1. `vercel` CLI must be on PATH. If missing, the script exits 127 and tells the user: `npm i -g vercel && vercel login`.
2. An `.html` file must exist at the path you pass.
3. User should have run `vercel login` at least once (interactive — don't try to do it yourself).

## Resolve the HTML path

1. **Explicit path given** — use it (verify it exists).
2. **"last" / "just now" / no path** — find the most recent output:
   ```bash
   HTML=$(ls -1t ~/.artifact-organizer/out/*.html 2>/dev/null | head -1)
   ```
   If nothing exists, ask the user to render one first with `hyperscribe` / `hyperscribe-slides` / `hyperscribe-diff`.

## Deploy

```bash
# Locate the share script (installed alongside the hyperscribe skill).
SHARE=$(for p in \
  ./.claude/skills/artifact-organizer ~/.claude/skills/artifact-organizer \
  ./.codex/skills/artifact-organizer ~/.codex/skills/artifact-organizer \
  ./.cursor/skills/artifact-organizer ~/.cursor/skills/artifact-organizer \
  ./.opencode/skills/artifact-organizer ~/.opencode/skills/artifact-organizer \
  ~/.claude/plugins/cache/artifact-organizer-marketplace/*/plugins/artifact-organizer
do [ -f "$p/scripts/share.sh" ] && { echo "$p/scripts/share.sh"; break; }; done)

if [ -z "$SHARE" ]; then
  echo "artifact-organizer share script not found. Install with: npx skills add keepYaoung/artifact-organizer" >&2
  exit 1
fi

bash "$SHARE" "$HTML"
```

On success, the script prints `Deployed: https://<id>.vercel.app`. Extract that URL and report it back.

## Report to user

After a successful deploy, tell them:

- The live URL.
- That the page is `cleanUrls: true` on Vercel's edge network.
- That re-running this skill issues a fresh URL (old ones remain live unless deleted).

## Failure modes

| Exit | Cause | Fix |
|---|---|---|
| 127 | `vercel` CLI missing | `npm i -g vercel && vercel login` |
| 2 | path missing/invalid | Check `~/.artifact-organizer/out/` exists; render something first |
| 1 | deploy ran but no URL parsed | Read the full deploy log (path printed in stderr) |

## Avoid

- Deploying HTML containing secrets — if the content has API keys or credentials, warn the user first.
- Running `vercel login` yourself — it's interactive; the user must do it.
- Deploying files outside `~/.artifact-organizer/out/` unless the user explicitly asks.
