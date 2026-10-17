---
name: ideate
description: Generate image concepts for a screen, feature or product idea - three distinct visual directions or a remix of an existing surface - before anything is built. Use for "show me some directions" or "remix this screen"; working variants in code belong to design/prototype.
---

# Ideate

Pictures are the cheapest way to disagree about a direction. This method turns a
brief into a small set of genuinely different concepts, lets the owner pick one,
and hands that pick to the build. It ends at a choice: nothing is implemented
here.

## Bind the project first

Read the repository root and nearest `AGENTS.md`, the design authority, its
tokens and one representative component before writing a prompt. Look at the
existing screens nearest to the target, and at every reference the brief names:
open the image or the running surface itself, since a filename says nothing about
what it shows. A named reference that cannot be reached (signed out, missing
file, app not running) is named back to the owner with the choice to fix access
or continue without it; it is never dropped silently.

An established direction stays put unless the brief asks for a new one: concepts
then vary structure, hierarchy, interaction and emphasis inside the project's own
type, colour and spacing. A broad idea or a greenfield surface may vary the
visual system too. Choose and record that new direction through the design
router's [staged workflow](../references/workflow.md); an explicitly requested
Impeccable command keeps its own contract, with `design/impeccable`'s new-work
reference choosing and recording the direction.

## Shape the brief

Use the [existing light brief](../references/workflow.md#develop-the-brief),
including its subject evidence, claims and assumptions. Carry the idea's
connection to that evidence into each concept; this method adds concept axes and
frames to the same brief, not a second intake.

- **Target.** A component, a screen, a flow or a whole product idea, with its
  user, its goal and the hard constraints every concept must keep.
- **Frame.** Fix the size before generating and state it in every prompt: about
  390 by 844 for a phone, 834 by 1194 for a tablet, 1440 by 1024 for a desktop
  application, 1440 wide and scrolling for a marketing page, a component at its
  natural size, or a reference's own aspect ratio when continuing from it.
- **Axes.** Give each direction a short descriptive name and the axis it explores
  (layout strategy, information hierarchy, interaction model or product framing)
  before any image exists. Three tints of one idea teach the owner nothing.
- **Time.** Anchor dates in mock content to today's date, unless the brief or a
  source design fixes them.

## Choose the image route

| Runtime | Image tool |
| --- | --- |
| Codex | the system imagegen skill's built-in `image_gen` tool, when the session offers it |
| Claude Code | none; use the fallback |
| Any session where the tool is absent or refused | the fallback |

**Fallback.** Write each direction as a short paragraph (axis, layout, type and
colour roles from the authority, the one primary action), then make quick comps
in HTML or SVG: through the project's prototype route with `design/prototype`'s
visual reference when the project can run one, or as a single-file artifact when
it cannot. Say plainly that these are comps, not generated images. A published
artifact follows the artifact verification rule (both themes, phone width).

Claim a reference was attached only when the tool actually received the file; a
description of a screenshot is not the screenshot.

## Generate and present

- One concept per image, three by default, each generated on its own.
- Each prompt carries the brief, the frame, the authority's roles, the hard
  constraints and the attached references. It asks for one focused primary screen
  with one primary action rather than a feature inventory, carries the spacing and
  grouping rules of `design/layout` and the type rules of `design/app-ui`'s
  typography reference, and shows phone concepts as app content without device
  chrome.
- Wait until every result is visible. Number the options by the order they appear
  in the conversation, never by the order they were planned or requested, then ask
  the owner to pick a number or say what to refine. A missing result is generated
  again before asking.

## Iterate and hand on

Feedback produces a revised set. A pick with feedback produces one revised
concept, and liked parts of several produce one combined concept, each shown
before any build. When a pick's number cannot be matched to a visible result,
ask rather than guess.

The chosen concept is the visual target, not the authority. Build it through the
routing rows its surfaces touch, use `design/prototype` when working variants
still need comparing in code, verify with `browser-verification`, and send the
fixed diff to `design/review`. Where the concept departs from the design
authority, the authority wins until the owner adopts the new direction and it is
recorded.

Adapted from the `ideate` skill of the Product Design plugin 0.1.56; source and
licence are in the [third-party notices](../../../THIRD_PARTY_NOTICES.md).
