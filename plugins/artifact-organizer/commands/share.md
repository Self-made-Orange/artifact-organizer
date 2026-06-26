---
name: share
description: Deploy a Artifact Organizer-generated HTML file to Vercel and get a shareable public URL. Requires the vercel CLI to be installed and authenticated.
argument-hint: <path to .html file (defaults to most recent)>
---

You are deploying a Artifact Organizer output page publicly. User input:

$ARGUMENTS

## Resolve the HTML path

1. **Explicit path given**: use it directly (verify it exists).
2. **"last" or no args**: find the most recent `.html` file under `~/.artifact-organizer/out/`:

   ```bash
   HTML=$(ls -1t ~/.artifact-organizer/out/*.html 2>/dev/null | head -1)
   ```

   If no output files exist, ask the user to generate one first with `/outprint` and try again.

## Deploy

Invoke the share script:

```bash
SHARE=~/.claude/plugins/cache/artifact-organizer-marketplace/*/plugins/artifact-organizer/scripts/share.sh
bash $SHARE "$HTML"
```

On success, the script prints `Deployed: https://<id>.vercel.app`.

## Preconditions the script enforces

- `vercel` CLI must be installed on PATH. If not, the script exits 127 with install instructions (`npm i -g vercel`).
- The path must point to an existing file.

## Report to user

After successful deploy, tell the user:
- The live URL
- That the page is `cleanUrls: true` on Vercel's edge network
- That they can re-deploy by running `/artifact-organizer:share` again (a new URL is issued each time)

## Failure modes

| Symptom | Likely cause | Fix |
|---|---|---|
| exit 127 | vercel CLI missing | `npm i -g vercel` then `vercel login` |
| exit 2 | path missing/invalid | Check `~/.artifact-organizer/out/` exists |
| exit 1 | deploy ran but no URL matched | Read the full deploy log (path in stderr) |

## Avoid

- Deploying output files that contain sensitive information (e.g., API keys in a dashboard) — warn the user when the HTML contains patterns that look like secrets.
- Running `vercel login` inside the command — that is interactive and should be done by the user beforehand.
