#!/usr/bin/env node
/**
 * publish.mjs — one-shot "massage + publish" for an artifact-organizer deck.
 *
 *   node publish.mjs --store <deck.json> [--repo <name>] [--include-sources] [--confirm]
 *
 * What it does (idempotent):
 *   1. Massage: build a <deck>-site/ folder — the rendered deck becomes index.html
 *      (GitHub Pages serves it at the root), optionally with the kept originals.
 *   2. Publish: first run creates a public repo + enables Pages; later runs just
 *      commit & push (auto-detected from the site folder's git state).
 *   3. Record the live URL + repo on the store (meta.publish) and print the URL.
 *
 * SAFE BY DEFAULT: without --confirm it is a DRY RUN — it prints the exact plan
 * and the git/gh commands it WOULD run, and touches nothing. Publishing is public
 * and outward-facing, so confirm with the user before passing --confirm.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync, cpSync } from "node:fs";
import { dirname, basename, join, resolve } from "node:path";
import { execFileSync } from "node:child_process";

/** Filesystem/repo-safe slug (ascii + Hangul). */
export function slugify(s) {
  return String(s || "deck").toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-+|-+$/g, "") || "deck";
}

/**
 * Compute a publish plan (pure: reads the filesystem to decide, but mutates
 * nothing). This is the "massage" decision — what goes where, which repo/URL,
 * and whether this is a first publish or an update.
 */
export function planPublish({ storeAbs, store = {}, htmlAbs, repo, includeSources, owner = "<owner>", hasGit = false }) {
  const dir = dirname(storeAbs);
  const baseName = basename(storeAbs).replace(/\.json$/i, "");
  const siteDir = join(dir, `${baseName}-site`);
  const sourcesDir = join(dir, `${baseName}-sources`);
  const recorded = (store.meta && store.meta.publish) || {};
  const repoName = repo || recorded.repoName || slugify(baseName);
  const mode = (hasGit || recorded.repo) ? "update" : "create";

  const copies = [{ from: htmlAbs, to: "index.html" }];
  const withSources = !!includeSources && existsSync(sourcesDir);
  if (withSources) copies.push({ from: sourcesDir, to: "sources", dir: true });

  const url = `https://${owner}.github.io/${repoName}/`;
  const commitMsg = mode === "create" ? "Publish artifact-organizer deck" : "Update artifact-organizer deck";
  const commands = mode === "create"
    ? ["git init -b main", "git add -A", `git commit -m "${commitMsg}"`,
       `gh repo create ${repoName} --public --source . --remote origin --push`,
       `gh api -X POST repos/${owner}/${repoName}/pages -f "source[branch]=main" -f "source[path]=/"`]
    : ["git add -A", `git commit -m "${commitMsg}"`, "git push"];

  return { baseName, siteDir, sourcesDir, repoName, owner, url, mode, copies, includeSources: withSources, commitMsg, branch: "main", commands };
}

/** Massage step: build the site folder (index.html [+ sources/]). Returns written paths. */
export function buildSite(plan) {
  mkdirSync(plan.siteDir, { recursive: true });
  const written = [];
  for (const c of plan.copies) {
    const dest = join(plan.siteDir, c.to);
    if (c.dir) { cpSync(c.from, dest, { recursive: true }); written.push(dest + "/"); }
    else { copyFileSync(c.from, dest); written.push(dest); }
  }
  return written;
}

function run(file, args, opts = {}) {
  return execFileSync(file, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], ...opts }).trim();
}
function tryRun(file, args, opts = {}) {
  try { return { ok: true, out: run(file, args, opts) }; }
  catch (e) { return { ok: false, err: String(e.stderr || e.message || "").trim(), code: e.status }; }
}

function parseArgs(argv) {
  const a = { store: null, repo: null, html: null, includeSources: false, confirm: false, dryRun: false, quiet: false };
  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case "--store": a.store = argv[++i]; break;
      case "--repo": a.repo = argv[++i]; break;
      case "--html": a.html = argv[++i]; break;
      case "--include-sources": a.includeSources = true; break;
      case "--confirm": a.confirm = true; break;
      case "--dry-run": a.dryRun = true; break;
      case "--quiet": a.quiet = true; break;
      case "--help":
        console.log(`Usage: publish --store <deck.json> [options]

Massage a rendered deck into a GitHub Pages site and publish it (idempotent).
SAFE BY DEFAULT: prints the plan and runs nothing unless --confirm is given.

Options:
  --store <path>        The deck store JSON (its <name>.html must already exist) [required]
  --repo <name>         Repo name to create/use (default: the deck's slug)
  --include-sources     Also publish the kept originals (<name>-sources/ → /sources)
  --confirm             Actually publish (create repo / enable Pages / push). Omit = dry run.
  --dry-run             Force a dry run even with --confirm
  --html <path>         Deck HTML to publish (default: <store>.html)
  --quiet               Only print the final URL`);
        process.exit(0);
    }
  }
  return a;
}

