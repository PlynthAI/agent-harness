# Physical gesture models

For drag, swipe, sheets, momentum and direct manipulation. The project's tokens
and accessibility rules remain controlling over the numbers below.

## Direct response and tracking

- Respond visually on pointer-down; commit on pointer-up. Never add artificial
  latency on the input path.
- After roughly 10px of hysteresis establishes intent, track the gesture 1:1 and
  preserve the grab offset so the object does not jump to the pointer centre.
- Use pointer events and pointer capture; ignore extra touch points after a drag
  starts, and keep a short time-stamped position history for velocity.
- Detect plausible gestures in parallel, then cancel the losing recognisers once
  intent is clear. Feedback stays continuous throughout.

## Interruptibility

- Never lock input while an element is moving.
- On interruption, start from the presentation value currently on screen, not
  the old logical target.
- Retarget a spring while carrying the current velocity; a reversal must not hit
  a velocity wall.
- Use independent X and Y springs when the axis velocities differ.

## Springs, velocity and momentum

- Default physical repositioning to no overshoot, and reserve a slight bounce for
  a momentum-carrying release.
- Hand the release velocity to the spring. If the API expects a relative
  velocity, normalise it against the distance to the target.
- Project the resting position before choosing a snap point. The common
  exponential-decay model is `(velocity / 1000) * rate / (1 - rate)` with rate
  about 0.998; choose the nearest target to the projected endpoint, then animate
  with the release velocity.
- Use velocity direction in the commit or reverse decision: a short fast flick may
  be more intentional than a long slow drag.

## Boundaries and spatial continuity

- Rubber-band past bounds with progressively increasing resistance rather than a
  hard stop.
- Enter and exit on the same path. Anchor a popover, sheet or expansion to its
  source, and keep intermediate frames pointing toward the final state.
- Preserve wayfinding and an explicit cancel path throughout the gesture.

## Materials and depth

- Use the project's surface tokens, never a raw colour from an example.
- Translucency may clarify a floating toolbar or sheet. It consumes the project's
  framing budget, and it is not decoration.
- A modal task may use a dimming scrim; a parallel, non-blocking panel preserves
  flow without one. Contextual shadow or material weight should communicate real
  hierarchy.
- Support reduced transparency and increased contrast as well as reduced motion
  where the platform exposes them.

## Verification

Test pointer-down response, grab offset, threshold, cancel and reverse, velocity
handoff, projected snap, rubber-banding, multi-touch protection and rapid
interruption on real pointer and touch hardware. Verify normal, reduced-motion,
reduced-transparency and increased-contrast modes. Inspect frame continuity in
slow motion, and confirm that no gesture blocks keyboard operation.

## Fluid interface behaviour

Adapted from the `apple-design` method in emilkowalski/skills at commit
`85e8e2363b713506e1d5b6e07a0eb2da66be1bc3` (MIT).

- Interruptibility is the first principle rather than a refinement: an element is
  always redirectable from where it currently is.
- Prefer behaviour over a timeline. A spring settles from physics, so an
  interruption is a change of state rather than a restart, and the user's energy
  carries into the new direction.
- Hint the direction of the gesture while it is still in progress, so the outcome
  is legible before release.
- Use motion together with the other channels the platform offers for the same
  event. Where haptics or sound exist, coordinate them instead of relying on
  movement alone.
- Typography in a fluid interface is optical: size, tracking and leading are set
  by the role the text plays and by the size it actually renders at, not by a
  fixed table.
- The feel is settled on real hardware. A simulator is a step up from emulation
  and still misses the hand, so say which parts of a gesture were verified and
  which still need a device.
