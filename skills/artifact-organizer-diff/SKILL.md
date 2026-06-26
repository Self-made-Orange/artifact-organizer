---
name: artifact-organizer-diff
description: Generate a visual diff review page (ArchitectureGrid for impacted modules + CodeDiff for hunks + Callouts for risks) from a git range, PR URL, or pasted diff. Use whenever the user asks for a PR review, diff summary, change impact analysis, or pastes `git diff` output. Requires the `artifact-organizer` skill (renderer engine).
license: MIT
metadata:
  version: "0.5.2-alpha"
  requires: "hyperscribe"
---

> **Step 0 — Preference:** Before running any renderer command, perform the theme-preference resolution block from the base `artifact-organizer` skill (`~/.claude/skills/artifact-organizer/SKILL.md`, section "Step 0"). It sets `$THEME` and `$RENDERER`. If absent, this wrapper falls back to `notion` + `auto`.

# Artifact Organizer — Diff review mode

Produces a self-contained HTML diff review using `artifact-organizer/CodeDiff`, `artifact-organizer/ArchitectureGrid` (for impacted modules), and `artifact-organizer/Callout` (for risks). Thin wrapper over the `artifact-organizer` skill.

## When to use

- User pastes a unified diff or `git diff` output and asks for review/summary.
- User gives a PR URL (`github.com/owner/repo/pull/N`) and asks for review.
- User gives a git range (`main..HEAD`, `HEAD~5..HEAD`, SHA range).
- User says "review these changes", "what changed", "impact of this diff".

Do **not** use for: generic commit history summaries (no concrete diff), feature spec writing, or rendering a single code snippet (use `hyperscribe` with `CodeBlock`).

## Source detection

1. **Git range** — run `git diff <range>` to get the unified diff.
2. **PR URL** — use `gh pr diff <N> -R owner/repo` or `gh api repos/owner/repo/pulls/<N>.diff`.
3. **Pasted diff** — use the provided text directly.
4. **No clear source** — ask the user before continuing.

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
            { "component": "artifact-organizer/Prose", "props": { "markdown": "One-paragraph summary." } },
            { "component": "artifact-organizer/ArchitectureGrid", "props": {
              "layout": "grid",
              "nodes": [ { "id": "auth", "title": "Auth module", "tag": "modified" } ]
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
              "hunks": [ { "before": "const x = 1;", "after": "const x = 2;", "atLine": 42 } ]
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

- **Summary** — 1-paragraph `Prose` + `ArchitectureGrid` of impacted modules (tag each `modified` / `added` / `removed`)
- **Risks** — `Callout`s for breaking changes, migrations, perf, security
- **Changes** — one `CodeDiff` per significant file. Aggregate tiny typo-level changes; split big refactors by file.
- **(Optional) Testing plan** — `StepList` of manual verification steps
- **(Optional) Follow-ups** — bullet list of deferred work

## Callout severity guide

| Severity | When |
|---|---|
| `info` | Notable but benign (e.g., removes unused import) |
| `note` | Context reviewer should know (e.g., related to issue #42) |
| `warn` | Behavior change callers should verify |
| `danger` | Breaking change, security concern, data-loss risk |
| `success` | Celebratory (new test coverage, perf win) |

## Render

Same as the base `artifact-organizer` skill — resolve renderer, pipe JSON, write HTML, open.

```bash
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
OUT=~/.artifact-organizer/out/diff-$(date +%Y%m%d-%H%M%S).html
cat <<'EOF' | "$HS" --theme "${THEME:-notion}" --renderer "${RENDERER:-auto}" --out "$OUT"
<the JSON you built>
EOF
open "$OUT"
```

## Avoid

- Dumping the raw diff into one giant `CodeBlock` — use `CodeDiff` per file so before/after lanes render.
- Inventing risks not supported by the diff content.
- Using `Mermaid` for diff visualization unless the diff itself restructures a flow (then: before/after `ArchitectureGrid` side by side).
