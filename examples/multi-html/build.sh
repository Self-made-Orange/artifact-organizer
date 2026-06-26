#!/usr/bin/env bash
# Build all HTML files for the multi-HTML example.
# Run from the repo root:  bash examples/multi-html/build.sh
# Or from this directory:  bash build.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
RENDER="$REPO_ROOT/plugins/artifact-organizer/scripts/render.mjs"
OUT_DIR="$SCRIPT_DIR"

THEME="${THEME:-notion}"

render() {
  local in="$1" out="$2"
  echo "  → $(basename "$in") → $(basename "$out")"
  node "$RENDER" --in "$in" --out "$out" --theme "$THEME"
}

echo "Building multi-HTML example (theme: $THEME)…"
echo ""

# Sub-pages first (so they exist before the index links to them)
render "$SCRIPT_DIR/01-q1-launch.json"    "$OUT_DIR/01-q1-launch.html"
render "$SCRIPT_DIR/02-april-growth.json" "$OUT_DIR/02-april-growth.html"
render "$SCRIPT_DIR/03-week18-team.json"  "$OUT_DIR/03-week18-team.html"

# Hub last (links depend on the sub-pages being present)
render "$SCRIPT_DIR/index.json"           "$OUT_DIR/index.html"

echo ""
echo "Done. Open the hub:"
echo "  open $OUT_DIR/index.html"
