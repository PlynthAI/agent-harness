---
name: audit
description: Audit a live product flow - onboarding, checkout, settings, a journey or any multi-step path - by capturing each step in the browser first, then reporting UX, design and accessibility findings tied to those captures. Use for "audit this flow"; a fixed diff goes to design/review.
---

# Flow audit

An audit walks a running flow the way a user would, captures every step, and
only then judges. The judgement vocabulary already lives elsewhere:
`design/review`'s lenses reference for a fixed diff and `design/impeccable`'s
critique reference for one surface scored against heuristics. This method adds
the walk, the evidence rules and the flow-level questions, and borrows those
categories rather than keeping a second set.

## Bind the scope first

Read the repository root and nearest `AGENTS.md` and the design authority:
findings are judged against the project's own standards, not taste. Then settle
four things before the first capture:

- the product or surface, and the flow from its first screen to its end state;
- the user goal the flow serves, and the mode: UX, accessibility or both (both by
  default);
- the identity, chosen under `browser-verification`'s intended-session rules: an
  isolated anonymous context for public paths, the project's test identity for
  signed-in ones;
- the browser route: the session's visible in-app browser first, the Playwright
  CLI when that browser cannot do what the step needs, and the user's own browser
  only when they ask for it or the flow needs their signed-in session.

A step that would buy, send, publish or submit something real is the audit's
last captured step: record it and stop before acting.

## Capture before judging

For each step, at the widths the project supports (at least desktop and phone
when both are in its viewport matrix):

1. Move one step and wait until the screen is stable: no spinner, half-rendered
   region or blocking dialog. Decline non-essential cookies.
2. Capture, open the saved capture and accept it only if it shows the right state.
   A blank, cropped, loading or wrong-window capture is taken again.
3. Note what a still frame cannot show: focus movement, validation and error
   recovery, loading and empty states, motion, and whether the next action is
   obvious. Try the step from the keyboard where it can be reached.
4. Save captures with numbered names (`01-start.png`, `02-details.png`) beside
   their notes, in the evidence location `docs-workspace` routes to.

Evidence comes from this run only. Earlier screenshots, memory and old reports
count only when the user supplies them. A flow that cannot be reached is not
audited: name the blocker at the step it occurred. Help pages and search results
about a product are research, which `design/ux-research` owns.

## Judge from the captures

Read the captures against the user goal before reading any build summary. For
each screen, use the categories of the two references above. Across the flow,
ask what a single-screen critique misses:

- **Entry.** Can the user find the start and tell what it will cost them?
- **Path.** Do steps follow the user's mental order, with no dead ends, loops or
  surprise detours?
- **Commitment.** Is there reassurance where the user commits money, data or time?
- **Defaults.** Do defaults, empty states and recovery paths help the next move?
- **Consistency.** Do terms, controls and layout stay the same from step to step?

Keep flow problems apart from polish. Accessibility findings say what the
captures show and what still needs assistive-technology or code testing; a
screenshot never establishes conformance.

## Report inline

Default to an inline report unless the user asks for a walkthrough on a canvas or
artifact (which then follows the artifact verification rule):

- a one or two sentence verdict;
- a numbered step list: step number, what happens, and its health (sound,
  friction or broken);
- the captures in flow order, each with the findings it supports;
- the three to five changes with the most impact, using the project's severity
  scale where it has one;
- evidence limits: what was not reached, not tested or not visible.

Findings can feed `brainstorm`, `design/ideate` concepts for a redesign, or
tickets.

Adapted from the `audit` skill of the Product Design plugin 0.1.56; source and
licence are in the [third-party notices](../../../THIRD_PARTY_NOTICES.md).
