#!/usr/bin/env node
/**
 * Artifact Organizer — stack artifacts into one persistent, themed canvas.
 *
 * Each run takes ONE artifact and pushes it onto a canvas store: the new
 * artifact becomes the featured slide, the previous featured demotes into the
 * history feed (newest-first). Re-renders the whole canvas as a single
 * self-contained HTML file in the chosen theme.
 *
 *   node organize.mjs --store deck.json --add report.json --title "March" \
 *                     --theme apple --out deck.html
 *
 * `--add` accepts a semantic envelope — never raw HTML. Supported shapes:
 *   - page envelope  ({ parts: [Page,...] })      → the Page node is embedded
 *   - canvas envelope ({ featured, ... })          → its featured node is taken
 *   - a single component node ({ component, props })
 *   - an HTML file with a sibling `.json` sidecar  → the sidecar is read
 *
 * The "no raw HTML" rule is deliberate: the renderer never parses HTML. When an
 * artifact only exists as HTML, the calling skill (the model) is responsible
 * for handing over the semantic envelope — extraction is a model job, not a
 * code job.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, resolve, basename } from "node:path";
import { renderCanvas } from "./canvas.mjs";
import { REGISTRY } from "./render.mjs";
import { normalizeEnvelope } from "./lib/schema.mjs";

const VALID_THEMES = new Set(["notion", "linear", "vercel", "stripe", "supabase", "apple", "tailwind"]);

/** Build an empty canvas store. */
export function emptyStore(title = "Artifact Organizer") {
  return { template: "canvas", meta: { title }, featured: null, history: [] };
}

/**
 * Pull a renderable content node + a title out of an added artifact envelope.
 * Returns { content, title } or throws a helpful error.
 */
export function extractArtifact(doc) {
  doc = normalizeEnvelope(doc);
  if (doc && Array.isArray(doc.parts) && doc.parts[0]) {
    const page = doc.parts[0];
    // The canvas slide already shows the artifact's title, so embed the Page
    // chromeless — otherwise its <header><h1> duplicates the slide title.
    const content = { ...page, props: { ...(page.props || {}), chromeless: true } };
    return { content, title: page.props?.title };
  }
  if (doc && doc.featured) {
    return { content: doc.featured, title: doc.meta?.title };
  }
  if (doc && typeof doc.component === "string") {
    // normalizeEnvelope only walks parts/featured/history — wrap the bare node
    // so its legacy prefix (and any children) get normalized too.
    const content = normalizeEnvelope({ featured: doc }).featured;
    return { content, title: doc.props?.title };
  }
  throw new Error(
    "Unrecognized artifact shape. Expected a page envelope (parts[]), a canvas " +
    "envelope (featured), or a single component node ({component, props})."
  );
}

/**
 * Stack one artifact onto a store (pure — returns a new store object).
 * The previous featured demotes to the front of history.
 */
export function stack(store, { content, title, date, description, agent, topic, theme }) {
  const next = {
    template: "canvas",
    meta: { ...(store.meta || {}) },
    featured: content,
    history: Array.isArray(store.history) ? [...store.history] : [],
  };
  if (store.featured) {
    next.history.unshift({
      title: store.meta?.title,
      date: store.meta?.date,
      description: store.meta?.description,
      content: store.featured,
    });
  }
  // Each stacked artifact is a NEW item — its title/date/description must not
  // inherit the artifact it just displaced (that one moved into history).
  next.meta.title = title || "Untitled";
  next.meta.date = date ?? undefined;
  next.meta.description = description ?? undefined;
  if (agent) next.meta.agent = agent;
  if (topic) next.meta.topic = topic;
  if (theme) next.meta.theme = theme;
  return next;
}

/** A content node that embeds a raw HTML artifact verbatim (iframe srcdoc). */
export function embedNode(html, title) {
  const props = { html };
  if (title) props.title = title;
  return { component: "artifact-organizer/Embed", props };
}

/** Pull a human title out of raw HTML's <title> (metadata only, not parsing for render). */
function htmlTitle(html) {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? m[1].trim() : undefined;
}

/**
 * Read an artifact path. Returns a tagged result:
 *   { envelope }            — a semantic JSON envelope (JSON file, or HTML with sidecar)
 *   { rawHtml, htmlTitle }  — a raw HTML file with no sidecar (embed as-is)
 *
 * With `force.embed`, an HTML file is always embedded as-is even if a sidecar
 * exists (the "stack it verbatim" path).
 */
