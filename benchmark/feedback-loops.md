# Feedback Loops

Three quick prompt-quality loops I used to harden the repo-explainer guidance.

## Loop 1 — Artifact Organizer repo context vs. visual-explainer benchmark

- Input: `benchmark/context.md`
- Comparison target: [`nicobailon/visual-explainer`](https://github.com/nicobailon/visual-explainer)
- Failure mode I saw:
  - The page stayed factual, but the eye landed on `Comparison` cards too early.
  - The diagram was present, yet the artifact still read like prose with visual garnish.
- Prompt changes that came out of it:
  - repo explainers should usually open with a diagram-led first section
  - avoid `Comparison` as the dominant visual unless the source is truly about trade-offs
  - keep repo explainers to 2 `Prose` blocks or fewer unless the user explicitly asks otherwise

## Loop 2 — React README

- Input: [facebook/react README](https://raw.githubusercontent.com/facebook/react/main/README.md)
- Stress point:
  - the source is feature-list heavy, so a weak prompt drifts into bullets + prose recap
- Better composition after the prompt update:
  - lead with `ArchitectureGrid` or `FlowChart` for the "declarative UI -> components -> render targets" mental model
  - move installation/docs/community into one compact evidence section instead of three prose-heavy sections
  - keep JSX and package names as selective inline code, not all over the page

## Loop 3 — Next.js README

- Input: [vercel/next.js package README](https://raw.githubusercontent.com/vercel/next.js/canary/packages/next/README.md)
- Stress point:
  - the source is marketing-ish and link-dense, which makes it easy to over-render headings and badges as text
- Better composition after the prompt update:
  - start with a diagram for the "React features + full-stack runtime + Rust tooling" structure
  - treat docs/community/security as support evidence, not the page backbone
  - push long identifier lists into `FileCard`, `Callout`, or diagram labels instead of backtick-heavy prose

## Net result

- Repo explainers are now explicitly diagram-first.
- `Comparison` is demoted from default hero surface to a conditional tool.
- Evidence is pushed toward structural components instead of explanatory paragraphs.
- Inline code is treated as seasoning, not texture.