function printPlan(plan, { dryRun }) {
  const lines = [
    `${dryRun ? "DRY RUN — nothing will change." : "Publishing…"}`,
    ``,
    `  mode        ${plan.mode === "create" ? "first publish (create repo + enable Pages)" : "update (commit + push)"}`,
    `  repo        ${plan.repoName}`,
    `  site folder ${plan.siteDir}`,
    `  files       ${plan.copies.map(c => c.to + (c.dir ? "/" : "")).join(", ")}`,
    `  URL         ${plan.url}`,
    ``,
    `  commands ${dryRun ? "that WOULD run" : ""}:`,
    ...plan.commands.map(c => `    $ ${c}`),
  ];
  if (dryRun) lines.push(``, `  Re-run with --confirm to publish.`);
  console.error(lines.join("\n"));
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.store) { console.error("Missing --store <deck.json>"); process.exit(2); }

  const storeAbs = resolve(args.store);
  if (!existsSync(storeAbs)) { console.error(`Store not found: ${storeAbs}`); process.exit(2); }
  const store = JSON.parse(readFileSync(storeAbs, "utf8"));

  const htmlAbs = resolve(args.html || storeAbs.replace(/\.json$/i, "") + ".html");
  if (!existsSync(htmlAbs)) {
    console.error(`Rendered deck not found: ${htmlAbs}\nRender it first (organize.mjs / render.mjs), then publish.`);
    process.exit(2);
  }

  const dryRun = args.dryRun || !args.confirm;
  const siteDir = join(dirname(storeAbs), basename(storeAbs).replace(/\.json$/i, "") + "-site");
  const hasGit = existsSync(join(siteDir, ".git"));

  // Resolve the GitHub owner. Only touch gh when actually publishing.
  let owner = (store.meta && store.meta.publish && store.meta.publish.owner) || "<owner>";
  if (!dryRun) {
    if (!tryRun("gh", ["--version"]).ok) { console.error("gh CLI not found. Install it (https://cli.github.com) or publish manually."); process.exit(5); }
    if (!tryRun("gh", ["auth", "status"]).ok) { console.error("gh is not authenticated. Run: gh auth login"); process.exit(5); }
    const who = tryRun("gh", ["api", "user", "--jq", ".login"]);
    if (!who.ok) { console.error(`Could not resolve your GitHub user: ${who.err}`); process.exit(5); }
    owner = who.out;
  }

  const plan = planPublish({ storeAbs, store, htmlAbs, repo: args.repo, includeSources: args.includeSources, owner, hasGit });

  if (dryRun) { printPlan(plan, { dryRun: true }); process.exit(0); }
  if (!args.quiet) printPlan(plan, { dryRun: false });

  // ── Massage ──
  buildSite(plan);
  const cwd = plan.siteDir;

  // ── Publish (idempotent) ──
  try {
    if (plan.mode === "create") {
      run("git", ["init", "-b", "main"], { cwd });
      run("git", ["add", "-A"], { cwd });
      run("git", ["commit", "-m", plan.commitMsg], { cwd });
      run("gh", ["repo", "create", plan.repoName, "--public", "--source", ".", "--remote", "origin", "--push"], { cwd });
      const pg = tryRun("gh", ["api", "-X", "POST", `repos/${owner}/${plan.repoName}/pages`, "-f", "source[branch]=main", "-f", "source[path]=/"], { cwd });
      if (!pg.ok && !/already|409|exists/i.test(pg.err)) console.error(`Note: enabling Pages reported: ${pg.err}\nIf needed, enable it manually: Settings → Pages → branch main / root.`);
    } else {
      run("git", ["add", "-A"], { cwd });
      const dirty = run("git", ["status", "--porcelain"], { cwd });
      if (dirty) { run("git", ["commit", "-m", plan.commitMsg], { cwd }); run("git", ["push"], { cwd }); }
      else if (!args.quiet) console.error("  (no changes to push)");
    }
  } catch (e) {
    console.error(`Publish failed: ${String(e.stderr || e.message).trim()}`);
    process.exit(6);
  }

  // ── Record the live URL + repo on the store ──
  store.meta = store.meta || {};
  store.meta.publish = { repoName: plan.repoName, owner, repo: `${owner}/${plan.repoName}`, url: plan.url, branch: "main", includeSources: plan.includeSources };
  try { writeFileSync(storeAbs, JSON.stringify(store, null, 2) + "\n", "utf8"); } catch (e) { console.error(`Could not record URL on store: ${e.message}`); }

  if (args.quiet) console.log(plan.url);
  else console.error(`\n✓ Live at ${plan.url}  (Pages can take ~1 min on first publish)`);
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) main();
