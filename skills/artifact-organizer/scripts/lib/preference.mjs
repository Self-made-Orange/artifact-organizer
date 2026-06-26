import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { homedir } from "node:os";

const VALID_THEMES    = new Set(["notion", "linear", "vercel", "stripe", "supabase", "apple", "tailwind"]);
const VALID_RENDERERS = new Set(["auto", "canvas", "page"]);
// Color mode (light/dark) is intentionally NOT part of preference anymore.
// Both variants are inlined into the output and the toggle button + system
// `prefers-color-scheme` handle switching at view time.

// Runtime config dirs in priority order:
//   1. ./.artifact-organizer/preference.md   (project-local, current name)
//   2. ./.outprint|.hyperscribe/preference.md (project-local, legacy — auto-migrated on read)
//   3. ~/.artifact-organizer/preference.md   (global, current name)
//   4. ~/.outprint|.hyperscribe/preference.md (global, legacy — auto-migrated on read)
const CURRENT_DIR_NAME = ".artifact-organizer";
// Every config dir name an older release used, newest-first. Auto-migrated to
// CURRENT_DIR_NAME on read. Never remove an entry — it strands old configs.
const LEGACY_DIR_NAMES = [".outprint", ".hyperscribe"];
// Back-compat single-name export (first/newest legacy name).
const LEGACY_DIR_NAME  = LEGACY_DIR_NAMES[0];

export function defaults() {
  return { theme: "notion", renderer: "auto" };
}

export function parsePreference(src) {
  if (typeof src !== "string") return null;
  const m = src.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!m) return null;
  const body = m[1];
  const out = {};
  for (const line of body.split(/\r?\n/)) {
    const kv = line.match(/^\s*([a-z_][a-z0-9_]*)\s*:\s*(.*?)\s*$/i);
    if (!kv) continue;
    const key = kv[1];
    const val = kv[2];
    if (key === "theme" || key === "renderer") out[key] = val;
  }
  if (!out.theme && !out.renderer) return null;
  return {
    theme:    out.theme    ?? defaults().theme,
    renderer: out.renderer ?? defaults().renderer
  };
}

export function formatPreference({ theme, renderer }) {
  const created = new Date().toISOString().replace(/\.\d+Z$/, "Z");
  return `---
theme: ${theme}
renderer: ${renderer}
created_at: ${created}
---

# Artifact Organizer preferences

Edit the values above to change your defaults. Delete this file to re-run
the first-run setup on the next Artifact Organizer invocation.

Valid values:
  theme:    notion | linear | vercel | stripe | supabase | apple | tailwind
  renderer: auto | canvas | page
`;
}

/**
 * Resolve preference file path with backwards-compat fallback to the legacy
 * `.hyperscribe/` directory. Search order:
 *   1. cwd/.outprint/preference.md       (current, project)
 *   2. cwd/.hyperscribe/preference.md    (legacy, project)  ← auto-migrated
 *   3. ~/.outprint/preference.md         (current, global)
 *   4. ~/.hyperscribe/preference.md      (legacy, global)   ← auto-migrated
 *
 * If only a legacy file exists, it is copied to the current location and the
 * current path is returned. The legacy file is left in place so older tools
 * that still read it keep working; users can delete it manually.
 */
export function resolvePreferencePath({ cwd = process.cwd(), homeFile, homeLegacyFile } = {}) {
  // Project-local — current
  const localCurrent = resolve(cwd, CURRENT_DIR_NAME, "preference.md");
  if (existsSync(localCurrent)) return localCurrent;

  // Project-local — legacy names, newest-first (auto-migrate)
  for (const legacyDir of LEGACY_DIR_NAMES) {
    const localLegacy = resolve(cwd, legacyDir, "preference.md");
    if (existsSync(localLegacy)) {
      mkdirSync(dirname(localCurrent), { recursive: true });
      copyFileSync(localLegacy, localCurrent);
      return localCurrent;
    }
  }

  // Global — current
  const globalCurrent = homeFile ?? join(homedir(), CURRENT_DIR_NAME, "preference.md");
  if (existsSync(globalCurrent)) return globalCurrent;

  // Global — legacy (auto-migrate). An explicit homeLegacyFile overrides the
  // default per-name lookup (used by tests); otherwise probe each legacy dir.
  const globalLegacies = homeLegacyFile
    ? [homeLegacyFile]
    : LEGACY_DIR_NAMES.map(d => join(homedir(), d, "preference.md"));
  for (const globalLegacy of globalLegacies) {
    if (existsSync(globalLegacy)) {
      mkdirSync(dirname(globalCurrent), { recursive: true });
      copyFileSync(globalLegacy, globalCurrent);
      return globalCurrent;
    }
  }

  return null;
}

export function readPreference(path) {
  if (!path || !existsSync(path)) return null;
  const src = readFileSync(path, "utf8");
  return parsePreference(src);
}

export function writePreference(path, { theme, renderer }) {
  if (!VALID_THEMES.has(theme)) {
    throw new Error(`Invalid theme "${theme}". Allowed: ${[...VALID_THEMES].join("|")}`);
  }
  if (!VALID_RENDERERS.has(renderer)) {
    throw new Error(`Invalid renderer "${renderer}". Allowed: ${[...VALID_RENDERERS].join("|")}`);
  }
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, formatPreference({ theme, renderer }), "utf8");
}

export { VALID_THEMES, VALID_RENDERERS, CURRENT_DIR_NAME, LEGACY_DIR_NAME, LEGACY_DIR_NAMES };
