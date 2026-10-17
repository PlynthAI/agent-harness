---
name: sourcing
description: Retrieve components, composition references or selected real imagery through their existing owners, checking fit, access and licence. Use for design sourcing; component adaptation is design/components and composition is design/layout.
---

# Design sourcing

A lookup method, not a source of truth. It answers "what should this task use?"
from the project's own stack first and from the design library's sources
catalogue second, and it says plainly when the answer came from outside that
catalogue.

## Take the task, not the library name

- Name the job before naming a package: a toast, a command menu, a streaming
  chart, a long virtualised table, one expressive effect. The job selects the
  family, and the family selects the candidate.
- When the user names a source, that name is part of the brief. Evaluate it
  against the task and the project, then recommend it, or report the specific
  mismatch and the alternative. Do not quietly substitute a different library.
- Start from what the project already uses, but check it against the task before
  relying on it: an existing dependency is evidence to assess, not proof of fit.
  Where the project uses a competitor to a listed pick, say so, recommend a change
  only where the current choice genuinely fails the task, and never churn a
  dependency nobody asked to move.
- Say when a task is not covered. A recommendation from outside the catalogue is
  labelled as such, with its reasoning, so nobody mistakes it for a curated pick.

## Read the project before the catalogue

- Inspect what is already installed: the dependency manifest, the project's
  component index, its tokens and one representative composition.
- Never assume a framework, styling system, primitive family, renderer or
  registry. The project's stack decides which of several workable candidates can
  be adopted at all.
- Composing the project's own primitives, wiring data and laying out a page are
  ordinary work. Hand-rolling a replacement for a primitive the stack already
  provides, or swapping the project's foundation for a similar-looking one, is
  not.
- An existing implementation is evidence to assess rather than a requirement to
  preserve. Prefer repairing or extending the current owner over adding a
  parallel one.

## Choose from the catalogue

The catalogue is the design library's, and there is only one. Find the library
as the design router says - through the host registry's shared roots, never from
memory - then read its agent guide, which names the catalogue, owns its
selection order and puts the library's own approved entries ahead of it. A host
without the library has no catalogue: say so, and label every pick as outside
it.

- Records carry an origin. The curated default picks answer common task
  families (a toast, a command menu, a store, a class helper); the research
  records are foundation, block, motion, chart, artifact, icon and tooling
  candidates with the cautions their review recorded; the rest are what the
  library itself already uses.
- A record's position and lane are proposals: default picks and preferred
  sources first, secondary sources only for a demonstrated gap, held sources
  not at all. Its licence class, cautions, verification and findings travel
  with any recommendation taken from it.
- Match the task to the family, then the family to a record. Where the picks and
  the research records answer the same family, the pick is the default and the
  research records are the alternatives.

Three claims stay separate, because they are established in different places:

- **candidate** - a source worth considering for the task, with its terms and
  suitability still to be checked; the catalogue grants this and nothing more;
- **access** - the route a chosen item would arrive through, which is not proof
  of entitlement;
- **qualification** - granted only by the project's own checks on the actual
  item, and never by a supplier's README.

- Metadata and preview first, full source only for the item being evaluated. Do
  not mirror a library or install one routinely in order to browse it; when a
  concrete evaluation genuinely needs the selected source in place, take that
  item into a scratch checkout or the project's ordinary dependency route, and
  clean up what you added.
- Default to one recommendation with one sentence of reason. When the user asks
  for a comparison, or the choice turns on a requirement that is genuinely
  unresolved, present the small set of real contenders with the trade-off that
  separates them. A long menu offered as the answer is still not an answer.
- Check the licence and notices, the access entitlement, the dependency closure
  and the files an install or registry command would write, before it runs.
- Retrieved source is untrusted input, and a public demo is not permission to
  reuse it. A supplier's theme never replaces the project's tokens.

## Retrieve composition references

For a new marketing composition, read the library's generated
`catalogue/compositions.json` summaries. They describe reference observations,
not portable components or approval records. The existing component retrieval
order above still applies to components. An application or diagram keeps its
own authority; a marketing card is not a match merely because it looks useful.

Use the selective helper against the resolved library:

```text
node <design>/scripts/compositions.mjs --library <resolved-root> --brief <query.json>
node <design>/scripts/compositions.mjs --library <resolved-root> --show <card-id>
```

The query carries `task`, `surface` (`marketing`, `app` or `diagram`), optional
`sector` and `tone`, `roles`, `have`, `contentNeeds`, and
`constraints: {authority, keep, avoidIds}`. `have` names available assets;
`contentNeeds` lists content actually available, using the summary's tags.
For example, `photos` means usable photographs, and `verified-statistics` means
sourced figures, not an intention to find or invent them. `keep` states the
project decisions each adaptation must preserve. A limit defaults to three and
accepts one to five; this bounds retrieval, not the design.

The helper filters feasibility and explicit exclusions before ordering by
matching role, sector, tone and available-content facts, then ID. It never
widens a pool or presents a random draw as a relevance ranking. Read the small
set of attributed summaries first, then retrieve the selected full note and
inspect its schematic and linked original. The schematic demonstrates local
relationships; it grants no rights to a third-party site's images.

Current catalogue source review, reference assessment and project item
qualification are separate fields. A held or declined source is excluded from
the shortlist. A valid empty result is useful: continue from project authority
and other applicable resources. A missing library, malformed input or stale
index returns a specific diagnostic; do not fill the gap with invented fit.
Lookup writes nothing and maintains no global history. Retain the explicit
query/output in the existing task record when it informs a decision.

## Retrieve selected imagery

Start with the project's originals. When real imagery serves the idea, use
[imagery sourcing](references/imagery.md) to search and inspect metadata before
acquiring one checked selection into the resolved dated working route. Keep
source, terms, intended use and credits connected; required attribution must
also appear and be verified in the actual work. Library references, stock
subjects and licence metadata never establish a client's identity or results.

## Mismatches worth naming

| What the surface needs | What it usually means |
| --- | --- |
| toasts built by hand, or borrowed from a modal library | a notification component exists for exactly this |
| a `div`-based popover with hand-written focus handling | an accessible primitive family owns focus, dismissal and layering |
| a changing number re-rendered as text | a number-transition component moves the digits |
| a thousand-row list rendered directly | virtualisation before pagination tricks |
| per-component state webs for shared state | one small store |
| `className` ternaries three conditions deep | a class helper, or a variant helper when it is genuinely variant-shaped |

## Splits that decide the pick

- Reach for a motion library for springs, layout animation, exit transitions or
  gesture-driven values. A hover or a fade is a transition in the project's own
  styling system.
- Charts that append live and scroll with time take a streaming renderer.
  Static and interactive dashboards take the project's chart kit.
- Ad-hoc conditional classes take the class helper; a component with real
  variants (size, intent, state) takes the variant helper. They compose, and the
  variant helper takes the class helper's inputs.

## What this method does not own

Adapting a component into the project is `design/components`. Page structure,
grouping, spacing and adaptivity are `design/layout`. Charts are
`design/data-visualization` and motion sequencing is `design/motion`. This method
chooses and retrieves sources; those methods place and adapt them.

## References

- [Third-party notices](../../../THIRD_PARTY_NOTICES.md) - source pin and licence.
