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
    // Keep the Page's own header so its title renders in-flow at the top of the
    // document (above the first section). The lede is hidden via canvas CSS.
    const page = doc.parts[0];
    return { content: page, title: page.props?.title };
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
export function stack(store, { content, title, date, description, agent, topic, theme, mode, author, email, source }) {
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
      source: store.meta?.source,        // keep the demoted doc's archived original
      content: store.featured,
    });
  }
  // Each stacked artifact is a NEW item — its title/date/description must not
  // inherit the artifact it just displaced (that one moved into history).
  next.meta.title = title || "Untitled";
  next.meta.date = date ?? undefined;
  next.meta.description = description ?? undefined;
  next.meta.source = source ?? undefined;  // relative path to this doc's archived original HTML
  if (agent) next.meta.agent = agent;
  if (topic) next.meta.topic = topic;
  if (theme) next.meta.theme = theme;
  if (mode) next.meta.mode = mode;
  if (author || email) {
    next.meta.author = { ...(store.meta && store.meta.author) };
    if (author) next.meta.author.name = author;
    if (email) next.meta.author.email = email;
  }
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

/** Filesystem-safe slug (keeps ascii + Hangul), for naming archived originals. */
function slugify(s) {
  return String(s || "document").toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-+|-+$/g, "") || "document";
}

/**
 * Read an artifact path. Returns a tagged result:
 *   { envelope }            — a semantic JSON envelope (JSON file, or HTML with sidecar)
 *   { rawHtml, htmlTitle }  — a raw HTML file, ONLY when `force.embed` is set
 *
 * The organizer's whole point is to weave artifacts into one native site in the
 * chosen theme, so a raw HTML file is NOT auto-embedded: the caller is expected
 * to rebuild it as native components first (stripping the source's own styling).
 * `--embed` is the explicit opt-out that keeps an artifact verbatim in an iframe.
 */
function readArtifact(addPath, force = {}) {
  // "-" reads the artifact from stdin — no local file needed. Handy for HTML you
  // have in hand: `printf '%s' "$html" | organize --add - --embed`. Without
  // --embed, stdin must be a JSON envelope.
  if (addPath === "-") {
    const raw = readFileSync(0, "utf8");
    if (force.embed) return { rawHtml: raw, htmlTitle: htmlTitle(raw) };
    try {
      return { envelope: JSON.parse(raw) };
    } catch {
      throw new Error("stdin is not a JSON envelope. Add --embed to embed it as raw HTML, or pipe a rebuilt envelope.");
    }
  }
  const isHtml = /\.html?$/i.test(addPath);
  if (isHtml) {
    const sidecar = addPath.replace(/\.html?$/i, "") + ".json";
    if (force.embed) {
      const rawHtml = readFileSync(addPath, "utf8");
      return { rawHtml, htmlTitle: htmlTitle(rawHtml) };
    }
    if (existsSync(sidecar)) {
      // Use the semantic sidecar to render, but keep the original .html to archive.
      return { envelope: JSON.parse(readFileSync(sidecar, "utf8")), originalHtml: readFileSync(addPath, "utf8") };
    }
    throw new Error(
      `"${basename(addPath)}" is raw HTML with no semantic envelope. The organizer ` +
      `re-renders artifacts in the chosen theme, so rebuild this as native components ` +
      `first (strip the source's own styling) and --add that JSON. To keep it verbatim ` +
      `in an isolated iframe instead, pass --embed.`
    );
  }
  return { envelope: JSON.parse(readFileSync(addPath, "utf8")) };
}

function parseArgs(argv) {
  const a = { store: null, add: null, title: null, date: null, description: null,
              theme: null, mode: null, agent: null, topic: null, author: null, email: null, out: null, initTitle: null,
              source: null, noSource: false, embed: false, quiet: false };
  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case "--store": a.store = argv[++i]; break;
      case "--add": a.add = argv[++i]; break;
      case "--source": a.source = argv[++i]; break;
      case "--no-source": a.noSource = true; break;
      case "--embed": a.embed = true; break;
      case "--title": a.title = argv[++i]; break;
      case "--date": a.date = argv[++i]; break;
      case "--description": a.description = argv[++i]; break;
      case "--theme": a.theme = argv[++i]; break;
      case "--mode": a.mode = argv[++i]; break;
      case "--agent": a.agent = argv[++i]; break;
      case "--topic": a.topic = argv[++i]; break;
      case "--author": a.author = argv[++i]; break;
      case "--email": a.email = argv[++i]; break;
      case "--out": a.out = argv[++i]; break;
      case "--init-title": a.initTitle = argv[++i]; break;
      case "--quiet": a.quiet = true; break;
      case "--help":
        console.log(`Usage: organize --store <canvas.json> --add <artifact.json|.html> [options]

Options:
  --store <path>        Persistent canvas JSON (created if missing) [required]
  --add <path|->        Artifact to stack: a JSON envelope, an HTML file, or "-" to read from stdin [required]
  --embed               Embed the artifact verbatim (iframe); with "-" embeds stdin HTML without a file
  --source <path|->     Original HTML to archive in <store>-sources/ (auto-kept for HTML/--embed adds)
  --no-source           Don't archive the original HTML
  --title <s>           Title for the stacked artifact (else taken from the envelope)
  --date <s>            Date label for the artifact (default: today)
  --description <s>     Subtitle shown under the featured slide title
  --theme <name>        notion|linear|vercel|stripe|supabase|apple|tailwind (sticks to the store)
  --mode <light|dark>   Initial color mode of the canvas (default dark; use light for light artifacts)
  --agent <s>           Agent name shown on every slide
  --topic <s>           Topic badge shown on every slide
  --author <name>       Footer nickname (persists on the store)
  --email <email>       Footer email (persists on the store)
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

  // Archive the original artifact HTML next to the store, so the source is kept
  // even though the deck re-renders a native rebuild. Available whenever the add
  // carried HTML (embed / stdin / sidecar) or an explicit --source was given.
  let sourceRel;
  let originalHtml;
  if (args.source) {
    try { originalHtml = args.source === "-" ? readFileSync(0, "utf8") : readFileSync(resolve(args.source), "utf8"); }
    catch (e) { console.error(`--source: ${e.message}`); process.exit(3); }
  } else if (added.rawHtml !== undefined) {
    originalHtml = added.rawHtml;
  } else if (added.originalHtml !== undefined) {
    originalHtml = added.originalHtml;
  }
  if (originalHtml !== undefined && !args.noSource) {
    const storeBase = basename(storeAbs).replace(/\.json$/i, "");
    const sourcesDir = resolve(dirname(storeAbs), `${storeBase}-sources`);
    const slug = slugify(args.title || derivedTitle);
    try {
      mkdirSync(sourcesDir, { recursive: true });
      let file = `${slug}.html`;
      for (let n = 2; existsSync(resolve(sourcesDir, file)); n++) file = `${slug}-${n}.html`;
      writeFileSync(resolve(sourcesDir, file), originalHtml, "utf8");
      sourceRel = `${storeBase}-sources/${file}`;
    } catch (e) { console.error(`IO error (source archive): ${e.message}`); process.exit(3); }
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
    mode: args.mode,
    author: args.author,
    email: args.email,
    source: sourceRel,
  });

  let html;
  try {
    html = renderCanvas(store, REGISTRY, {
      theme: args.theme || store.meta?.theme,
      mode: args.mode || store.meta?.mode,
    });
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
    if (sourceRel) console.log(`  source kept → ${resolve(dirname(storeAbs), sourceRel)}`);
  }
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) main();
