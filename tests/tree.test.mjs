import { test } from "node:test";
import assert from "node:assert/strict";
import { renderTree } from "../plugins/artifact-organizer/scripts/lib/tree.mjs";

const fakeRegistry = {
  "artifact-organizer/Page": (props, renderChildren) => `<page title="${props.title}">${renderChildren()}</page>`,
  "artifact-organizer/Prose": (props) => `<p>${props.markdown}</p>`,
  "artifact-organizer/Section": (props, renderChildren) => `<section id="${props.id}">${renderChildren()}</section>`
};

test("renderTree: renders single leaf", () => {
  const node = { component: "artifact-organizer/Prose", props: { markdown: "hi" } };
  assert.equal(renderTree(node, fakeRegistry), "<p>hi</p>");
});

test("renderTree: renders nested children", () => {
  const node = {
    component: "artifact-organizer/Page",
    props: { title: "T" },
    children: [
      { component: "artifact-organizer/Prose", props: { markdown: "a" } }
    ]
  };
  assert.equal(renderTree(node, fakeRegistry), '<page title="T"><p>a</p></page>');
});

test("renderTree: renders multiple children", () => {
  const node = {
    component: "artifact-organizer/Section",
    props: { id: "s" },
    children: [
      { component: "artifact-organizer/Prose", props: { markdown: "a" } },
      { component: "artifact-organizer/Prose", props: { markdown: "b" } }
    ]
  };
  assert.equal(renderTree(node, fakeRegistry), '<section id="s"><p>a</p><p>b</p></section>');
});

test("renderTree: throws on unregistered component", () => {
  const node = { component: "hyperscribe/Nope", props: {} };
  assert.throws(
    () => renderTree(node, fakeRegistry),
    /No renderer.*hyperscribe\/Nope/
  );
});

test("renderTree: passes ctx through", () => {
  const registry = {
    "artifact-organizer/Page": (props, renderChildren, ctx) => `<page theme="${ctx.theme}">${renderChildren()}</page>`,
    "artifact-organizer/Prose": (props, _, ctx) => `<p theme="${ctx.theme}">${props.markdown}</p>`
  };
  const node = {
    component: "artifact-organizer/Page",
    props: { title: "T" },
    children: [{ component: "artifact-organizer/Prose", props: { markdown: "x" } }]
  };
  const out = renderTree(node, registry, { theme: "notion" });
  assert.equal(out, '<page theme="notion"><p theme="notion">x</p></page>');
});

test("renderTree: empty children renders empty string", () => {
  const node = { component: "artifact-organizer/Page", props: { title: "T" }, children: [] };
  assert.equal(renderTree(node, fakeRegistry), '<page title="T"></page>');
});
