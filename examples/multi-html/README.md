# Multi-HTML example

Canvas hub (`index.html`) linked to three individual page-mode reports.

```
index.html              ← canvas hub — division cards link to each report
01-q1-launch.html       ← Q1 launch report  (KPICard · Chart · StepList)
02-april-growth.html    ← April growth      (KPICard · Chart · DataTable)
03-week18-team.html     ← Week 18 team sync (Callout · StepList)
```

Each sub-page has a sticky **← All Reports** bar that links back to `index.html`.

---

## Build

Render all JSON → HTML from the repo root:

```bash
bash examples/multi-html/build.sh

# change theme
THEME=linear bash examples/multi-html/build.sh
```

---

## Open locally (no server needed)

```bash
open examples/multi-html/index.html   # macOS
xdg-open examples/multi-html/index.html  # Linux
```

---

## Share via tunnel (no hosting required)

```bash
# Terminal 1 — static file server
cd examples/multi-html
npx serve .
# → http://localhost:3000

# Terminal 2 — public tunnel
npx cloudflared tunnel --url http://localhost:3000
# → https://xxxx.trycloudflare.com  (share this URL)

# alternative tunnel
ngrok http 3000
```

---

## Add a new report

1. Write a page-mode JSON (e.g. `04-may-update.json`) with `backHref: "index.html"`.
2. Render it: `node plugins/artifact-organizer/scripts/render.mjs --in 04-may-update.json --out examples/multi-html/04-may-update.html`
3. Add it to the top of `history[]` in `index.json`:
   ```json
   { "title": "May Update", "href": "04-may-update.html", "date": "2026-05-31", ... }
   ```
4. Re-render the hub: `node plugins/artifact-organizer/scripts/render.mjs --in examples/multi-html/index.json --out examples/multi-html/index.html`
