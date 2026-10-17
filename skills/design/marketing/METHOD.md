---
name: marketing
description: Compose marketing and editorial pages - heroes, proof, product demonstration, pricing and calls to action - where the page itself has to persuade. Use for advertising and editorial surfaces; dense application screens belong to design/app-ui.
---

# Marketing design

A marketing page is a narrative with a job to do. An application screen is a
task surface. They share tokens and components and almost nothing else: the same
card grammar that makes a dense tool scannable makes a landing page read as a
template.

## Decide how the page communicates

Write the argument before choosing any layout. What is being claimed, what
evidence supports it, and what should the reader do next? The order of those
answers is the page structure. A page with no claim has no design problem yet -
say so rather than decorating it.

Name the register: a launch page for a product, an editorial or long-form piece,
a portfolio, a campaign, a reference entry point. Each answers a different
question and rewards different pacing. Where the project has a design authority,
it names its own registers; follow it.

The [page playbook](references/page-playbook.md) carries the rest: positioning
before copy, the default section order, each section's job, evidence and
failures, the look, and the page checks. Its defaults give way to the project's
own page patterns.

## Compose the page

- Lead with the claim, not with a section label. The first screen carries the
  heading, the supporting sentence, the primary action and, when the subject is
  visual, the image the reader came for.
- Page structure, grouping, spacing and adaptivity are `design/layout`; choosing
  a sourced block or library is `design/sourcing`. Load either one when the page
  needs it, and keep the narrative order above in this method.
- One idea per section, and a visible change of pace between sections. Vary
  density instead of repeating an identical band of heading, subtext and button.
- Proof belongs next to the claim it supports: a number, a quote, a real screen,
  a named customer, a demonstration. A claim with no adjacent evidence is
  decoration.
- Show the thing working where it can be shown. A truthful interface scene beats
  an invented diagram, and an illustration is not a substitute for a real
  product surface.
- Sequence deliberately. Numbered steps, small labels and repeated markers are
  choices, not scaffolding; apply them where the content really is an ordered
  sequence.
- End the page with the action it wants, and make the next step unambiguous.

## Keep illustration honest

Marketing imagery may be abstract, staged or drawn. Real analytical components
may not be. A chart or map drawn to look plausible inside a hero is an
illustration: it must not be presented as, or quietly reused as, the product's
real data surface. Where a page needs to show real output, use the real
presentation and its real data contract.

## Verify in the real page

Run the playbook's page checks first, then render the page at the project's
own viewport matrix with honest content: the
longest heading the copy allows, an empty state, a slow image, a missing asset.
Check reading order, focus order, contrast at every size, and what is visible
before anything animates. Prefer content that is visible by default and enhanced
by motion over content that depends on a transition to appear.

Run the project's own proportional checks. Conditions that exist only in the
rendered page - overflow, a cropped subject, an unreadable overlay, a headline
that breaks at one breakpoint - are findings a diff review cannot see, so look
at the page before claiming the work is done.
