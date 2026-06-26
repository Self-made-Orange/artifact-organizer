import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { slugify, planPublish, buildSite } from "../plugins/artifact-organizer/scripts/publish.mjs";

const SCRIPT = fileURLToPath(new URL("../plugins/artifact-organizer/scripts/publish.mjs", import.meta.url));

function fixture() {
  const dir = mkdtempSync(join(tmpdir(), "ao-publish-"));
  writeFileSync(join(dir, "deck.json"), JSON.stringify({ template: "canvas", meta: { title: "My Deck" } }));
  writeFileSync(join(dir, "deck.html"), "<!doctype html><title>My Deck</title><h1>deck</h1>");
  return dir;
}

test("slugify: ascii + Hangul kept, rest collapsed", () => {
  assert.equal(slugify("March Growth!"), "march-growth");
  assert.equal(slugify("호주 이주 Plan B"), "호주-이주-plan-b");
  assert.equal(slugify("///"), "deck");
});

test("planPublish: first publish targets index.html + project-pages URL", () => {
  const dir = fixture();
  const plan = planPublish({ storeAbs: join(dir, "deck.json"), store: {}, htmlAbs: join(dir, "deck.html"), owner: "alice" });
  assert.equal(plan.mode, "create");
  assert.equal(plan.repoName, "deck");
  assert.equal(plan.url, "https://alice.github.io/deck/");
  assert.deepEqual(plan.copies.map(c => c.to), ["index.html"]);
  assert.ok(plan.commands.some(c => c.includes("gh repo create")));
});

test("planPublish: recorded publish → update mode, reuses repo name", () => {
  const dir = fixture();
  const store = { meta: { publish: { repoName: "my-site", owner: "alice", repo: "alice/my-site" } } };
  const plan = planPublish({ storeAbs: join(dir, "deck.json"), store, htmlAbs: join(dir, "deck.html"), owner: "alice" });
  assert.equal(plan.mode, "update");
  assert.equal(plan.repoName, "my-site");
  assert.deepEqual(plan.commands, ["git add -A", `git commit -m "Update artifact-organizer deck"`, "git push"]);
});

test("planPublish: --repo overrides, --include-sources only when the folder exists", () => {
  const dir = fixture();
  const base = { storeAbs: join(dir, "deck.json"), store: {}, htmlAbs: join(dir, "deck.html"), owner: "bob", repo: "custom" };
  assert.equal(planPublish({ ...base, includeSources: true }).includeSources, false); // no sources dir yet
  mkdirSync(join(dir, "deck-sources"));
  writeFileSync(join(dir, "deck-sources", "a.html"), "<h1>orig</h1>");
  const plan = planPublish({ ...base, includeSources: true });
  assert.equal(plan.repoName, "custom");
  assert.equal(plan.includeSources, true);
  assert.ok(plan.copies.some(c => c.to === "sources" && c.dir));
});

test("buildSite: massages deck.html → index.html (+ sources when included)", () => {
  const dir = fixture();
  mkdirSync(join(dir, "deck-sources"));
  writeFileSync(join(dir, "deck-sources", "orig-a.html"), "<h1>original A</h1>");
  const plan = planPublish({ storeAbs: join(dir, "deck.json"), store: {}, htmlAbs: join(dir, "deck.html"), owner: "alice", includeSources: true });
  buildSite(plan);
  assert.ok(existsSync(join(plan.siteDir, "index.html")));
  assert.match(readFileSync(join(plan.siteDir, "index.html"), "utf8"), /<h1>deck<\/h1>/);
  assert.ok(existsSync(join(plan.siteDir, "sources", "orig-a.html")));
});

test("CLI dry-run is the default and has NO side effects (no site dir, no git/gh)", () => {
  const dir = fixture();
  const out = execFileSync("node", [SCRIPT, "--store", join(dir, "deck.json")], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  // dry run prints the plan to stderr; stdout stays empty. Crucially: nothing built.
  assert.equal(existsSync(join(dir, "deck-site")), false);
  // the deck dir still only holds the inputs — no repo, no site folder was created
  assert.deepEqual(readdirSync(dir).sort(), ["deck.html", "deck.json"]);
  assert.equal(out, "");
});

test("CLI: missing rendered deck html → clear error, exit 2", () => {
  const dir = mkdtempSync(join(tmpdir(), "ao-publish-"));
  writeFileSync(join(dir, "deck.json"), JSON.stringify({ template: "canvas", meta: {} }));
  let code = 0, stderr = "";
  try { execFileSync("node", [SCRIPT, "--store", join(dir, "deck.json"), "--confirm"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }); }
  catch (e) { code = e.status; stderr = String(e.stderr); }
  assert.equal(code, 2);
  assert.match(stderr, /Render it first|not found/);
});
