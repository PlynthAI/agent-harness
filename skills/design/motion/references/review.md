# Post-change motion review

Default to flagging; approval is earned. Review every changed animation against
the project's motion tokens and these questions:

1. Does it have a valid purpose, and is its intensity appropriate to how often it
   is seen?
2. Does it use the correct easing role, and does it stay inside the project's
   duration budget?
3. Does it start from a physically credible value and the correct origin?
4. Can rapidly triggered or gesture-driven motion reverse from the current
   presentation state without a jump?
5. Does it avoid `transition: all`, `ease-in`, `scale(0)`, routine bounce and
   animated layout properties?
6. Does pointer-down feedback arrive immediately without delaying input?
7. Do transform, opacity and colour stay smooth under realistic page load, with
   no parent-variable recalculation loop?
8. Do enter and exit express the deliberate phase against the fast system
   response while preserving the same spatial path?
9. Does the motion match the product's personality and preserve evidence, values,
   provenance and object constancy?
10. Are reduced motion and fine-pointer hover gating complete, with keyboard
    behaviour unchanged?

Chart transitions additionally defer to `design/data-visualization`. Reject motion from a
misleading zero baseline, delayed routine reading, lost object constancy, or an
animation that makes estimates look observed.

## Evidence and verdict

- Inspect normal speed, slow motion, frame-by-frame playback, rapid reversal,
  reduced motion, keyboard input, and real touch hardware for gestures.
- Return one `Before | After | Why` findings table with the exact file and line
  for each finding, and take replacement values from the project's motion tokens.
- **Block** feel-breaking easing, origin or frequency defects; avoidable non-GPU
  motion; missing reduced-motion treatment; and any motion that delays input or
  distorts evidence.
- **Approve** only when nothing obvious should be deleted, purposes are clear,
  timing and easing are in bounds, interruption is correct, accessibility is
  complete, and the rendered feel is coherent.

When feel remains uncertain, record the uncertainty and require a slow-motion,
frame-by-frame, fresh-eyes or real-device check rather than guessing.

## Line-level standards

The ten standards below are the explicit bar this review measures every animation
in the diff against. They are adapted from the `review-animations` method in
emilkowalski/skills at commit `85e8e2363b713506e1d5b6e07a0eb2da66be1bc3` (MIT);
the project's own tokens still supply the values.

1. **Justified motion.** Every animation answers "why does this animate?" -
   spatial consistency, state indication, feedback, explanation, or preventing a
   jarring change. "It looks good" on a frequently seen element is a block.
2. **Frequency-appropriate.** Keyboard-initiated and hundred-a-day actions get no
   animation. Many-a-day interactions are reduced. Occasional state changes may
   use standard motion. Rare moments may carry delight.
3. **Responsive easing.** Entering and exiting elements use the entering easing
   role or a strong custom curve. `ease-in` on interface motion is a block: it
   delays the moment the user watches most, and the built-in curves are usually
   too weak to read as intentional.
4. **Bounded duration.** Product interface motion stays under roughly 300ms
   unless the project's own token says otherwise or the animation represents real
   elapsed work.
5. **Origin and physical correctness.** A trigger-anchored surface scales from its
   trigger, not its centre. Never enter from `scale(0)`; start from a small
   non-zero scale with opacity. A centred modal is the standing exception.
6. **Interruptibility.** Rapidly triggered or gesture-driven motion must retarget
   from its current value - a transition or a spring - rather than restart a fixed
   timeline.
7. **Compositor-friendly properties.** Animate `transform` and `opacity`. Layout
   properties, a library shorthand transform under load, and a per-frame inherited
   variable update are performance findings.
8. **Accessibility.** Reduced motion is honoured as gentler rather than absent:
   keep opacity and colour, drop movement. Hover motion is gated by capability.
9. **Asymmetric timing.** A deliberate phase may be slow; the system's response
   snaps. Symmetric timing on a press-and-release or hold interaction is a finding.
10. **Cohesion.** Motion matches the component's personality and the rest of the
    product. When it is unclear whether motion feels right, the strongest move is
    usually to delete it.

Escalate these on sight: an unbounded property animation; an entrance from
`scale(0)`; an entering role replaced by `ease-in`; motion on a keyboard or
hundred-a-day action; an unbounded UI duration; a centred origin on a
trigger-anchored surface; a fixed timeline on something rapidly retriggering; a
layout property; a per-frame parent variable; missing reduced-motion handling;
ungated hover motion; symmetric press-and-release timing; and an
everything-at-once entrance where a short stagger belongs.

When proposing a fix, prefer the earlier move: delete the animation, reduce it,
correct the easing, correct the origin, make it interruptible, move it to the
compositor, make the timing asymmetric, then polish and tune cohesion.

## Alternate modes

- A whole-surface, read-only motion audit with an implementation plan is a
  different, larger job: [audit.md](audit.md).
- A reverse-lookup glossary for an effect that needs a name:
  [vocabulary.md](vocabulary.md).
- Deeper interaction craft is in [craft.md](craft.md), and the physical-motion
  model in [gestures.md](gestures.md).

None of these replaces this bounded post-change review gate.
