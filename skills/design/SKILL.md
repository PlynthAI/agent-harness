---
name: design
description: Develop a light brief, then design and independently review interfaces, diagrams and other visual work in focused stages. Use for anything a user sees, with project standards and approved library resources; not for non-visual API, data or tooling work.
metadata:
  group: design
  lead: true
---

# Design router

Start from the user's intended result, including a short request with no brief
or supplied reference. Inspect the project and relevant library resources, then
ask focused questions about material choices the evidence cannot settle. Own
the design decisions the user delegates; do not make them specify a type scale
or write the brief for you.

For a light brief, a new or substantially changed composition, or a series, read
[the staged workflow](references/workflow.md). One design owner composes and
refines the work; an independent reviewer checks its visible result. A small
edit to an established pattern uses the affected methods and final review,
without a new direction exercise or early checkpoint.

A marketing page and a dense application screen are different surfaces: one has
to persuade a reader, the other has to help someone finish a task. The routing
table chooses between them, and neither inherits the other's composition rules.

## Bind the project first

Read the repository root and nearest `AGENTS.md` before any visual decision. They
name the design authority and project references for the affected surface.

- This shared router selects reusable design methods. Project references own
  naming, tokens, component choices and product rules; do not maintain another
  generic local router or duplicate leaves for those facts.
- Preserve distinct domain procedures and their evidence, channels, assets and
  checks. Read [project-workflows.md](references/project-workflows.md) when
  consolidating local skills; retain useful detail as references and keep a
  local entrypoint only for a procedure the shared methods do not already own.
- Find the standards the project actually enforces. The authority is the root
  `DESIGN.md` in the Google DESIGN.md format, checked with `designmd lint`;
  adopt or convert with [design-md-adoption.md](references/design-md-adoption.md).
  A repository that has not adopted it yet is read as it is - a nested file, a
  style guide, a `COMPONENTS.md`, a token file - found from its own guidance,
  never from memory, and the alignment pass brings it to the format. A missing
  endpoint is a finding to report, not a file to invent.
- Read the existing tokens and representative work when present. Missing
  standards or references do not make a visual request invalid.
- Resolve those tokens once, then reuse them for the rest of the task. One read
  of the authority covers every method the task loads; loading more than one
  method does not mean a second pass over colour, type or spacing.
- Design assets are not the standards and do not set them. They live in the
  project's design-asset root - the workspace resolver's design root, not its
  guidance - under the project's own namespace and reached through its existing
  `source`, `working` and `export` routes: inputs, work in progress and finished
  output. Use those routes as they are: this router creates no folders and
  migrates no existing assets.
- For a new surface, establish its direction through the staged workflow before
  detailed implementation. Use the project identity where one exists; otherwise
  choose and state a coherent direction within the user's scope. Choose display
  and text faces from [fonts.md](references/fonts.md) and use their load lines;
  record a deliberate system-stack choice in the project's `DESIGN.md`.
  When the request names a starter from [starters/README.md](starters/README.md),
  its `DESIGN.md` becomes the project's authority; resolve only the choices it
  leaves open. An explicitly requested Impeccable command retains its own
  direction, build and review contract. Ordinary design work does not inherit
  that command's concept rounds or approvals merely by being new.
- If built work has no design authority, keep to the standards it already
  follows - the existing components, the values already in use and the
  conventions around them. The alignment pass derives the root `DESIGN.md` in
  the format from those values for the owner's approval, as the last step
  before the port goes live. Nothing invents a value or a standard to fill the
  gap, and a routine style fix does not turn into authoring one.

The project authority controls values: colour, type, spacing, radii, motion
timings, component conventions and approved references. A shared method explains
how to reason, implement and review; it never imports another project's palette,
density, card grammar or build commands.

## Reach the design library

The design system has two homes. These skills are its methods; the design
library is its resources, shared by every project: approved components with their
implementations, profiles generated from each project's own authority, a portable
foundation, the one sources catalogue, a font list and design knowledge such as
the taste bundle. The library is a resource, not an authority: the project still
controls values, and an entry is adapted to it.

- Find it through the host registry, never from memory. The `docs-workspace`
  resolver lists it as `design-library` under `sharedRoots` from its `projects`
  command, which works from any repository, and `resolve` reports it under
  `optionalRoots.shared`. A host without that entry has no library: say so and
  continue with the project authority.
- Read the library's `DESIGN_SYSTEM.md` first. It maps the whole system: its
  parts, which to open for which job, each project's authority, library
  profile, drawing tool and asset namespace, and the rules that catch people
  out. It holds no values and no method; it names the owner of each answer.
