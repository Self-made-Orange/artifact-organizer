---
name: diff
description: Generate a visual diff review page from a git diff, PR URL, or paste. Uses CodeDiff for hunks, Callouts for risks, ArchitectureGrid for impact summary.
argument-hint: [git range | PR URL | (paste in followup)]
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

You are invoking Artifact Organizer's diff review. The user's input:

$ARGUMENTS

## Source detection

1. **Git range** (like `main..HEAD`, `HEAD~5..HEAD`, or `abc123..def456`) — run `git diff <range>` to get the unified diff.
2. **PR URL** (e.g. `https://github.com/owner/repo/pull/123`) — use `gh pr diff 123 -R owner/repo` or `gh api repos/owner/repo/pulls/123.diff`.
3. **No args or "diff"** — assume the user will paste or already has the diff in context. Ask if unclear.

## Envelope structure

```json
{
  "a2ui_version": "0.9",
  "catalog": "artifact-organizer/v1",
  "is_task_complete": true,
  "parts": [
    {
      "component": "artifact-organizer/Page",
      "props": { "title": "Diff: <short summary>", "subtitle": "<N files, +X -Y lines>", "toc": true },
      "children": [
        {
          "component": "artifact-organizer/Section",
          "props": { "id": "summary", "title": "Summary", "lead": "**What changed** and **why it matters**." },
          "children": [
            { "component": "artifact-organizer/Prose", "props": { "markdown": "One paragraph summary." } },
            { "component": "artifact-organizer/ArchitectureGrid", "props": {
              "layout": "grid",
              "nodes": [ { "id": "auth", "title": "Auth module", "tag": "modified" }, "..." ]
            }}
          ]
        },
        {
          "component": "artifact-organizer/Section",
          "props": { "id": "risks", "title": "Risks" },
          "children": [
            { "component": "artifact-organizer/Callout", "props": { "severity": "warn", "title": "Migration required", "body": "..." }}
          ]
        },
        {
          "component": "artifact-organizer/Section",
          "props": { "id": "changes", "title": "Changes" },
          "children": [
            { "component": "artifact-organizer/CodeDiff", "props": {
              "filename": "src/auth.ts",
              "lang": "ts",
              "hunks": [
                { "before": "const x = 1;", "after": "const x = 2;", "atLine": 42 }
              ]
            }}
          ]
        }
      ]
    }
  ]
}
```

## Section checklist

A solid diff review includes:

- **Summary** — 1-paragraph Prose + ArchitectureGrid of impacted modules (tag each with `modified`, `added`, `removed`)
- **Risks** — Callouts for breaking changes, migrations, perf impact, security
- **Changes** — CodeDiff per significant file. For tiny typo-level changes, aggregate into one. For big refactors, one CodeDiff per file.
- **(Optional) Testing plan** — StepList of manual verification steps
- **(Optional) Follow-ups** — bullet list of deferred work

## Callout severity guide for diff reviews

| Severity | When |
|---|---|
| `info` | Notable but benign change (e.g., "removes unused import") |
| `note` | Context the reviewer should know (e.g., "related to issue #42") |
| `warn` | Behavior change that callers should verify |
| `danger` | Breaking change, security concern, or data-loss risk |
| `success` | Celebratory / positive note (new test coverage, perf win) |

## Render

Same bash flow as other commands — pipe JSON to the hyperscribe CLI, write to `~/.artifact-organizer/out/diff-<slug>.html`, `open` it.

```bash
mkdir -p ~/.artifact-organizer/out
OUT=~/.artifact-organizer/out/diff-$(date +%Y%m%d-%H%M%S).html
MODE_FLAG=""
[ "$MODE" = "light" ] && MODE_FLAG="--mode light"
[ "$MODE" = "dark" ]  && MODE_FLAG="--mode dark"

cat <<'EOF' | ~/.claude/plugins/cache/artifact-organizer-marketplace/*/plugins/artifact-organizer/scripts/outprint --theme "$THEME" $MODE_FLAG --out "$OUT"
<the JSON you built>
EOF
open "$OUT"
```

## Avoid

- Dumping the raw diff into one giant CodeBlock — use CodeDiff per file so the before/after lanes render correctly
- Inventing risks that aren't supported by the diff content
- Using Mermaid for diff visualization unless the diff itself restructures a flow (in which case, one before-diagram / one after-diagram side by side via ArchitectureGrid with groups)
