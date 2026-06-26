import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync, existsSync, readFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  defaults,
  parsePreference,
  formatPreference,
  resolvePreferencePath,
  readPreference,
  writePreference
} from "../../plugins/artifact-organizer/scripts/lib/preference.mjs";

test("defaults: notion + auto", () => {
  assert.deepEqual(defaults(), { theme: "notion", renderer: "auto" });
});

test("parsePreference: reads YAML frontmatter", () => {
  const src = `---\ntheme: linear\nrenderer: page\n---\n\n# body`;
  assert.deepEqual(parsePreference(src), { theme: "linear", renderer: "page" });
});

test("parsePreference: missing frontmatter returns null", () => {
  assert.equal(parsePreference("no frontmatter here"), null);
});

test("parsePreference: ignores unknown keys", () => {
  const src = `---\ntheme: vercel\nrenderer: canvas\nmode: dark\nout_dir: ~/x\n---`;
  assert.deepEqual(parsePreference(src), { theme: "vercel", renderer: "canvas" });
});

test("parsePreference: trims whitespace around values", () => {
  const src = `---\ntheme:   stripe \nrenderer:  auto  \n---`;
  assert.deepEqual(parsePreference(src), { theme: "stripe", renderer: "auto" });
});

test("parsePreference: missing renderer falls back to default", () => {
  const src = `---\ntheme: supabase\n---`;
  assert.deepEqual(parsePreference(src), { theme: "supabase", renderer: "auto" });
});

test("formatPreference: produces canonical YAML + body", () => {
  const out = formatPreference({ theme: "linear", renderer: "page" });
  assert.match(out, /^---\ntheme: linear\nrenderer: page\ncreated_at: /);
  assert.match(out, /# Artifact Organizer preferences/);
  assert.match(out, /Valid values:/);
  // No mode field anywhere — color mode is intentionally not a preference
  assert.doesNotMatch(out, /^mode:/m);
});

test("resolvePreferencePath: project-local wins over global", () => {
  const tmp = mkdtempSync(join(tmpdir(), "op-pref-"));
  try {
    const local = join(tmp, ".artifact-organizer");
    mkdirSync(local, { recursive: true });
    const localFile = join(local, "preference.md");
    writeFileSync(localFile, "---\ntheme: linear\nrenderer: page\n---");
    const globalFile = join(tmp, "_global_preference.md");
    writeFileSync(globalFile, "---\ntheme: notion\nrenderer: auto\n---");
    const found = resolvePreferencePath({ cwd: tmp, homeFile: globalFile });
    assert.equal(found, localFile);
  } finally { rmSync(tmp, { recursive: true, force: true }); }
});

test("resolvePreferencePath: legacy ./.hyperscribe/ is auto-migrated to ./.artifact-organizer/", () => {
  const tmp = mkdtempSync(join(tmpdir(), "op-pref-"));
  try {
    const legacy = join(tmp, ".hyperscribe");
    mkdirSync(legacy, { recursive: true });
    const legacyFile = join(legacy, "preference.md");
    writeFileSync(legacyFile, "---\ntheme: stripe\nrenderer: canvas\n---");
    // No current dir exists — resolver should copy and return current path
    const found = resolvePreferencePath({ cwd: tmp });
    assert.equal(found, join(tmp, ".artifact-organizer", "preference.md"));
    // Migrated file content matches
    const migrated = readFileSync(found, "utf8");
    assert.match(migrated, /theme: stripe/);
    assert.match(migrated, /renderer: canvas/);
  } finally { rmSync(tmp, { recursive: true, force: true }); }
});

test("resolvePreferencePath: legacy ./.outprint/ is auto-migrated to ./.artifact-organizer/", () => {
  const tmp = mkdtempSync(join(tmpdir(), "op-pref-"));
  try {
    const legacy = join(tmp, ".outprint");
    mkdirSync(legacy, { recursive: true });
    writeFileSync(join(legacy, "preference.md"), "---\ntheme: apple\nrenderer: auto\n---");
    const found = resolvePreferencePath({ cwd: tmp });
    assert.equal(found, join(tmp, ".artifact-organizer", "preference.md"));
    assert.match(readFileSync(found, "utf8"), /theme: apple/);
  } finally { rmSync(tmp, { recursive: true, force: true }); }
});

test("resolvePreferencePath: legacy ~/.hyperscribe/ is auto-migrated to ~/.artifact-organizer/", () => {
  const tmp = mkdtempSync(join(tmpdir(), "op-pref-"));
  try {
    // No project-local of either kind — only home-legacy exists.
    const homeLegacy = join(tmp, "_home_legacy_preference.md");
    writeFileSync(homeLegacy, "---\ntheme: vercel\nrenderer: auto\n---");
    const homeCurrent = join(tmp, "_home_current_preference.md");
    const found = resolvePreferencePath({ cwd: tmp, homeFile: homeCurrent, homeLegacyFile: homeLegacy });
    assert.equal(found, homeCurrent);
    assert.match(readFileSync(found, "utf8"), /theme: vercel/);
  } finally { rmSync(tmp, { recursive: true, force: true }); }
});

test("resolvePreferencePath: falls back to global when no project-local", () => {
  const tmp = mkdtempSync(join(tmpdir(), "op-pref-"));
  try {
    const globalFile = join(tmp, "_global_preference.md");
    writeFileSync(globalFile, "---\ntheme: vercel\nrenderer: auto\n---");
    const found = resolvePreferencePath({ cwd: tmp, homeFile: globalFile });
    assert.equal(found, globalFile);
  } finally { rmSync(tmp, { recursive: true, force: true }); }
});

test("resolvePreferencePath: returns null when neither exists", () => {
  const tmp = mkdtempSync(join(tmpdir(), "op-pref-"));
  try {
    const found = resolvePreferencePath({ cwd: tmp, homeFile: join(tmp, "nope.md") });
    assert.equal(found, null);
  } finally { rmSync(tmp, { recursive: true, force: true }); }
});

test("readPreference: returns parsed values or null", () => {
  const tmp = mkdtempSync(join(tmpdir(), "op-pref-"));
  try {
    const p = join(tmp, "pref.md");
    writeFileSync(p, "---\ntheme: stripe\nrenderer: canvas\n---\n");
    assert.deepEqual(readPreference(p), { theme: "stripe", renderer: "canvas" });
    assert.equal(readPreference(join(tmp, "nope.md")), null);
  } finally { rmSync(tmp, { recursive: true, force: true }); }
});

test("writePreference: creates parent dir and writes frontmatter", () => {
  const tmp = mkdtempSync(join(tmpdir(), "op-pref-"));
  try {
    const target = join(tmp, "nested", "preference.md");
    writePreference(target, { theme: "linear", renderer: "page" });
    assert.ok(existsSync(target));
    const content = readFileSync(target, "utf8");
    assert.match(content, /theme: linear/);
    assert.match(content, /renderer: page/);
  } finally { rmSync(tmp, { recursive: true, force: true }); }
});

test("writePreference: throws on invalid theme", () => {
  const tmp = mkdtempSync(join(tmpdir(), "op-pref-"));
  try {
    assert.throws(() => writePreference(join(tmp, "p.md"), { theme: "studio", renderer: "auto" }), /theme/i);
  } finally { rmSync(tmp, { recursive: true, force: true }); }
});

test("writePreference: throws on invalid renderer", () => {
  const tmp = mkdtempSync(join(tmpdir(), "op-pref-"));
  try {
    assert.throws(() => writePreference(join(tmp, "p.md"), { theme: "notion", renderer: "rainy" }), /renderer/i);
  } finally { rmSync(tmp, { recursive: true, force: true }); }
});
