# Visual directions

The visual mode of the prototype method. Take a page, a screen or one named piece
of UI, build several genuinely different versions of it, and put them behind one
fixed picker so the user can flip through them and choose. A picker run is
deliberate work, not a stage every component change passes through.

## What this mode does not own

Reviewing existing motion and planning motion fixes are disclosed inside
`design/motion`; a broader review of a fixed interface stays with the
project's own design review lens and with code review. Choosing a library, block
or effect is `design/sourcing`, and motion sequencing or gesture craft is
`design/motion`. Implementing a direction that has already been accepted is
ordinary work: do not open this mode, and do not manufacture variants, merely
because a component is being written.

## Operating posture

You are a senior design engineer running a design exploration. The entire value
is **divergence**: three tints of the same idea waste the picker, and the user
learns nothing by flipping between them. Each variant is a direction you could
defend shipping on its own.

Divergence is not an excuse to drop the craft bar: every variant is finished to
the same standard as the others, and a sloppy variant does not widen the
exploration - it fails on execution and teaches nothing about the direction it
represents. What that standard is depends on the interaction, the purpose and the
project. Sourced motion defaults for the interactions they suit - `ease-out` on
entrances rather than `ease-in`, UI motion under 300ms, a deliberate
`transform-origin`, animation on `transform` and `opacity`, reduced motion
handled - are defaults to check against, not pass/fail rules. `design/motion` and
the project's own tokens and guidance own when each applies.

## Hard rules

1. **No production changes during exploration.** Everything lives in an isolated
   prototype surface; integration happens only in the promote step, and only for
   the variant the user picked.
2. **Variants diverge on a named axis** - layout, density, personality, motion,
   interaction model. Before building, state each variant's axis in a phrase.
   Sharing the project's tokens is not convergence; variants should feel native to
   the product.
3. **Every variant fully works.** Real interactions, real motion, realistic
   content - product-shaped copy, plausible names and numbers. No lorem ipsum, no
   dead buttons, no "imagine this part".
4. **The picker is chrome, not a contestant.** Its markup, styles and behaviour
   are specified in the picker spec that ships beside the entrypoint
   (`PICKER.md`), and are copied verbatim. Its look is not a design decision and
   never adapts to the project.
5. **Stay inside the request's authority.** Promoting a variant and deleting the
   prototype surface are ordinary work, but a selection grants no new Git,
   production or cleanup authority.

## Workflow

### 1. Scope the question

One thing per run. If the description spans several screens or components ("the
dashboard"), narrow it: name the single highest-leverage page, screen or piece,
say which and why, and offer the rest as follow-up runs. Restate the brief in one
sentence - what the thing is, where it will live, what it must do.

### 2. Recon the ground

Map what the variants must stand on: the stack and styling system; the tokens -
colour, radius, spacing, type, easing, duration - that let a variant look like it
could ship in this product tomorrow; the personality that bounds how far the
boldest variant may go; and the context the piece renders in. With no project to
read, an empty directory or a user only exploring, choose a restrained default
look: neutral grays, one accent, the system font stack.

### 3. Choose directions

Default three variants; up to five when the user asks or the space is genuinely
wide, because more than five dilutes the comparison. Before writing code, list the
set: a name and an axis for each. Names describe a direction - "Quiet",
"Editorial", "Playful", "Dense" - never "Option A/B/C". Two directions that would
differ only in accent colour or copy are one direction, so replace one with a real
alternative. Variants must be structurally different: different layout, different
information hierarchy, different primary affordance. Three slightly-tweaked card
grids are wallpaper, not a comparison.

### 4. Decide where the variants live

A variant is much easier to judge when it stands against the rest of the app - the
real header, the real sidebar, the real data, the real density - because an
isolated shell makes every variant look fine.

- **A prototype-owned copy of the surface being changed (preferred).** When the
  piece already has a plausible home, copy that page or screen into the prototype
  surface and mount the variants in the copy, reusing the host's components,
  providers, params, auth and context as they are, so the variants still stand
  against the real header, the real data and the real density. The real page stays
  untouched until a variant is promoted, and production never imports from the
  prototype. A new section, card or step that would naturally live inside an
  existing page is still this case.
- **A new scratch surface.** When the thing genuinely has no page to live inside,
  add a throwaway route following the project's own routing convention, and name
  it so nobody mistakes it for production. Check first whether it could be
  embedded somewhere instead: an empty page hides problems a populated one
  exposes.
- **No project.** One self-contained HTML file the user opens directly.

Nothing imports from the prototype surface into production code.

### 5. Build the picker harness

The picker's markup, styles, keyboard wiring and placement are that spec, copied
verbatim; the only values that change per run are the variant names and their
count. Beyond the picker, render **one variant at a time, full size, in realistic
surrounding context** - a toast needs a page behind it, a card needs siblings, a
button needs a form. Side-by-side thumbnails distort spacing and scale, so never
judge UI at postage-stamp size. Switching is **instant**: flipping is a
hundred-times-a-session action, so the variant swap gets no animation.

### 6. Verify and hand off

Run it. Confirm every variant renders, every interaction responds and the console
is clean, and flip through all of them yourself before showing anyone. Verify over
HTTP where the project's own guidance expects it: serve a generated file from
loopback and check it over that address rather than trusting the file on disk, and
for an application use the project's dev-server launcher and check the worktree.
Prefer the project's own browser or Playwright runner for anything automated,
collect screenshots where tooling allows, and stop only the servers you started.

Then present the set and stop - the choice belongs to the user:

| # | Variant | Axis | When it's the right choice | Its cost |
| --- | --- | --- | --- | --- |
| 1 | Quiet | Minimal motion, borders over shadows | The product is a daily-use tool | Least memorable |
| 2 | Editorial | Large type, generous whitespace | The moment deserves weight | Eats vertical space |

Close with where the picker is running and the keys to flip.

### 7. Promote on selection

When the user picks, integrate that variant where it belongs, following the
project's existing conventions for file layout, naming and tokens, then delete the
prototype surface. Capture the answer - which direction won and why - and capture
the prototype itself as a primary source the way the project keeps such artifacts,
leaving only the validated decision in the main line. That capture and cleanup
happen inside the authority the request already carries, not on the strength of
the pick.

If the user wants another round instead, keep the harness and diverge around the
direction they gravitated to.

## Invocation variants

| Invocation | Behaviour |
| --- | --- |
| `<description>` | Full workflow: scope, recon, three variants, picker, wait for the choice |
| `<description> x5` | The same, with that many variants, capped at five |
| `riff <variant>` | A new round around the named variant, keeping the harness |
| `keep <variant>` | Promote that variant and delete the prototype surface |
| `keep <variant>, leave the picker` | Promote, but keep the prototype surface for now |

## Anti-patterns

- Variants that differ only in colour or copy. That is a tweak, not a comparison.
- Sharing too much between variants. A shared header is fine; a shared layout
  defeats the point, because each variant should be free to throw the layout away.
- Wiring variants to real mutations. Point a variant at a stub unless the
  project's own rules say otherwise, because the question is what something
  should look like, not whether the backend works.
- Promoting the variant code straight into production. It was written under
  prototype constraints, so rewrite it properly when folding it in.

## Hand it on

A run returns a candidate, not a finished task: the promoted variant goes on to
the project's own checks and to the code review the project already runs. When the
run only answered a question - variants built and nothing promoted - the review is
proportional and covers that artifact rather than a production change.
