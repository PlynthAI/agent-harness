# Component motion craft

Entry, exit and state craft for individual components. Values come from the
project's motion tokens; the numbers here are defaults for a project that has
none.

## Decide before animating

1. **Frequency:** repeated keyboard and hundred-a-day actions are instant; many-a-
   day interactions are removed or drastically reduced; occasional state changes
   may use standard motion; rare moments may carry restrained delight.
2. **Purpose:** require spatial continuity, state indication, explanation,
   feedback, or the prevention of a jarring change.
3. **Timing role:** enter and exit usually share one easing role, movement
   between visible positions another, drawers a third; constant progress may be
   linear. Never use `ease-in` for product interface motion.
4. **Duration:** select the project's named duration token and stay inside its
   budget, except for real hold or progress time.

## Entry, exit and state craft

- Prefer CSS transitions for rapidly retriggered state. They retarget from the
  current value; keyframes replay a fixed timeline.
- Use a progressive CSS entrance such as `@starting-style` where supported, and
  keep the final content visible by default. Do not gate evidence on a transition
  hook.
- Never enter from `scale(0)`. Use a subtle non-zero scale with opacity only when
  scale clarifies origin or relationship.
- A trigger-anchored popover uses the library's transform-origin variable; a
  centred modal stays centred.
- Give the first tooltip an intentional delay. While traversing an already-open
  tooltip group, use the library's skip-delay state and skip the animation.
- Make enter and exit asymmetric: the system's dismissal is shorter than the
  deliberate phase, and both preserve the same spatial path.
- When a crossfade exposes two competing states, a subtle blur can mask the seam.
  Start around 2px, avoid heavy blur, and verify performance.

## Transform and layout

- Percentage translations are relative to the moving element, so a full-height
  translation hides a variable-height sheet without a pixel guess.
- `scale()` affects children too; use it deliberately for coherent press
  feedback, not for layout sizing.
- Set `transform-origin` from the interaction source.
- Use `clip-path` or masks for reveals, comparison wipes and coordinated state
  changes only when they preserve meaning and stay smooth.
- Keep a stagger short and semantic. It must never delay access or blanket every
  section with the same reveal.

## Performance and accessibility

- Prefer `transform`, `opacity` and colour. Avoid animating width, height, margin,
  padding, top and left.
- Do not update an inherited parent CSS variable every frame to move one child;
  update the element transform directly.
- Prefer CSS for predetermined motion, the platform animation API for programmatic
  compositor work, and the existing spring stack for dynamic gestures. Add no
  dependency for a micro-interaction.
- Treat a library shorthand transform as a performance risk under load and verify
  the generated work and frames instead of assuming acceleration.
- Gate hover motion with `(hover: hover) and (pointer: fine)`.
- Reduced motion keeps useful opacity and colour feedback and removes translation,
  scale, parallax and spring behaviour.

## Interaction craft: the invisible details

Adapted from the `emil-design-eng` method in emilkowalski/skills at commit
`85e8e2363b713506e1d5b6e07a0eb2da66be1bc3` (MIT). Its catalogue is the source of
the values below; the project's tokens still win.

- Reach for a strong curve rather than a built-in easing, which is usually too
  weak to read as intentional. A workable default for entering is near
  `cubic-bezier(0.23, 1, 0.32, 1)` and for on-screen movement near
  `cubic-bezier(0.77, 0, 0.175, 1)`; a drawer follows the platform's own curve.
  Take a known strong variant of the role rather than inventing a curve.
- Budget duration by role: press feedback around 100-160ms, tooltips and small
  popovers 125-200ms, dropdowns and selects 150-250ms, modals and drawers
  200-500ms, explanatory motion longer.
- Perceived performance is part of the design. A faster spin, a shorter select
  and an instant second tooltip make an unchanged wait feel quicker.
- Press feedback is a small scale, about 0.95-0.98, and it is never the only
  feedback the control gives.
- Decorative motion belongs where the interface is not being read for data. A
  functional chart gains nothing from a spring.
- Suppress transitions on first paint and on a theme switch, or the whole page
  animates when nothing the user did asked for it.
- Cohesion outranks any single value: match pacing and easing to the personality
  of the surface, and let a playful component be bouncier than a dashboard.
- Review the work with fresh eyes the next day, and in slow motion or frame by
  frame. Timing problems between coordinated properties are invisible at full
  speed. Ask specifically whether colours blend or overlap as two states, whether
  the easing starts or stops abruptly, whether the origin is right, and whether
  the animated properties stay in sync.
