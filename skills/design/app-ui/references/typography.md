# Typography

Adapted from the `better-typography` method in jakubkrehel/skills at commit
`267330e1adfc66a718fb65fa6918c1f06d0a689e` (MIT), combined there with the
fundamentals method in bergside/typeui at commit
`2a977f1f6616ae8a5ea84a478ca35601c67f4322` (MIT). Both notices are in the
shared [third-party notices](../../../../THIRD_PARTY_NOTICES.md). The values below
are the source's defaults; the project's own type
tokens and scale win wherever they exist.

Typography is mostly restraint: a sensible scale, comfortable spacing, enough
contrast. A label, a table cell, a headline and an article paragraph do not share
one set of rules. When reviewing, read the rendered page rather than the code -
bad wrapping, widows and truncation only appear at real content lengths.

The words themselves, semantic heading structure, spatial RTL layout and colour
contrast belong to their own owners: the `design/colour` method measures a
rendered pair, and the project's accessibility method classifies the requirement.
This reference owns how text renders, wraps and behaves.

## Hierarchy and scale

- Define a small set of sizes and deviate from it as little as possible. Ad hoc
  sizes with no system behind them break down as the interface grows.
- Map heading levels to descending steps of that scale, so a visually subordinate
  heading never overpowers its parent. Adjacent levels may share a size toward
  the small end as long as weight or spacing keeps them distinct.
- The heading element is chosen for its semantics; the size is set in styling.
  Semantic structure belongs to the project's accessibility method.
- Solo, clear names such as `text-sm` are fine when the usage rules are obvious.
  On a team, name sizes by use (`text-body-sm`) so the rules survive other people.
- Pair fonts for contrast rather than similarity. A serif heading over a sans
  body reads as deliberate; two near-identical sans-serifs read as a mistake.
  Rarely use more than three families, and weight and size define hierarchy.

## One role per job

- A type role is a combination of face, size, weight, tracking, case, line height,
  measure and surrounding spacing.
  Each role does one job across the whole surface, and every instance of that
  job uses it.
- Choose the roles the content needs: headings, body, supporting text, captions,
  controls and diagram labels. A request for consistent text sizes means
  consistent treatment within those roles, not equal size across different jobs.
  Preserve visible hierarchy through size, weight and space together.
- Two roles that can only be told apart by colour are one role done
  inconsistently. Merge them, or separate them in more than colour: size, face,
  case or a mark.
- Related labels share a role when they do the same reading job. A section
  heading and a caption need not share one merely because both are labels.
  If the system gives a role its accent colour, apply it consistently to that
  role rather than to arbitrary instances.

## Rendering the face

- Use the compressed web format the project already loads, and load the weights
  and styles the design actually uses. A browser synthesises a weight or style
  the family does not provide, which distorts the real face.
- Turning synthesis off erases emphasis rather than reporting it. Disable it only
  after confirming every required bold, italic, small-cap, superscript and
  subscript form stays distinct across the fallback stack.
- Prefer the CSS property over the raw feature tag: the numeric weight property,
  optical sizing, and the tabular-numeral property all keep working when a
  non-variable fallback renders. Reserve raw tags for custom axes and niche
  features that have no property of their own.
- On macOS, text renders heavier than intended. Apply the antialiasing pair once
  on the root layout, never per component.

## Spacing and measure

- Line height by role: headings tight, around `1.1`; body copy `1.5` to `1.6`.
  Prefer unitless values so the line height scales with the size.
- Tight line height belongs to short text. Anything that wraps to three or more
  lines needs at least `1.4`, even in a height-constrained row.
- Large headings often read better with slightly negative letter-spacing; small
  uppercase labels need a little positive letter-spacing or the letters feel
  crowded; body copy at reading sizes needs neither.
- Cap long-form text around 60-75 characters per line. Any unit works as long as
  a cap exists and the line length lands in that range.

## Floors for size and weight

- Start long-form body text at the browser default and move off it only for a
  reason you can name: the typeface runs small, the measure is narrow, or the
  product is a dense professional tool.
- Interface text can go smaller: around `14px` for inputs and menus, `13px` for
  captions, and rarely below `12px`.
- Below `18px`, stay at regular weight or heavier. Thin weights are display-only
  at large sizes and disappear at text sizes.
- An input's text stays at `16px` on mobile or the page zooms when it is focused.
  Fix the size rather than disabling zoom.

## Wrapping and punctuation

- Four declarations do four jobs: balanced wrapping distributes a heading evenly
  across lines; pretty wrapping stops a single short word landing alone on the
  final line; word breaking stops a long word, link or identifier escaping its
  container; nowrap holds a label or badge together. Skip the balancing and
  pretty modes in long-form text.
- Store copy in natural case and control presentation with the case transform, so
  a redesign never means rewriting text.
- Use the typography characters rather than typed approximations: curly quotes in
  prose and straight quotes in code, an en dash for ranges, the single ellipsis
  character, a non-breaking space to keep a number and its unit together across a
  line break, and a soft hyphen to say where a long word may break.
- Justified text belongs to specific editorial layouts, not to an interface.

## Numbers, underlines and truncation

- Digits have different widths by default, so a timer, counter or price shifts
  the layout as it updates. Apply tabular numerals to any value that changes.
- Take underline position and thickness from the font's own metrics, keep the
  strike-out skip-ink behaviour so descenders are not cut, and use a dotted
  underline as the cue that a word carries extra information. Colour is the only
  part of a real underline that animates reliably, so build the underline as a
  separate element when anything else has to move.
- Truncation hides content. Where the missing text matters, keep the full value
  reachable by tooltip, expansion or keyboard. A label that identifies its own
  control never truncates; reflow the surrounding layout instead.

## Language, selection and content

- Set the document language so browsers and assistive technology pick the right
  pronunciation, quotes and hyphenation, and set direction at the boundary where
  it changes. Preserve digit order and isolate a mixed-direction value with the
  bidi element.
- Keep text selectable by default. Selection styling may carry brand into the
  reading experience as long as the selected combination stays legible.
  Suppressing selection belongs to a draggable or gesture-driven surface where it
  interferes, never across the interface.

## Reviewing type

Read the rendered page. Without a browser, check the computed size and weight of
each heading level and confirm they descend, read the declared line height and
measure, and check the truncation rules against realistic string lengths. With
one, resize the viewport to catch wrapping, widows and truncation at real content
lengths. Report every check you could not run as not verified.

Group findings under the principle each violates, highest severity first, one row
per root cause listing every location it appears in, with the location, the
before, the after and the principle the change restores. A blocking finding is
text that is unreadable or content truncated with no way to recover it; a
noticeable one breaks the type system or the heading hierarchy; the rest is
polish. State plainly when there is nothing to report, and never claim coverage
that was not inspected.
