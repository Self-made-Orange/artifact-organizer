import { test } from "node:test";
import assert from "node:assert/strict";
import { FileTree } from "../../plugins/artifact-organizer/scripts/components/file-tree.mjs";

const sample = {
  nodes: [
    { name: "src", type: "dir", children: [
      { name: "index.ts", type: "file" },
      { name: "lib", type: "dir", highlight: "primary", children: [
        { name: "util.ts", type: "file" }
      ]}
    ]},
    { name: "README.md", type: "file" }
  ]
};

test("FileTree: root wrapper with op-file-tree class", () => {
  const html = FileTree(sample);
  assert.match(html, /class="op-file-tree/);
});

test("FileTree: renders all file names", () => {
  const html = FileTree(sample);
  for (const n of ["src", "index.ts", "lib", "util.ts", "README.md"]) {
    assert.match(html, new RegExp(`>${n}<`));
  }
});

test("FileTree: marks directory vs file with distinct classes", () => {
  const html = FileTree(sample);
  assert.match(html, /op-file-tree-dir/);
  assert.match(html, /op-file-tree-file/);
});

test("FileTree: highlight=primary emits highlight class", () => {
  const html = FileTree(sample);
  assert.match(html, /op-file-tree-node-highlight-primary/);
});

test("FileTree: caption renders when provided", () => {
  const html = FileTree({ ...sample, caption: "Repo layout" });
  assert.match(html, /<figcaption[^>]*>Repo layout<\/figcaption>/);
});

test("FileTree: escapes filenames", () => {
  const html = FileTree({ nodes: [{ name: "<evil>.ts", type: "file" }] });
  assert.match(html, />&lt;evil&gt;\.ts</);
});

test("FileTree: showIcons=false omits icon markup", () => {
  const html = FileTree({ nodes: [{ name: "a.ts", type: "file" }], showIcons: false });
  assert.doesNotMatch(html, /op-file-tree-icon/);
});

test("FileTree: showIcons default true emits icon span", () => {
  const html = FileTree({ nodes: [{ name: "a.ts", type: "file" }] });
  assert.match(html, /op-file-tree-icon/);
});