- Read the library's own agent guide before retrieving; it owns the order. An
  approved entry in the project's collection comes first, then a compatible
  approved entry in the shared collection checked under the receiving profile,
  and only for a genuine gap the sources catalogue, with the licence checked and a
  new candidate proposed there.
- Search its generated index by collection, family, kind, tags and approval
  rather than browsing. A candidate is not an approval; only the owner approves.
- For composition references, read the separate generated
  `catalogue/compositions.json` summaries through
  [design/sourcing](sourcing/METHOD.md#retrieve-composition-references), then
  retrieve only selected full notes. Reference observations and local schematics
  inform relationships; current source review and project qualification stay
  separate. Empty or incompatible results leave the project authority usable.
- Project work reads the library and never writes project assets into it. A
  change to the library is its own task in that repository, under its guide.

## Load the methods the change touches

Open [routing.md](references/routing.md) to identify the surfaces the work
touches. Load their craft methods as the active pass needs them, rather than
loading every selected reference before building. Read constraints that affect
structure early: known fonts, palette, accessibility and motion requirements
must inform composition. A later detail reference can wait.

Composition and typography are worked together, followed by colour and detail,
then motion where needed. Render and inspect each meaningful pass; revisit
earlier decisions when a later change disrupts them. The staged workflow owns
the early independent checkpoint and the transition to final review.

Select methods by the changed surface, with no quota. A chart loads its data
method; a type change uses the `design/app-ui` typography reference. Palette
and contrast questions use `design/colour` on any surface. The routing table
does not require opening the catalogue or overlapping methods for the same job.

Broad critique and deep-dive skills are conditional tools: they run when the task
is that critique or that deep dive. Use `design/review` for the workflow's
independent visual checkpoints; a full Impeccable critique is not required at
each stage. Three methods work before or beside a build
and run only when asked for: `design/ideate` for generated concepts of a
direction, `design/audit` for a live flow captured step by step, and
`design/ux-research` for what users report about a product.

A method `design/<name>` is `<name>/METHOD.md` in this skill's own folder, not an
entry in the session's skill list. A missing method never blocks the work - use the project authority and
the fallback named in the routing table, and report which method was unavailable.

## Words on the surface

Every word a user reads on the surface goes through the `writing` skill:
headings, leads, captions, labels, controls,
figure text and accessible descriptions. The author drafts. A separate pass by
an agent that did not write the words then revises them one section at a time,
checks each factual claim against its source, drops any claim it cannot source
and cuts until a further cut would lose meaning. Report that pass with the
other verification evidence. A self-edit by the author at the end of a build
does not count.

## Verify in the real surface

Implement with honest content and real states, then inspect the intended
consuming surface. `browser-verification` supplies running-interface evidence;
drawings, slides and other artifacts use their medium's rendering workflow.

- Check the project's viewport matrix, plus long and sparse content, keyboard
  focus, zoom and reflow, and reduced motion.
- Watch for what a diff review cannot see: overflow, crops, unreadable contrast,
  broken hierarchy, layout shift.
- Run the project's own proportional checks. Do not copy another project's
  quality command, and do not claim browser, device or motion evidence that was
  not collected.

## Hand the fixed candidate on

The fixed candidate goes to the project's existing independent review, with
[design/review](review/METHOD.md) covering the visual result and any applicable
project supplement. A missing project-specific lens does not waive visual
review. Supply the original request and corrections, light brief, references
if any, candidate identity and contextual renders. Keep the builder's verdict
out of the reviewer's initial visual assessment.

The reviewer judges the whole result against its purpose, including hierarchy
and composition when the user did not spell those out. Close a stated concern
with visible evidence of its resolution, not a passing fit check. Report
mechanics, visual judgment and any user acceptance separately. Review completion
does not manufacture user approval or require a new approval for authorized work.

## Keep the methods current

[upstream.md](references/upstream.md) records the third-party design sources and
how they are maintained: provenance is established once per leaf, and no upstream
update or replacement of owned prose lands without review and approval of that
particular change.

## References

- [references/workflow.md](references/workflow.md) - light briefs, staged design,
  representative checks and repair for new compositions and series.
- [references/routing.md](references/routing.md) - capability to method, with
  fallbacks.
- [references/fonts.md](references/fonts.md) - the commercial faces new work
  chooses from and how each loads, generated from the design library.
- [references/project-workflows.md](references/project-workflows.md) - how shared
  methods and project-owned workflows coexist, and what each one owns.
- [references/upstream.md](references/upstream.md) - source inventory, update
  availability and the maintenance rule.
- [starters/README.md](starters/README.md) - finished looks a new project copies
  in as its own `DESIGN.md`.
