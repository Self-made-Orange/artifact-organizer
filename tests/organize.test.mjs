import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyStore, extractArtifact, stack } from "../plugins/artifact-organizer/scripts/organize.mjs";

const node = (value) => ({ component: "artifact-organizer/KPICard", props: { label: "MAU", value } });

test("emptyStore: canvas shell with empty history", () => {
  const s = emptyStore("My Deck");
  assert.equal(s.template, "canvas");
  assert.equal(s.meta.title, "My Deck");
  assert.equal(s.featured, null);
  assert.deepEqual(s.history, []);
});

test("extractArtifact: page envelope → Page node + title", () => {
  const { content, title } = extractArtifact({
    parts: [{ component: "artifact-organizer/Page", props: { title: "Q1" }, children: [] }],
  });
  assert.equal(title, "Q1");
  assert.equal(content.component, "artifact-organizer/Page");
});

test("extractArtifact: canvas envelope → its featured node", () => {
  const { content, title } = extractArtifact({ meta: { title: "Feb" }, featured: node("3,400") });
  assert.equal(title, "Feb");
  assert.equal(content.props.value, "3,400");
});

test("extractArtifact: single component node passes through", () => {
  const { content } = extractArtifact(node("8,100"));
  assert.equal(content.props.value, "8,100");
});

test("extractArtifact: legacy outprint/ prefix is normalized", () => {
  const { content } = extractArtifact({ component: "outprint/KPICard", props: { label: "x", value: "1" } });
  assert.equal(content.component, "artifact-organizer/KPICard");
});

test("extractArtifact: unknown shape throws", () => {
  assert.throws(() => extractArtifact({ nope: true }), /Unrecognized artifact shape/);
});

test("stack: first artifact becomes featured, history stays empty", () => {
  const s = stack(emptyStore(), { content: node("1,200"), title: "Jan", date: "2026-01-31" });
  assert.equal(s.featured.props.value, "1,200");
  assert.equal(s.meta.title, "Jan");
  assert.equal(s.history.length, 0);
});

test("stack: second artifact demotes the first into history (newest-first)", () => {
  let s = stack(emptyStore(), { content: node("1,200"), title: "Jan", date: "2026-01-31" });
  s = stack(s, { content: node("3,400"), title: "Feb", date: "2026-02-28" });
  assert.equal(s.featured.props.value, "3,400");
  assert.equal(s.meta.title, "Feb");
  assert.equal(s.history.length, 1);
  assert.equal(s.history[0].title, "Jan");
  assert.equal(s.history[0].content.props.value, "1,200");
});

test("stack: a titleless artifact does NOT inherit the displaced title", () => {
  let s = stack(emptyStore(), { content: node("1,200"), title: "Jan" });
  s = stack(s, { content: node("3,400") }); // no title
  assert.equal(s.meta.title, "Untitled");
  assert.equal(s.history[0].title, "Jan");
});

test("stack: agent/topic/theme persist across adds; title does not", () => {
  let s = stack(emptyStore(), { content: node("1"), title: "A", agent: "Claude", topic: "Growth", theme: "apple" });
  s = stack(s, { content: node("2"), title: "B" }); // no agent/topic/theme passed
  assert.equal(s.meta.agent, "Claude");
  assert.equal(s.meta.topic, "Growth");
  assert.equal(s.meta.theme, "apple");
  assert.equal(s.meta.title, "B");
});

test("stack: input store is not mutated", () => {
  const s0 = emptyStore();
  const s1 = stack(s0, { content: node("1"), title: "A" });
  assert.equal(s0.featured, null);
  assert.notEqual(s0, s1);
});
