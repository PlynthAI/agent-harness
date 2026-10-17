# Building an explainer

An explainer is a lasting teaching surface for a body of work: a page of
figures and a plain article beside it, kept true to the files they describe.
Use it when someone wants to review and understand a system over time, not
just hear one answer. The harness's own explainer is the worked example:
[the harness guide](../../../harness/library/references/harness-guide.md).

## The two parts

| Part | What it is | Owner of the craft |
|---|---|---|
| Figures page | A short series of figures, each answering one question, plus an "in numbers" list and a Sources section | [design/drawing](../../../design/drawing/METHOD.md) for the figures, [design/colour](../../../design/colour/METHOD.md) for the palette |
| Article | A plain account in the explanation mode, one section per figure, naming each figure by its title | [writing](../../../writing/SKILL.md)'s [technical writing](../../../writing/references/technical-writing.md), then [unslop](../../../writing/unslop/METHOD.md) |

Plan the figures the way this method teaches: decide what the reader should walk
away understanding, then build the picture up figure by figure. Run `how` and
`why` for the content; this reference only covers the shape and upkeep.

## Rules that keep it true

- **Every figure names its files.** The Sources section lists, per figure, the
  files it was checked against and the date. A figure without sources is
  opinion.
- **Counts only where a check guards them.** A number on the page (skills,
  roles, checks) needs a check that fails when it drifts. The article states no
  counts and points at the page's list instead.
- **One published copy at a fixed address.** When the page is an Artifact,
  publish once and republish to the same `url`; never start a second one.
- **Co-located with what it explains.** The source and the article live in the
  repository or vault they describe, not in another vault. Records about the
  explainer (a test, a finding) may live elsewhere and link to it.
- **Reached from the home page.** Link both parts from the vault's or
  repository's home page so a reader finds them without searching.
- **A written refresh trigger.** Record which changes refresh it (a file in
  the sources table changing in a way a figure shows) next to its procedure.

## Steps

1. Agree the reader and the few questions the figures answer. One question
   per figure.
2. Gather the facts with `how` and `why`, and note each file a figure rests on.
3. Draw the figures by drawing's [series guidance](../../../design/drawing/METHOD.md#series-of-diagrams).
   Inspect the page in the browser at desktop and phone
   width, light and dark, through
   [browser-verification](../../../browser-verification/SKILL.md) or the
   Artifact's own rendering workflow, and fix what you find.
4. Write the article against the finished figures, then run unslop.
5. Add the drift check for any counts and run it.
6. Publish the page, link both parts from the home page and write the refresh
   procedure beside the source.
