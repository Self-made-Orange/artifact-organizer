# artifact-organizer

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node >= 20](https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg)](https://nodejs.org/)
[![Claude Code plugin](https://img.shields.io/badge/claude--code-plugin-6E56CF.svg)](https://docs.claude.com/en/docs/claude-code)

**A home for the artifacts your agent makes.** Attach it to an agent (Claude, Codex, Cursor, …) and it turns the agent's output into a self-contained, themed HTML file — then stacks those files into one persistent, restyleable dashboard.

---

## Why

Agents produce useful artifacts — reports, diagrams, dashboards — but they're throwaway: scattered across chats, lost between runs, and painful to render because **LLMs are bad at raw HTML** (token-heavy, inconsistent, one stray `</div>` breaks everything).

artifact-organizer fixes both ends:

- **The agent emits semantic JSON only** — picks components from a fixed catalog, fills in props. No HTML, no CSS, no class names.
- **The renderer owns presentation** — validates, themes, and inlines all CSS/JS/fonts into one `.html` that opens offline. No build step, no CDN.
- **The organizer keeps and stacks** — every artifact lands in one growing canvas you can browse and restyle later.

---

## What you can do

| | |
|---|---|
| 🎨 **Style** | Render any artifact as a self-contained HTML file in one of 7 themes. Swap the theme anytime — the content never changes. |
| 🗂️ **Organize** | Stack artifacts onto one persistent dashboard. Newest is featured; the rest archive into a history feed below. |

---

## Quick start

```bash
git clone https://github.com/keepYaoung/artifact-organizer.git
cd artifact-organizer

cat > /tmp/hello.json <<'EOF'
{
  "a2ui_version": "0.9",
  "catalog": "artifact-organizer/v1",
  "parts": [{
    "component": "artifact-organizer/Page",
    "props": { "title": "Deploy status" },
    "children": [
      { "component": "artifact-organizer/StepList", "props": { "steps": [
        { "title": "Run test suite",    "body": "All green.",            "state": "done"  },
        { "title": "DB migration",      "body": "Apply pending changes.", "state": "doing" },
        { "title": "Deploy to staging", "body": "Ship to staging.",       "state": "todo"  }
      ]}}
    ]
  }]
}
EOF

node plugins/artifact-organizer/scripts/render.mjs --in /tmp/hello.json --out /tmp/hello.html --theme apple
open /tmp/hello.html      # macOS — use xdg-open on Linux
```

Write semantic JSON → run the renderer → open the HTML. That's the whole loop.

**Stack it instead** — add the same artifact to a growing dashboard:

```bash
node plugins/artifact-organizer/scripts/organize.mjs \
  --store ~/.artifact-organizer/decks/work.json \
  --add /tmp/hello.json --title "Deploy status" --theme apple
```

Run it again with the next artifact and it stacks on top. You can also hand it a
raw `.html` file — `--add report.html` embeds it as-is, or rebuild it into native
components first so it adopts the theme.

---

## Install

In practice you don't run the CLI by hand — you install it as an agent skill and just ask in natural language ("make a diagram", "restyle this in tailwind", "add this to my dashboard").

**Claude Code**

```
/plugin marketplace add keepYaoung/artifact-organizer
/plugin install artifact-organizer@artifact-organizer-marketplace
```

**Any agent (Codex, Cursor, Gemini CLI, …)**

```bash
npx skills add keepYaoung/artifact-organizer
```

This installs two skills: **`artifact-organizer`** (generate + stack) and **`artifact-styler`** (restyle in any theme).

---

## Themes

7 bundled themes, light + dark inlined into every output (toggle at view time):

`notion` · `linear` · `vercel` · `stripe` · `supabase` · `apple` · `tailwind`

```bash
--theme apple    # swap for any of the seven
```

---

## Components

36 components across structure, data, diagrams, code, narrative, slides, and canvas — `Page`, `Section`, `DataTable`, `Chart`, `Mermaid`, `FlowChart`, `Callout`, `StepList`, and more, plus `Embed` for stacking a raw HTML artifact as-is. Props carry **semantic data only**; styling props are rejected by the schema.

Full prop schemas: [`plugins/artifact-organizer/references/catalog.md`](plugins/artifact-organizer/references/catalog.md).

---

## How it works

```
agent → semantic JSON envelope → renderer → one self-contained .html
                                     │
                                     └─ organize.mjs stacks it onto a persistent canvas
```

- **Page mode** — a one-shot document (`parts[]`).
- **Canvas mode** — a persistent dashboard (`featured` + `history[]`) that the organizer grows over time.

The renderer auto-detects which from the envelope. See the skill docs in [`skills/`](skills/) for the full envelope format and authoring guidance.

---

## License

MIT — see [LICENSE](LICENSE).