function readArtifact(addPath, force = {}) {
  const isHtml = /\.html?$/i.test(addPath);
  if (isHtml) {
    const sidecar = addPath.replace(/\.html?$/i, "") + ".json";
    if (!force.embed && existsSync(sidecar)) {
      return { envelope: JSON.parse(readFileSync(sidecar, "utf8")) };
    }
    const rawHtml = readFileSync(addPath, "utf8");
    return { rawHtml, htmlTitle: htmlTitle(rawHtml) };
  }
  return { envelope: JSON.parse(readFileSync(addPath, "utf8")) };
}

function parseArgs(argv) {
  const a = { store: null, add: null, title: null, date: null, description: null,
              theme: null, agent: null, topic: null, out: null, initTitle: null,
              embed: false, quiet: false };
  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case "--store": a.store = argv[++i]; break;
      case "--add": a.add = argv[++i]; break;
      case "--embed": a.embed = true; break;
      case "--title": a.title = argv[++i]; break;
      case "--date": a.date = argv[++i]; break;
      case "--description": a.description = argv[++i]; break;
      case "--theme": a.theme = argv[++i]; break;
      case "--agent": a.agent = argv[++i]; break;
      case "--topic": a.topic = argv[++i]; break;
      case "--out": a.out = argv[++i]; break;
      case "--init-title": a.initTitle = argv[++i]; break;
      case "--quiet": a.quiet = true; break;
      case "--help":
        console.log(`Usage: organize --store <canvas.json> --add <artifact.json|.html> [options]

Options:
  --store <path>        Persistent canvas JSON (created if missing) [required]
  --add <path>          Artifact to stack: JSON envelope, or HTML (sidecar .json if present, else embedded as-is) [required]
  --embed               Force-embed an HTML file verbatim (iframe), ignoring any sidecar
  --title <s>           Title for the stacked artifact (else taken from the envelope)
  --date <s>            Date label for the artifact (default: today)
  --description <s>     Subtitle shown under the featured slide title
  --theme <name>        notion|linear|vercel|stripe|supabase|apple|tailwind (sticks to the store)
  --agent <s>           Agent name shown on every slide
  --topic <s>           Topic badge shown on every slide
  --out <path>          Rendered HTML (default: <store>.html)
  --init-title <s>      Title for a freshly created store
  --quiet               Suppress the output path log`);
        process.exit(0);
    }
  }
  return a;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.store) { console.error("Missing --store <canvas.json>"); process.exit(2); }
  if (!args.add)   { console.error("Missing --add <artifact>"); process.exit(2); }
  if (args.theme && !VALID_THEMES.has(args.theme)) {
    console.error(`Invalid --theme "${args.theme}". Allowed: ${[...VALID_THEMES].join("|")}`);
    process.exit(2);
  }

  const storeAbs = resolve(args.store);
  let store = existsSync(storeAbs)
    ? JSON.parse(readFileSync(storeAbs, "utf8"))
    : emptyStore(args.initTitle || "Artifact Organizer");

  let added;
  try {
    added = readArtifact(args.add, { embed: args.embed });
  } catch (e) { console.error(e.message); process.exit(3); }

  // Raw HTML with no sidecar (or forced via --embed) → stack it verbatim.
  // A semantic envelope → pull out its content node.
  let content, derivedTitle;
  if (added.rawHtml !== undefined) {
    content = embedNode(added.rawHtml, args.title || added.htmlTitle);
    derivedTitle = added.htmlTitle;
  } else {
    try {
      const extracted = extractArtifact(added.envelope);
      content = extracted.content;
      derivedTitle = extracted.title;
    } catch (e) { console.error(e.message); process.exit(2); }
  }

  const today = new Date().toISOString().slice(0, 10);
  store = stack(store, {
    content,
    title: args.title || derivedTitle,
    date: args.date || today,
    description: args.description,
    agent: args.agent,
    topic: args.topic,
    theme: args.theme,
  });

  let html;
  try {
    html = renderCanvas(store, REGISTRY, { theme: args.theme || store.meta?.theme });
  } catch (e) { console.error(`Render error: ${e.stack || e.message}`); process.exit(4); }

  const outAbs = resolve(args.out || storeAbs.replace(/\.json$/i, "") + ".html");
  try {
    mkdirSync(dirname(storeAbs), { recursive: true });
    writeFileSync(storeAbs, JSON.stringify(store, null, 2) + "\n", "utf8");
    mkdirSync(dirname(outAbs), { recursive: true });
    writeFileSync(outAbs, html, "utf8");
  } catch (e) { console.error(`IO error: ${e.message}`); process.exit(3); }

  if (!args.quiet) {
    const n = 1 + (store.history?.length || 0);
    console.log(`${outAbs}  (${n} artifact${n === 1 ? "" : "s"} stacked)`);
  }
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) main();
