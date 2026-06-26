#!/usr/bin/env python3
"""
canvas-wrap — auto-convert general hyperscribe envelope to canvas template.

Reads envelope at argv[1]. If it's a general envelope (has `parts[]`, no `template`),
and is NOT a site-mode (SiteHeader/SiteFooter/HeroCarousel/MosaicGrid/etc) or slide-mode
(SlideDeck), wraps it as a canvas envelope and writes a sibling .canvas.json file.
Prints the new path to stdout.

Section split: Page.children[0] becomes `featured` (hero slide); children[1..] each
become a `history[]` item (carousel slide + division card).

If envelope is already canvas, or uses site/slide-mode components, prints original
path unchanged.
"""
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

SITE_MODE_COMPONENTS = {
    "artifact-organizer/SiteHeader",
    "artifact-organizer/SiteFooter",
    "artifact-organizer/HeroCarousel",
    "artifact-organizer/MosaicGrid",
    "artifact-organizer/ProjectTile",
    "artifact-organizer/DivisionCard",
    "artifact-organizer/WorkTypeRow",
    "artifact-organizer/PressMentions",
    "artifact-organizer/EditorialStatement",
    "artifact-organizer/CountdownTimer",
}
SLIDE_MODE_COMPONENTS = {
    "artifact-organizer/SlideDeck",
    "artifact-organizer/Slide",
}


def collect_components(node, acc):
    if isinstance(node, dict):
        c = node.get("component")
        if isinstance(c, str):
            acc.add(c)
        children = node.get("children")
        if isinstance(children, list):
            for ch in children:
                collect_components(ch, acc)
    elif isinstance(node, list):
        for n in node:
            collect_components(n, acc)


def main():
    if len(sys.argv) < 2:
        print("usage: canvas-wrap.py <envelope.json>", file=sys.stderr)
        return 2
    src = sys.argv[1]
    src_path = Path(src)
    if not src_path.is_file():
        print(src)
        return 0
    try:
        with src_path.open() as f:
            env = json.load(f)
    except Exception as e:
        print(f"canvas-wrap: parse error, passing through: {e}", file=sys.stderr)
        print(src)
        return 0

    if env.get("template") == "canvas":
        print(src)
        return 0

    parts = env.get("parts")
    if not isinstance(parts, list) or not parts:
        print(src)
        return 0

    used = set()
    for part in parts:
        collect_components(part, used)

    if used & SITE_MODE_COMPONENTS:
        sys.stderr.write("canvas-wrap: site-mode envelope, skipping wrap\n")
        print(src)
        return 0
    if used & SLIDE_MODE_COMPONENTS:
        sys.stderr.write("canvas-wrap: slide-mode envelope, skipping wrap\n")
        print(src)
        return 0

    page = parts[0]
    page_props = page.get("props") if isinstance(page.get("props"), dict) else {}
    title = page_props.get("title") or "Output"
    subtitle = page_props.get("subtitle")
    page_children = page.get("children")
    sections = page_children if isinstance(page_children, list) else []

    if not sections:
        featured = page
        history = []
    elif len(sections) == 1:
        featured = sections[0]
        history = []
    else:
        featured = sections[0]
        history = []
        for sect in sections[1:]:
            sect_props = sect.get("props") if isinstance(sect, dict) and isinstance(sect.get("props"), dict) else {}
            sect_title = sect_props.get("title") or sect_props.get("text") or (
                sect.get("component", "Section").split("/")[-1] if isinstance(sect, dict) else "Section"
            )
            history.append({
                "title": sect_title,
                "content": sect,
            })

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    canvas = {
        "template": "canvas",
        "meta": {
            "title": title,
            "agent": "Claude",
            "topic": "Output",
            "date": today,
            "divisionsLabel": "Sections",
        },
        "featured": featured,
        "history": history,
    }
    if subtitle:
        canvas["meta"]["subtitle"] = subtitle

    dst_path = src_path.with_suffix(".canvas.json")
    with dst_path.open("w") as f:
        json.dump(canvas, f, indent=2, ensure_ascii=False)

    sys.stderr.write(f"canvas-wrap: {src_path.name} → {dst_path.name}\n")
    print(str(dst_path))
    return 0


if __name__ == "__main__":
    sys.exit(main())
