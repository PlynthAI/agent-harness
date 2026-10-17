---
name: motion
description: Implement or review purposeful transitions, gestures and feedback - purpose, frequency, interruption, reduced motion, performance - with the project's motion tokens. Use for animation, transitions, gestures and interaction feel; whole-surface audits and naming an effect load its own references.
---

# Motion design

Motion is a service to the interface, not a decoration. Every animation has to
preserve orientation, communicate state, confirm input, explain a relationship or
prevent a jarring change - and the project's motion tokens decide the values.

## Bind the authority

Read the nearest `AGENTS.md` and the project's motion tokens: durations, easing
roles, spring parameters and reduced-motion policy. Those values are the ones to
use. The numbers in these references are defaults for a project that has none,
never replacements for tokens that exist.

## 1. Decide whether it should animate

- Keyboard-driven and very frequent actions are instant.
- Common controls use immediate press or colour feedback only.
- Occasional disclosures, popovers, drawers and mode changes may animate.
- Rare onboarding or confirmation moments may carry restrained delight.

If the motion has no functional purpose, appears frequently, delays input, hides
evidence, or makes the product feel less calm, remove it. See
[references/craft.md](references/craft.md) for the component-level framework.

## 2. Routine interface motion

- Prefer CSS transitions for retriggerable interface motion, and a progressive
  entrance such as `@starting-style` for simple arrivals. Motion must start from
  the state on screen and stay interruptible.
- Use the project's duration tokens by role - press, fast, standard, deliberate.
  Where a project has no duration token, keep product interface motion below
  roughly 300ms unless a hold or progress treatment represents real elapsed work.
- Routine menus, cards, tabs, controls and data views never bounce. Never use
  `ease-in`, `transition: all`, or `scale(0)` for an entrance.
- Animate `transform`, `opacity` and colour by default. Avoid layout properties
  where a composited transform expresses the relationship.
- Gate hover motion to fine pointers, and give every movement
  `prefers-reduced-motion` handling that keeps the state legible while removing
  translation, scale, parallax and springs.

## 3. Physical and gesture motion

Read [references/gestures.md](references/gestures.md) completely for drag, swipe,
sheets, momentum or direct manipulation. Respond on pointer-down, preserve the
grab offset, track 1:1 with pointer capture, hand the release velocity to the
spring, project momentum, resist at bounds and allow interruption at any frame.

Use springs only when the behaviour is gesture-driven or momentum-carrying. Start
with no overshoot for ordinary repositioning. A flick, throw or drag release may
use a slight bounce, because the overshoot continues energy the user supplied.

**Bounce reconciliation:** routine interface motion has no bounce; a
momentum-carrying gesture may. A menu that merely opens has no such energy and
must not bounce.

## 4. Review gate

Read [references/review.md](references/review.md) after implementing. Default to
flagging; approval is earned. Review normal and reduced motion in the real
surface, inspect rapid reversal and input latency, and use slow motion or
frame-by-frame playback when timing or continuity matters. A blocking motion
finding prevents readiness.

Chart and design/data-visualization motion belongs with `design/data-visualization`: preserve
object constancy, never imply a false baseline, never delay reading, and never
animate uncertainty into false confidence.

## References

- [references/craft.md](references/craft.md) - entry, exit, state craft and
  performance.
- [references/gestures.md](references/gestures.md) - direct manipulation,
  momentum, springs and boundaries.
- [references/review.md](references/review.md) - the post-change review.
- [references/vocabulary.md](references/vocabulary.md) - the reverse-lookup
  glossary for naming an effect.
- [references/audit.md](references/audit.md) - the read-only whole-surface audit
  and planning workflow.

## Upstream

The craft, gesture and review references carry guidance adapted from
emilkowalski/skills at commit `85e8e2363b713506e1d5b6e07a0eb2da66be1bc3` (MIT),
whose notice this leaf carries beside them.
