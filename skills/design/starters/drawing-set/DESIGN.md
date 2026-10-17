---
version: alpha
name: Drawing Set
description: A construction-drawing system for technical explainers. Each part of the page is a numbered sheet in a ruled frame, each figure is a drawing with a detail bubble, and one markup blue shows the path of work.
colors:
  primary: "{colors.ink}"
  paper: "#EEF0F1"
  sheet: "#FFFFFF"
  ink: "#15181C"
  ink-2: "#444A52"
  ink-3: "#636A73"
  rule: "#B9BFC6"
  hair: "#DDE1E5"
  wash: "#F3F5F6"
  markup: "#2140C4"
  markup-ink: "#1A34A3"
  markup-wash: "#E7EBFB"
  on-markup: "#FFFFFF"
  paper-dark: "#0B0D10"
  sheet-dark: "#12151A"
  ink-dark: "#E8EBEE"
  ink-2-dark: "#B6BCC4"
  ink-3-dark: "#8F969F"
  rule-dark: "#444B54"
  hair-dark: "#262B32"
  wash-dark: "#181C22"
  markup-dark: "#8EA3FF"
  markup-ink-dark: "#A9B8FF"
  markup-wash-dark: "#1C2342"
  on-markup-dark: "#0B0D10"
typography:
  sheet-title:
    fontFamily: Archivo
    fontSize: 86.4px
    fontWeight: 760
    lineHeight: 0.92
    letterSpacing: -0.02em
    fontVariation: '"wdth" 72'
  sheet-title-sm:
    fontFamily: Archivo
    fontSize: 41.6px
    fontWeight: 760
    lineHeight: 0.92
    letterSpacing: -0.02em
    fontVariation: '"wdth" 72'
  section-title:
    fontFamily: Archivo
    fontSize: 34.4px
    fontWeight: 700
    lineHeight: 1.08
    letterSpacing: -0.015em
    fontVariation: '"wdth" 85'
  section-title-sm:
    fontFamily: Archivo
    fontSize: 24.8px
    fontWeight: 700
    lineHeight: 1.08
    letterSpacing: -0.015em
    fontVariation: '"wdth" 85'
  subhead:
    fontFamily: Archivo
    fontSize: 19.2px
    fontWeight: 700
    lineHeight: 1.25
    fontVariation: '"wdth" 92'
  lede:
    fontFamily: Archivo
    fontSize: 20.8px
    fontWeight: 400
    lineHeight: 1.5
  lede-sm:
    fontFamily: Archivo
    fontSize: 17.6px
    fontWeight: 400
    lineHeight: 1.5
  general-note:
    fontFamily: Archivo
    fontSize: 23.2px
    fontWeight: 500
    lineHeight: 1.4
    fontVariation: '"wdth" 92'
  body-md:
    fontFamily: Archivo
    fontSize: 17px
    fontWeight: 400
    lineHeight: 1.6
  body-sm:
    fontFamily: Archivo
    fontSize: 15.2px
    fontWeight: 400
    lineHeight: 1.45
  notes:
    fontFamily: Archivo
    fontSize: 14.72px
    fontWeight: 400
    lineHeight: 1.5
  drawing-sub:
    fontFamily: Archivo
    fontSize: 14.08px
    fontWeight: 400
    lineHeight: 1.45
  legend:
    fontFamily: Archivo
    fontSize: 13.44px
    fontWeight: 400
    lineHeight: 1.4
  foot:
    fontFamily: Archivo
    fontSize: 13.12px
    fontWeight: 400
    lineHeight: 1.5
  wordmark:
    fontFamily: Archivo
    fontSize: 16.8px
    fontWeight: 750
    lineHeight: 1
    letterSpacing: 0.01em
    fontVariation: '"wdth" 75'
  nav:
    fontFamily: Archivo
    fontSize: 13.12px
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: 0.04em
    fontVariation: '"wdth" 75'
  drawing-name:
    fontFamily: Archivo
    fontSize: 16px
    fontWeight: 720
    lineHeight: 1.2
    letterSpacing: 0.06em
    fontVariation: '"wdth" 75'
  schedule-title:
    fontFamily: Archivo
    fontSize: 14.4px
    fontWeight: 720
    lineHeight: 1.2
    letterSpacing: 0.07em
    fontVariation: '"wdth" 75'
  label:
    fontFamily: Archivo
    fontSize: 11.84px
    fontWeight: 650
    lineHeight: 1.2
    letterSpacing: 0.08em
    fontVariation: '"wdth" 75'
  title-block-value:
    fontFamily: Archivo
    fontSize: 16px
    fontWeight: 650
    lineHeight: 1.25
    fontVariation: '"wdth" 80'
  title-block-number:
    fontFamily: Archivo
    fontSize: 36.8px
    fontWeight: 760
    lineHeight: 1
    letterSpacing: -0.01em
    fontVariation: '"wdth" 70'
  ref-mono:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.2
  scale-mono:
    fontFamily: JetBrains Mono
    fontSize: 10.88px
    fontWeight: 400
    lineHeight: 1.2
  grid-ref:
    fontFamily: JetBrains Mono
    fontSize: 10.4px
    fontWeight: 400
    lineHeight: 1
  code:
    fontFamily: JetBrains Mono
    fontSize: 14.6px
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: -0.01em
  plate:
    fontFamily: JetBrains Mono
    fontSize: 12.8px
    fontWeight: 400
    lineHeight: 1.3
  fig-xl:
    fontFamily: Archivo
    fontSize: 24px
    fontWeight: 760
    letterSpacing: 0.01em
    fontVariation: '"wdth" 72'
  fig-lg:
    fontFamily: Archivo
    fontSize: 18px
    fontWeight: 720
    fontVariation: '"wdth" 80'
  fig-heading:
    fontFamily: Archivo
    fontSize: 14px
    fontWeight: 650
  fig-body:
    fontFamily: Archivo
    fontSize: 13px
    fontWeight: 400
  fig-label:
    fontFamily: Archivo
    fontSize: 11px
    fontWeight: 650
    letterSpacing: 0.08em
    fontVariation: '"wdth" 75'
  fig-mono:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: 450
  fig-mono-sm:
    fontFamily: JetBrains Mono
    fontSize: 10.5px
    fontWeight: 400
rounded:
  none: 0px
  plate: 2px
  control: 3px
  marker: 9999px
spacing:
  sheet-max: 1320px
  gutter: 40px
  gutter-phone: 16px
  ref-band: 22px
  frame: 1.5px
  sheet-gap: 48px
  sheet-gap-phone: 0px
  sheet-pad: 64px
  sheet-pad-bottom: 40px
  sheet-pad-phone-top: 28px
  sheet-pad-phone-bottom: 24px
  head-gap: 64px
  head-bottom: 44px
  head-after: 56px
  section: 96px
  section-phone: 48px
  section-title-after: 20px
  drawing: 48px
  drawing-phone: 28px
  drawing-pad: 32px
  drawing-pad-phone: 14px
  drawing-title-top: 13.6px
  bubble: 44px
  notes-column: 220px
  notes-gap: 64px
  note-indent: 33.6px
  column-gap: 48px
  title-block-top: 104px
  title-block-top-phone: 56px
  cell-pad-x: 13.6px
  cell-pad-y: 9.6px
  schedule-row-y: 11.2px
  schedule-cell-gap: 16px
  masthead-pad-y: 9.6px
  control: 40px
  touch: 44px
components:
  page:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
  page-dark:
    backgroundColor: "{colors.paper-dark}"
    textColor: "{colors.ink-dark}"
    typography: "{typography.body-md}"
  masthead:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    padding: "{spacing.masthead-pad-y}"
  masthead-dark:
    backgroundColor: "{colors.paper-dark}"
    textColor: "{colors.ink-dark}"
    padding: "{spacing.masthead-pad-y}"
  wordmark:
    textColor: "{colors.ink}"
    typography: "{typography.wordmark}"
  wordmark-set:
    textColor: "{colors.ink-3}"
    typography: "{typography.nav}"
  sheet-nav-link:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink-2}"
    typography: "{typography.nav}"
    rounded: "{rounded.control}"
  sheet-nav-current:
    backgroundColor: "{colors.markup}"
    textColor: "{colors.on-markup}"
    typography: "{typography.nav}"
    rounded: "{rounded.control}"
  sheet-nav-current-dark:
    backgroundColor: "{colors.markup-dark}"
    textColor: "{colors.on-markup-dark}"
    typography: "{typography.nav}"
    rounded: "{rounded.control}"
  sheet-menu:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    typography: "{typography.nav}"
    rounded: "{rounded.control}"
    height: "{spacing.control}"
  theme-switch:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.control}"
    size: "{spacing.control}"
  sheet:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "{spacing.sheet-pad}"
    width: "{spacing.sheet-max}"
  sheet-dark:
    backgroundColor: "{colors.sheet-dark}"
    textColor: "{colors.ink-dark}"
    rounded: "{rounded.none}"
    padding: "{spacing.sheet-pad}"
    width: "{spacing.sheet-max}"
  grid-reference:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink-3}"
    typography: "{typography.grid-ref}"
    size: "{spacing.ref-band}"
  sheet-title:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    typography: "{typography.sheet-title}"
  sheet-lede:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink-2}"
    typography: "{typography.lede}"
  sheet-lede-dark:
    backgroundColor: "{colors.sheet-dark}"
    textColor: "{colors.ink-2-dark}"
    typography: "{typography.lede}"
  section-title:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    typography: "{typography.section-title}"
  section-ref:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink-3}"
    typography: "{typography.ref-mono}"
  section-ref-dark:
    backgroundColor: "{colors.sheet-dark}"
    textColor: "{colors.ink-3-dark}"
    typography: "{typography.ref-mono}"
  prose:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
  label:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink-3}"
    typography: "{typography.label}"
  link:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.markup-ink}"
    typography: "{typography.body-md}"
  link-dark:
    backgroundColor: "{colors.sheet-dark}"
    textColor: "{colors.markup-ink-dark}"
    typography: "{typography.body-md}"
  inline-code:
    backgroundColor: "{colors.wash}"
    textColor: "{colors.ink}"
    typography: "{typography.code}"
    rounded: "{rounded.control}"
  inline-code-dark:
    backgroundColor: "{colors.wash-dark}"
    textColor: "{colors.ink-dark}"
    typography: "{typography.code}"
    rounded: "{rounded.control}"
  keyed-notes:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink-2}"
    typography: "{typography.notes}"
    width: "{spacing.notes-column}"
  note-marker:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    typography: "{typography.scale-mono}"
    rounded: "{rounded.marker}"
  general-note:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    typography: "{typography.general-note}"
    rounded: "{rounded.none}"
  drawing-body:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "{spacing.drawing-pad}"
  drawing-bubble:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    typography: "{typography.ref-mono}"
    rounded: "{rounded.marker}"
    size: "{spacing.bubble}"
  drawing-name:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    typography: "{typography.drawing-name}"
  drawing-sub:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink-2}"
    typography: "{typography.drawing-sub}"
  drawing-scale:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink-3}"
    typography: "{typography.scale-mono}"
  legend:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink-2}"
    typography: "{typography.legend}"
  schedule-caption:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    typography: "{typography.schedule-title}"
  schedule-head:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink-2}"
    typography: "{typography.label}"
  schedule-cell:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
    padding: "{spacing.schedule-row-y}"
  plate:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    typography: "{typography.plate}"
    rounded: "{rounded.plate}"
  status-pass:
    backgroundColor: "{colors.markup}"
    textColor: "{colors.on-markup}"
    typography: "{typography.plate}"
    rounded: "{rounded.plate}"
  title-block:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    typography: "{typography.title-block-value}"
    rounded: "{rounded.none}"
    padding: "{spacing.cell-pad-x}"
  title-block-number:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    typography: "{typography.title-block-number}"
  title-block-link-hover:
    backgroundColor: "{colors.markup-wash}"
    textColor: "{colors.ink}"
    typography: "{typography.title-block-value}"
  title-block-link-hover-dark:
    backgroundColor: "{colors.markup-wash-dark}"
    textColor: "{colors.ink-dark}"
    typography: "{typography.title-block-value}"
  rule-line:
    backgroundColor: "{colors.rule}"
    height: 1px
  rule-line-dark:
    backgroundColor: "{colors.rule-dark}"
    height: 1px
  hairline:
    backgroundColor: "{colors.hair}"
    height: 1px
  hairline-dark:
    backgroundColor: "{colors.hair-dark}"
    height: 1px
  site-foot:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink-3}"
    typography: "{typography.foot}"
  fig-box:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    typography: "{typography.fig-heading}"
    rounded: "{rounded.none}"
  fig-box-group:
    backgroundColor: "{colors.wash}"
    textColor: "{colors.ink}"
    typography: "{typography.fig-heading}"
    rounded: "{rounded.none}"
  fig-box-markup:
    backgroundColor: "{colors.markup-wash}"
    textColor: "{colors.markup-ink}"
    typography: "{typography.fig-heading}"
    rounded: "{rounded.none}"
  fig-box-markup-dark:
    backgroundColor: "{colors.markup-wash-dark}"
    textColor: "{colors.markup-ink-dark}"
    typography: "{typography.fig-heading}"
    rounded: "{rounded.none}"
  fig-label:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink-3}"
    typography: "{typography.fig-label}"
  fig-body:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink-2}"
    typography: "{typography.fig-body}"
  fig-mono:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    typography: "{typography.fig-mono}"
---

# Drawing Set

## Overview

**Creative North Star: "The issued drawing set."** The page reads like a set of construction drawings handed to someone who has to build from them. Every part of the explainer is a numbered sheet inside a ruled frame, with grid references in the margin and a title block at the foot. Every figure is a drawing: a ruled body, a detail bubble that says which drawing on which sheet it is, a short uppercase name, one sentence of description and "Scale: not to scale". Tables are schedules. Side remarks are keyed notes with circled numbers. A pull statement is a boxed general note.

The voice is a careful engineer, not a brochure. Type is one family, Archivo, used at several widths: condensed capitals for anything that names or labels (sheet titles, drawing names, labels, schedule heads) and normal width for prose. JetBrains Mono appears only for real identifiers: file names, commands, module names, sheet numbers and references. Colour is one ink on white sheets laid on a pale grey paper, plus one markup blue. **Line pattern carries meaning, colour never does on its own.**

The set is dense where the content is dense. Unlike a gallery of figures, a sheet carries real prose, keyed notes and schedules next to its drawings, and that is welcome: the drawings explain the shape, the prose and schedules carry the facts.

**Provenance.** Captured from the Astro explainer at `harness-explainer-2/site` (served at port 4512): `src/styles/global.css`, `src/layouts/Sheet.astro`, `src/components/` and `src/figures/`. That site is nine pages, one per sheet. This file restates it for a single-page build: the sheets stack down one page and the masthead links to them as anchors. Where the source had no rule (how many sheets, what a drawing may hold, how long a caption runs) this file adds one, and says so with "Single-page rule" or a Named Rule.

**Key characteristics:**
- A sheet is a framed white panel on grey paper, 1.5px Ink border, 22px grid reference bands on all four sides (columns 1 to 8, rows A to F).
- Condensed uppercase titles: the sheet title at 72% width and weight 760, drawing names at 75%.
- Square corners everywhere. Rounding exists only on small controls (2px plates, 3px buttons and inline code) and on circles (bubbles, note markers).
- Drawings use orthogonal lines with hops, solid ink boxes, and pattern (solid, double, dashed, dotted, break) for meaning.
- Markup blue is reserved for the path of work, the current state and the one actor who decides.
- Dark mode is a reverse print of the same set, not a new palette, with a manual switch that remembers the choice.

## Colors

One ink, one markup colour, two greys of paper. Dark values are the same roles reversed.

### Light

- **Paper** (#EEF0F1): the page behind the sheets, and the masthead (at 92% with a blur).
- **Sheet** (#FFFFFF): every sheet, every drawing body, every box fill in a drawing, the title block. Also the fill behind labels that sit on a border (the general note's label, the gap inside a double line).
- **Ink** (#15181C): text, the sheet frame, every rule that structures (section top rules, schedule caption rules, the title block grid), and figure linework. 16.6:1 on Sheet.
- **Ink 2** (#444A52): body copy that is secondary: the lede, keyed notes, drawing descriptions, figure body text, legend text, schedule headers. 8.95:1 on Sheet.
- **Ink 3** (#636A73): references and quiet labels: grid references, section refs, "Scale: not to scale", list markers, the masthead's "Drawing set", label text, skipped states. 5.47:1 on Sheet, 4.78:1 on Paper.
- **Rule** (#B9BFC6): the drawing body border, the masthead bottom rule, the grid reference band rules, control borders, the last schedule row. 1.85:1, so never a text colour.
- **Hair** (#DDE1E5): the lightest rule: schedule body rows, keyed note separators, the legend's top rule, inline code borders, hatching.
- **Wash** (#F3F5F6): the group box fill in drawings (`box-2`) and inline code. Never a page or section background.
- **Markup** (#2140C4): the path of work. Heavy lines, the datum, the current sheet in the navigation, a passing status, link underlines on hover, focus rings and text selection. 8.09:1 on Sheet.
- **Markup ink** (#1A34A3): blue text at any size: links, `t-mk` labels in drawings, the decider's name in a markup box. 10.17:1 on Sheet, 8.56:1 on Markup wash.
- **Markup wash** (#E7EBFB): the fill of a markup box in a drawing and the hover fill of the title block's previous and next links.
- **On markup** (#FFFFFF): text on a Markup fill.

### Dark

- **Paper dark** (#0B0D10), **Sheet dark** (#12151A), **Ink dark** (#E8EBEE), **Ink 2 dark** (#B6BCC4, 9.56:1 on Sheet dark), **Ink 3 dark** (#8F969F, 6.13:1), **Rule dark** (#444B54), **Hair dark** (#262B32), **Wash dark** (#181C22), **Markup dark** (#8EA3FF, 7.69:1), **Markup ink dark** (#A9B8FF, 9.57:1; 8.03:1 on Markup wash dark), **Markup wash dark** (#1C2342), **On markup dark** (#0B0D10, so text on a lit blue fill turns dark).

### Writing the tokens

Declare every role as a CSS custom property on `:root` with the light values: `--paper`, `--sheet`, `--ink`, `--ink-2`, `--ink-3`, `--rule`, `--hair`, `--wash`, `--markup`, `--markup-ink`, `--markup-wash`, `--on-markup`, plus `color-scheme: light`. Write the dark block twice with identical values and `color-scheme: dark`: once inside `@media (prefers-color-scheme: dark)` under `:root:not([data-theme='light'])`, and once under `:root[data-theme='dark']`. Every colour in the page and in every SVG comes from these variables through classes, so the theme switch and the system setting both repaint the drawings with no second copy. Add `<meta name="theme-color">` twice: #EEF0F1 for light, #0B0D10 for dark.

`::selection` uses Markup with On markup text. The scrollbar is `scrollbar-color: var(--rule) var(--paper)`.

### Named rules

**The Pattern Before Colour Rule.** Meaning in a drawing is carried by line pattern and box style, never by colour alone. Blue adds emphasis to something that is already distinguishable in greyscale: a markup path is also heavier (2.5px with round caps), a markup box also has a heavier border (1.75px), a passing status is also a filled plate. Print the page in greyscale in your head: every distinction must survive.

**The One Markup Rule.** Blue means "this is the path of work, the current state, or the one who decides" and nothing else. Never use it for decoration, section colour, category coding, icons or emphasis of a phrase. A drawing has one markup story (see The One Path Rule). In the page shell blue appears only on links, the current sheet in the navigation, focus rings, selection, the title block link hover and a passing status.

**The Markup Ink Rule.** Blue text always uses Markup ink, never Markup. Markup is for lines, fills and borders.

**The No Third Colour Rule.** There is no red, green, amber or any other hue. A failing status is a 3px border, a skipped one is dashed, an unavailable one is dotted, a cancelled one is struck through. Warnings are words.

## Typography

**Families.** Archivo (variable, with the width axis) for everything that is not an identifier; JetBrains Mono (variable) for identifiers. For a single HTML file load both from Google Fonts with the width axis included, so `font-stretch` works:

`https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,100..900&family=JetBrains+Mono:wght@100..800&display=swap`

Stacks: `'Archivo', system-ui, -apple-system, 'Segoe UI', sans-serif` and `'JetBrains Mono', ui-monospace, 'Cascadia Mono', monospace`. Set widths with `font-stretch` as a percentage (the `fontVariation` values in the frontmatter give the same width as a `wdth` value), never with a different family.

**Base.** Body is 1.0625rem (17px) with line height 1.6, `font-kerning: normal`, `text-rendering: optimizeLegibility` and antialiasing. Headings are weight 700 with `text-wrap: balance`. `strong` is weight 650, and inside the lede it turns Ink. Paragraphs have `margin: 0 0 1em`. Lists indent 1.2em, items are spaced 0.35em, and markers are Ink 3.

**The width ladder.** One family, five widths, each with one job:
- 70 to 72%: the sheet title and the sheet number in the title block (weight 760). The heaviest, tallest, most condensed type on the page.
- 75%: wordmark (750), navigation (600), labels (650), drawing names (720), keyed notes title (700), schedule captions (720) and schedule heads (650). Always uppercase with 0.04 to 0.08em tracking.
- 80 to 85%: section titles (85%, sentence case), title block values (80%), figure large titles (80%).
- 92%: subheads (h3) and the general note statement.
- 100%: all prose, the lede, keyed notes, drawing descriptions, schedule cells.

**Roles.**
- **Sheet title** (h1 on the first sheet, h2 on the others, same look): `clamp(2.6rem, 6.4vw, 5.4rem)`, 760, line height 0.92, -0.02em, uppercase, 72% width.
- **Lede**: `clamp(1.1rem, 1.6vw, 1.3rem)`, line height 1.5, Ink 2, at most 46ch.
- **Section title** (h2 in sections): `clamp(1.55rem, 2.8vw, 2.15rem)`, 700, line height 1.08, -0.015em, 85% width, sentence case.
- **Section ref**: JetBrains Mono 0.75rem, 500, Ink 3, pushed to the right end of the section title line, no wrap.
- **Subhead** (h3): 1.2rem, 92% width, line height 1.25, margin 2rem 0 0.6rem (0 when it opens a column).
- **Label** (`.label`): 0.74rem, 650, 0.08em, uppercase, 75% width, Ink 3.
- **Code** (`code`, `kbd`, `.mono`): JetBrains Mono at 0.86em, ligatures off, -0.01em. Inline code inside prose, list items, cells and definitions gets a Wash fill, a 1px Hair border, padding 0.05em 0.3em, radius 3px, Ink text and `overflow-wrap: anywhere`. Inside schedules a code cell does not wrap.

**Links.** Markup ink text with a 1px underline at 0.2em offset coloured `color-mix(in srgb, var(--markup) 55%, transparent)`. On hover the underline becomes 2px solid Markup. Both change over 0.2s. Links are never bold and never only colour: the underline is always there.

**Focus.** `:focus-visible` draws a 2px Markup outline, 3px offset, 2px radius, on every interactive element.

**The Condensed Means Name Rule.** Condensed uppercase type names things (a sheet, a drawing, a column, a zone). It never sets a sentence. Anything that reads as a sentence is set at 100% width in sentence case.

**The Mono Means Real Rule.** JetBrains Mono is only for a string that exists exactly as written: a file or folder name, a command, a module or service name, a sheet number, a reference. Descriptions of those things are Archivo.

## Layout

### The page grammar (single-page rule)

The page is a drawing set: a masthead, then a stack of sheets, then a one-paragraph site foot. Each sheet is a framed panel; the page itself has no other furniture.

1. **Masthead** (sticky): wordmark, sheet navigation, theme switch.
2. **Sheet G-001, cover.** Sheet head (the page h1 and the lede), Drawing 1 as the general arrangement of the whole subject, then sections: what it is for (prose with keyed notes) and a sheet index schedule listing every other sheet with what it answers. A glossary schedule may follow when the article defines terms.
3. **Sheets A-101, A-201 and so on**, one per topic, in the article's order. Each has a sheet head (title and lede), one lead drawing, then sections. A topic sheet holds one or two drawings.
4. **A G-002 sheet** only when the article has general material that is not a topic (a typical day, limits, how the page is kept current). It sits after the last topic sheet and holds sections only, with schedules or keyed notes rather than drawings if nothing needs drawing.
5. **Site foot**: one paragraph saying where the content comes from.

Sheet numbering: G for general sheets (G-001 cover, G-002 general notes), A for the arrangement sheets in steps of 100 (A-101, A-201, A-301). Every sheet has the id of its number in lowercase (`id="a-201"`) so the navigation, the sheet index and the title blocks link to it. Aim for six to ten sheets: fewer and the set loses its rhythm, more and the navigation stops fitting.

**The One Subject Sheet Rule.** A sheet covers one subject that its title names ("Where records live", "Who does what"). If two article sections are about the same subject they share a sheet; if one article section is about two subjects it becomes two sections on one sheet. Never put two unrelated drawings on one sheet to fill it.

**The Drawing First Rule.** On every topic sheet the lead drawing comes directly after the sheet head, before any section. The reader sees the shape, then reads the detail. A second drawing sits inside the section it belongs to, after that section's prose.

**The Sheet Head Rule.** The sheet title is 2 to 6 words in plain sentence wording (it is uppercased by CSS, so write it in sentence case). The lede is 30 to 60 words, ends with a full stop and bolds two to four of the key nouns it introduces. On a wide screen the title and lede sit side by side and align to the bottom; they never wrap to more than three title lines.

### Sections

A section is an h2 with an Ink 1px top rule and 0.9rem above the title, then content. The first section after a sheet head that has nothing between them drops its top rule, because the sheet head's heavy rule already opens it. Content patterns, in order of preference:

- **Prose with keyed notes** (`.with-notes`): a prose column of at most 68ch and a notes column of at least 220px, 64px apart at most (`clamp(24px, 4vw, 64px)`). Below 980px the notes drop under the prose.
- **Prose then a schedule**: a short paragraph that says what the schedule is for, then the schedule.
- **Two columns** (`.two-col`): two prose blocks with subheads, or two plate cards, `clamp(20px, 3vw, 48px)` apart. Three columns (`.three-col`) for three short peers, up to 40px apart. Both stack below 860px.
- **A general note**: one boxed statement, used at most once per sheet for the sentence the sheet exists to say.
- **A second drawing.**

**The Short Section Rule.** Section prose is at most three paragraphs of at most 90 words each. Anything longer is either a list of facts (make it a schedule), a set of asides (make them keyed notes) or a shape (draw it). Keyed notes hold one to four notes of at most 40 words each.

**The Ref Rule.** A section title may carry one ref, right-aligned: "Ref. <source file>" when the section restates a source, "See <sheet number>" when it is detailed elsewhere, or a count ("9 sheets"). Never a decoration, never two.

### Spacing and rhythm

- Sheet wrap: max 1320px, centred, padding `clamp(12px, 2.5vw, 32px)` top, `var(--gutter)` sides and `clamp(32px, 5vw, 64px)` bottom. Side gutter `--gutter: clamp(16px, 3.2vw, 40px)`. Sheets stack 48px apart (single-page rule).
- Sheet body padding: `clamp(24px, 4.5vw, 64px)` top, `clamp(18px, 4.5vw, 64px)` sides, `clamp(20px, 3vw, 40px)` bottom.
- Sheet head: grid `minmax(0, 1.15fr) minmax(0, 1fr)`, gap `clamp(24px, 4vw, 64px)`, aligned to the end, padding-bottom `clamp(24px, 3.5vw, 44px)`, a 1.5px Ink bottom rule, then `clamp(28px, 4vw, 56px)` before the next element. One column below 860px.
- Section top margin `clamp(48px, 7vw, 96px)`; title to content 1.25rem.
- Drawing margin `clamp(28px, 4vw, 48px)` above and below; drawing body padding `clamp(14px, 2.4vw, 32px)`.
- Title block margin-top `clamp(56px, 8vw, 104px)`.
- `html { scroll-padding-top: 5rem }` so anchored sheets clear the sticky masthead.

### On a phone

Below 720px the sheet loses its side and top borders, its shadow and its grid reference bands; it becomes a full-bleed white panel with a bottom Ink rule and body padding 28px 16px 24px, and the sheet wrap loses its side and top padding. Sheets then follow each other with no gap: the title block of one and the bottom rule mark the join. Below 760px every drawing swaps to its tall version. Below 720px schedules marked to stack become one block per row. Below 560px the drawing scale note is hidden. Below 480px the masthead drops the "Drawing set" subtitle. Nothing scrolls sideways at 375px.

## Elevation & Depth

The sheet is the only thing that lifts: `box-shadow: 0 1px 0 var(--rule), 0 30px 60px -40px rgb(0 0 0 / 0.25)`, the weight of paper on a table. The open sheet menu has `0 12px 32px -12px rgb(0 0 0 / 0.35)` because it floats over the page. The masthead is Paper at 92% with `backdrop-filter: saturate(1.2) blur(8px)` and a Rule bottom border. Nothing else has a shadow, a glow or a gradient.

**The Paper On A Table Rule.** Depth comes from the sheet sitting on the paper and from rule weight (1.5px Ink frames, 1px Ink section rules, 1px Rule and Hair lines), never from cards, tints or shadows inside the sheet.

## Shapes

Square by default. Radius 0 for the sheet, drawing bodies, the general note, schedules, the title block and every box in a drawing. Radius 2px for plates, status plates and route buttons; 3px for navigation links, the sheet menu button, the theme switch and inline code. Circles for the drawing bubble (44px) and the keyed note markers (1.45rem, 1.25px Ink border). Rule weights: 1.5px for the frame and anything that closes a block (sheet head, schedule caption, title block, keyed notes top, plate card top), 1px for structure inside it, and Hair for rows.

## Components

### Masthead

Sticky at the top, z-index 5. Inner row max 1320px, padding 0.6rem `var(--gutter)`, flex, centred items, 1.25rem gap.

- **Wordmark**: the subject's name as a link to the cover, uppercase, 75% width, 750, 1.05rem, 0.01em, Ink, no underline, then `<small>Drawing set</small>` in 500, Ink 3, 0.8rem, 0.06em. The words "Drawing set" are part of the look; keep them.
- **Sheet navigation** (`nav.sheetnav`, pushed right): one link per sheet, each "<number> <short name>" with the number in JetBrains Mono 0.72rem Ink 3 and the name in uppercase 75% width, 600, 0.82rem, 0.04em, Ink 2, padding 0.3rem 0.5rem, 1px transparent border, radius 3px, transitions 0.15s. Hover: Ink text, Rule border. Current: Markup fill, On markup text (number too). Short names are one or two words. Below 1540px the numbers hide (with more than nine sheets they hide at every width); below 1180px the whole list becomes the sheet menu.
- **Sheet menu** (`details.sheetmenu`): a summary button, min-height 40px, Rule border, radius 3px, showing the current sheet number in Markup ink mono and the word "Sheets" with a 12px chevron. Open: an Ink 1.5px bordered Sheet panel, up to 320px wide, right-aligned 6px under the button, one row per sheet with Hair separators, mono number column 3.6rem wide. A click outside closes it.
- **Theme switch**: see Motion and theme switch.

**Current sheet (single-page rule).** The current sheet is the one whose top has passed under the masthead. A small script with an `IntersectionObserver` sets `aria-current="true"` on its navigation link and updates the menu summary's number. Without the script no link is marked and the page still works.

### Sheet

`<section class="sheet" id="a-201" aria-labelledby="...">` as a 3 by 3 grid: `22px minmax(0, 1fr) 22px` columns and `22px auto 22px` rows, Sheet fill, 1.5px Ink border, the paper shadow. The four reference bands are flex rows or columns of `<span>`s, spaced around, JetBrains Mono 0.65rem Ink 3, not selectable, `aria-hidden="true"`: 1 to 8 along the top and bottom, A to F down the left and right. Every band has a 1px Rule border on the side that faces the body, so the four rules meet as an inner frame around the body. The body sits in the centre cell with `min-width: 0`.

### Sheet head

A `<header class="sheet-head">` with the title and the lede (see Typography and The Sheet Head Rule). A sheet that has no lede uses `.sheet-head.solo` (one column).

### Keyed notes

`<aside class="notes" aria-label="Keyed notes">` with a 1.5px Ink top rule, 0.92rem text, line height 1.5, Ink 2. Title "Keyed notes" as a label (75%, 700, 0.78rem, 0.08em, uppercase, Ink) with a Rule bottom border and 0.5rem vertical padding. An `<ol>` with a CSS counter: each item has padding 0.6rem 0 0.6rem 2.1rem, a Hair bottom rule, and a `::before` circle 1.45rem across with a 1.25px Ink border holding the number in mono 0.7rem.

### General note

A boxed statement: 1.5px Ink border, padding `clamp(18px, 2.6vw, 28px) clamp(18px, 3vw, 32px)`, max 60rem, 1.5rem vertical margin. Its label ("General note") sits on the top border: absolute at top -0.6rem, left 1rem, Sheet background, padding 0 0.5rem, Ink. The first paragraph is the statement: `clamp(1.15rem, 2vw, 1.45rem)`, 500, 92% width, line height 1.4, max 52ch. A second paragraph, if any, is 1rem, Ink 2, normal width.

### Drawing

`<figure class="dwg">`:
- **Body** (`.dwg-body`): 1px Rule border, Sheet fill, padding `clamp(14px, 2.4vw, 32px)`, overflow hidden. It holds the wide SVG (`class="only-wide"`) and the tall SVG (`class="only-tall"`), both `display: block; width: 100%; height: auto`. `.only-tall` is hidden by default; below 760px `.only-wide` hides and `.only-tall` shows (both with `!important`). A legend, when present, sits inside the body under the SVG.
- **Title row** (`figcaption.dwg-title`): flex, centred, 0.85rem gap, 0.85rem top padding.
  - **Bubble**: a 44px circle, 1.5px Ink border, split by a 1.25px Ink line into two halves: the drawing number on top (mono 0.85rem, 600) and the sheet number below (mono 0.55rem, Ink 2). `aria-hidden="true"`.
  - **Name** (`.dwg-name`): uppercase, 75% width, 720, 1rem, 0.06em, line height 1.2, with a 2px Ink underline (border-bottom, 0.15rem padding). Prefixed for screen readers with a visually hidden "Drawing <n>: ".
  - **Description** (`.dwg-sub`): 0.88rem, Ink 2, line height 1.45, max 70ch, 0.3rem under the name.
  - **Scale** (`.dwg-scale`): "Scale: not to scale" in mono 0.68rem Ink 3, pushed right and aligned to the top, hidden below 560px.

Drawings are numbered per sheet: the first drawing on A-301 is "1 over A-301".

**The Description Names The Pattern Rule.** The drawing description is one or two sentences, 15 to 40 words. Its job is to tell the reader how to read the drawing, not to repeat the prose: it names what the patterns, the break or the blue mean here ("Dashed boundaries are optional or outside Git. The dotted line shows every checkout reaching the same workspace."). The drawing name is 2 to 5 words and names the kind of drawing ("Records plan", "General arrangement", "Review pipeline", "Delivery ladder").

### Legend

A `<ul class="legend">` under a drawing, inside its body: flex, wrapping, gaps 0.6rem by 1.5rem, 1rem margin-top, 0.75rem padding-top, a Hair top rule, 0.84rem Ink 2, no bullets. Each item is a 40 by 12 SVG swatch drawn with the same classes as the drawing (a 36px line), then the meaning. Swatches available: copy or flow (solid), link (dashed), read (dotted), render (double), path (markup), datum (markup, labelled "Datum: what stays fixed") and break (a solid line with the break symbol in its middle).

**The Legend Lists What Is Drawn Rule.** A legend lists exactly the line patterns that appear in its drawing, in the order solid, double, dashed, dotted, markup, and only when the drawing uses two or more patterns or the description does not already name them. The wording of each pattern is the same everywhere on the page (see the pattern table below).

### Schedule

A wrapper (`.schedule-wrap`, margin 1.5rem 0 2rem) with a caption row and a table.
- **Caption** (`.schedule-cap`): flex, 1.5px Ink top rule, padding 0.5rem 0. Title uppercase, 75%, 720, 0.9rem, 0.07em ("Drawing list", "Glossary", "Routing schedule", "Role schedule"). An optional ref pushed right in mono 0.68rem Ink 3 (the sheet number, or a short qualifier).
- **Table** (`table.schedule`): full width, collapsed, 0.95rem, line height 1.45. Header cells: left, bottom-aligned, uppercase label style (75%, 650, 0.74rem, 0.08em, Ink 2), padding 0.5rem 1rem 0.5rem 0, 1px Rule top border and 1.5px Ink bottom border. Body cells: top-aligned, padding 0.7rem 1rem 0.7rem 0, Hair bottom rule; the last row's rule is Rule. The first column is 620 weight. A key column (`td.key`: sheet numbers, file names) is mono 0.85rem 500, no wrap. Muted text uses Ink 3.
- **Stacked on a phone** (`.schedule.stack`, below 720px): the header row is visually hidden; each row is a block with 0.75rem vertical padding and a Rule bottom border, the first with a 1.5px Ink top rule; the first cell is 1.05rem; every other cell shows its column name above it from `data-label` in the label style. Use stacking for any schedule of three or more columns.

**The Schedule Not Prose Rule.** A list of five or more parallel facts (terms, files, roles, sheets, routes) is a schedule. Each cell is a phrase or one short sentence; a cell over 30 words means the content belongs in prose.

### Plate and plate card

- **Plate** (`.plate`): an inline file or command label: mono 0.8rem, padding 0.12rem 0.45rem, 1.25px Ink border, radius 2px, Sheet fill, no wrap.
- **Plate card**: a 1.5px Ink top rule, 0.9rem top padding, a plate as its heading (0.6rem below), then a short list in Ink 2. Used in pairs or threes in `.two-col` or `.three-col` to compare two files or places.
- **Chip row**: plates in a wrapping row, 0.4rem apart, for a set of module or file names.

### Status plates

For a vocabulary of states, a `.status-grid`: three columns under a 1.5px Ink top rule, each item a status plate above a short explanation (0.92rem, Ink 2) with a Hair bottom rule; one column below 860px with the plate in a 7.5rem column beside its text. Status plate: mono 0.82rem, padding 0.2rem 0.6rem, 1.5px Ink border, radius 2px. Pass: Markup fill, On markup text. Fail: 3px border. Skipped: dashed. Unavailable: 2px dotted. Cancelled: struck through. Not run: Rule border, Ink 3 text.

### Title block

At the foot of every sheet, `<footer class="title-block" aria-label="Title block">`: a four-cell grid `1.3fr 1.6fr 1fr 0.9fr` in a 1.5px Ink border, cells separated by 1px Ink rules, cell padding 0.6rem 0.85rem 0.75rem. Each cell has a label (0.66rem) above a value (80% width, 650, 1rem, line height 1.25):
1. **Project**: the subject's full name.
2. **Sheet title**: this sheet's title.
3. **Drawn from**: "<source>, as of <date>".
4. **Sheet**: the sheet number in 70% width, 760, 2.3rem, line height 1.

Under the cells, spanning the grid with a 1px Ink top rule, two links: "Previous sheet" (left) and "Next sheet" (right, right-aligned, with a 1px Ink left rule), each a label over the target's title at 85% width, 680, 1.05rem, with the target number in mono 0.78rem Markup ink and an arrow (left arrow before, right arrow after). On the last sheet the right link is "Back to the start" with an up arrow, pointing at G-001. On the first sheet the left cell is empty. Hover fills the link with Markup wash over 0.15s. In a single page these are anchor links. Below 760px the cells form a 2 by 2 grid and the two links stack, both left-aligned.

### Site foot

Under the last sheet: one paragraph, max 1320px, centred, padding 0 `var(--gutter)` 40px, Ink 3, 0.82rem, line height 1.5. It says what the page explains, that every statement is drawn from the named source, and that names and dates are a snapshot.

### Skip link

`<a class="skip" href="#content">Skip to content</a>` off-screen until focused, then shown at the top left in Sheet on Ink.

### Motion and theme switch

Motion is small and functional.
- Hover transitions on links (0.2s on underline colour and thickness), navigation links, the theme switch and buttons (0.15s on colour, border and background), title block links (0.15s background). The house ease is `cubic-bezier(0.16, 1, 0.3, 1)` (`--ease-out`) for anything that moves into place.
- **The route draw.** The only animated drawing is an interactive route (a picker of buttons above a drawing). When a route is chosen, its markup path (4.5px, round joins and caps) draws in over 800ms on `cubic-bezier(0.3, 0, 0.2, 1)` by animating `stroke-dashoffset` from the path length to 0 with the Web Animations API, and the nodes on the route switch to Markup wash with a 2.5px Markup border while nodes off the route turn dashed Ink 3. Route buttons: 1.25px Ink border, radius 2px, min-height 44px, a mono number before the label; hover turns the border Markup and the text Markup ink; pressed (`aria-pressed="true"`) is a Markup fill with On markup text. Use this only where the article describes several routes through the same stages.
- **Reduced motion.** Under `prefers-reduced-motion: reduce` every transition and animation runs in 0.01ms and the route appears at once.

**The theme switch.** A 40px square button at the right of the masthead, transparent with a 1px Rule border, radius 3px, Ink 2 icon, hover Ink with an Ink border, `aria-label="Switch light or dark"`. Its icon is an 18px half-filled circle: a 7.25-radius circle stroked at 1.5 and the right half filled (`M10 2.75a7.25 7.25 0 0 1 0 14.5Z`), both in `currentColor`. Behaviour:
1. An inline script in `<head>`, before any CSS paints, reads `localStorage.getItem('theme')` inside try/catch and, if it is "light" or "dark", sets `document.documentElement.dataset.theme`.
2. A click reads the current theme (the `data-theme` value, else the system preference from `matchMedia('(prefers-color-scheme: dark)')`), sets the opposite on `data-theme` and stores it in localStorage inside try/catch.
3. With no stored choice the page follows the system. There is no third "system" state in the button.

### Drawings: what a good drawing looks like

The drawing grammar is a draughtsman's, not an illustrator's. Square boxes, orthogonal lines, labels set above what they label, real names in mono and meaning carried by line pattern.

**The One Question Rule.** Each drawing answers one question its sheet or section asks ("where does each record live?", "what runs between a finished slice and a push?"). Everything drawn serves that answer; anything else goes into the prose, a keyed note or a schedule.

**The Two Drawings Rule.** Every drawing is drawn twice: a wide version (`viewBox="0 0 1000 H"`, content from x 10 to x 990) and a tall phone version (`viewBox="0 0 360 H"`, content from x 10 to x 350). The tall version is redrawn, not scaled: columns become stacked bands, side-by-side peers stack, long text lines split, and descriptions shorten. Both versions carry the same facts and the same markup story. To fold a wide layout: zones become full-width bands one under another (x 10 to 350), each with its label above; a row of peers becomes a column with the connector running down the left third of the boxes; a two-column list inside a box becomes one column or two narrow ones; a return line runs down the right edge (x 340 to 350). Text in the tall version stays at the same pixel sizes, so at 360 units it renders at roughly true size on a phone.

**The Shared Rows Rule.** Everything sits on a grid. Columns share widths and gaps; boxes in one column share a left edge and width; peers across columns share a top edge and height. List rows use one pitch per drawing (22 to 30 units) and start at the same y in every column, so a connector between two rows runs perfectly straight. Arrows between neighbours are 26 to 28 units long and sit at the vertical centre of the shorter box. If two things are nearly aligned, align them exactly.

**The Orthogonal Line Rule.** Lines run horizontal and vertical only (`H` and `V` path commands). No curves and no diagonals, except the break symbol and a deliberate stair. Where two lines cross, the later one hops over with a 10-unit half circle (`H570 a10 10 0 0 1 20 0 H700`). Arrowheads come from per-drawing markers with prefixed ids and `markerUnits="userSpaceOnUse"`: an ink triangle (9 units), a markup triangle (11 units) and an ink dot (8 units) for "starts here". Several lines leaving one box share one trunk and split (a bus), rather than fanning out separately.

**The Pattern Table Rule.** Line pattern means the same thing on every drawing on the page:

| Pattern | Class | Meaning |
|---|---|---|
| Solid ink, 1.5px | `ln` | A copy, or the flow of work |
| Double (5px ink with a 2px sheet line inside) | `ln double` + `double-in` | Rendered or generated from another file |
| Dashed 7 5 | `ln dash` | Linked, handed across, or a return |
| Dotted 0.5 5, round, 2.2px | `ln dot` | Imported, read or loaded |
| Markup blue, 2.5px, round | `ln-mk` | The path of work |
| Break symbol (a zigzag in the line: `h4 l3 -7 l6 14 l3 -7 h4`) | `ln` path | This step does not imply or prove the next |
| Thin Ink 3, 1px | `ln-2` | A secondary connection or a dimension |

Boxes follow the same discipline:

| Box | Class | Meaning |
|---|---|---|
| Sheet fill, 1.5px Ink | `box` | A thing: a file, a folder, an agent, a stage |
| Wash fill, 1px Rule | `box-2` | A group or a minor item: a checkout inside a repo, a step token like `commit` |
| No fill, dashed 4 4 Ink 3 | `box-dash` | Optional, skipped, or outside Git; also a boundary around a phase |
| Hatched (45 degree Hair lines in an 8 unit pattern) inside a dashed box | `box-dash` + pattern | Scratch: disposable or bulky |
| Markup wash fill, 1.75px Markup | `box-mk` | The one actor who decides, or the current state |

**The One Path Rule.** A drawing has one markup story, told in one of three ways: a heavy markup path through the stages of the work; a datum, a markup line along the bottom with ticks under each stage and a markup label saying what stays fixed ("Datum: the approved release"); or markup boxes for the single actor who decides, with that actor's name in Markup ink. Never two of these in one drawing, never more than three markup boxes, and never a markup box as decoration. A drawing in which nothing is the path uses no blue at all.

**The Label Above Rule.** Zone and annotation labels are set in the label style (11px, 650, 75% width, uppercase, Ink 3) 10 units above the top-left corner of what they label ("Zone 1: in Git", "Staging: the build about to ship", "Pre-commit"). A label that explains a pattern within the drawing ("Each break: this step does not imply the next") sits at the top left of the drawing or right under the thing it explains. A label is a phrase, not a sentence; it may use a colon.

**The Text Ladder Rule.** Inside drawings, use only these text classes:
- `t-xl` (24px, 760, 72%, uppercase words): the name of a big actor or zone, at most two per drawing ("CLIENT", "SERVER").
- `t-lg` (18px, 720, 80%, written in capitals): the title of a large container box ("REPOSITORY", "PROJECT WORKSPACE").
- `t` (14px, 650, sentence case): the heading of an ordinary box ("Main checkout", "Standards").
- `t-body` (13px, Ink 2): a description under a heading, lowercase-first when it is a fragment ("commands, constraints"), sentence case when it is a sentence.
- `t-mono` (12px, 450): a real name ("README.md", "scheduler", "commit").
- `t-mono-sm` (10.5px, Ink 2): a small real-name list or a note under a group ("nightly, separate queue").
- `t-label`: labels, as above.
- `t-mk`: added to any of these to turn it Markup ink, for the decider's name or the datum label.
- `t-mid` and `t-end` for centred and end-anchored text.

**The Short Line Rule.** Text inside a drawing is short lines, never prose. A box holds a heading and at most three further lines. In the wide version a line is at most 46 characters of `t-body` or 30 characters of `t-mono`; in the tall version 38 and 26. One full sentence per drawing is allowed, as a `t-body` note at the foot of a zone ("Drafts and notes stay out of code commits.").

**The Real Name Rule.** Wherever the article names a real file, folder, command, module or service, the drawing uses that exact name in mono. Descriptions beside a name are lowercase-first fragments. Never invent a name for a thing the article names.

**The Full Sheet Rule.** A wide drawing uses the full 980 units. Zones in a two-zone layout are 470 and 480 wide with a 30 unit gutter; three zones are about 310 each. No empty area inside a drawing is larger than one box: shrink the viewBox height or move a note into the gap. A sequence of five or more stages runs left to right (or as a rising stair), never down one narrow column in the wide version.

**The Plain Box Rule.** Box text is left-aligned, inset 14 to 18 units from the box's left edge, with the heading baseline 22 to 28 units below the top. Only small token boxes (`commit`, `push`) centre their single mono word. Lines of a list inside a box share one pitch (15 to 26 units).

**Accessible drawings.** Each SVG has `role="img"` and `aria-labelledby` pointing at a `<title>` (the drawing's question as a phrase) and a `<desc>` that states what the drawing shows in two to five plain sentences, real names included. The tall version may fold the description into its title. Marker and pattern ids are prefixed per drawing and per version so they never collide.

**Before a drawing is done:**
- It has a wide and a tall version, and both tell the same story.
- Every line is horizontal or vertical, crossings hop, and every arrow ends on a box edge.
- Rows and peers align exactly; the drawing fills its width.
- Every pattern used appears in the pattern table and, if two or more are used, in a legend.
- There is at most one markup story.
- No line of text breaks the Short Line Rule; every real name is mono.
- The description names what the patterns or blue mean in this drawing.
- In dark mode every stroke and fill comes from a variable; there is no hard-coded colour.

## Do's and Don'ts

### Do

- Do stack the page as numbered sheets, each framed, each closing with its title block, and link them from the masthead.
- Do open every topic sheet with its title, its lede and its lead drawing, in that order.
- Do give every drawing a bubble, an uppercase name, a description that explains its patterns, and "Scale: not to scale".
- Do draw every drawing twice, wide and tall, and redraw the tall one rather than scaling.
- Do use line pattern for meaning, with the same meanings on every drawing, and a legend that lists only what is drawn.
- Do keep blue for the path of work, the current state and the one who decides.
- Do set names in condensed uppercase and sentences at normal width; real identifiers in mono.
- Do turn any list of five or more parallel facts into a schedule, and asides into keyed notes.
- Do keep the theme switch working with the system preference and a stored choice, and write the dark tokens twice.
- Do keep 4.5:1 for all text in both themes; Ink 3 is the faintest text colour.

### Don't

- Don't add eyebrows above headings, gradient text, card grids or coloured side borders.
- Don't round boxes in drawings, sheets, schedules or the title block.
- Don't use curves or diagonals for connectors, or let lines cross without a hop.
- Don't use a third colour for status or category; use border weight and pattern.
- Don't use Markup for text; use Markup ink.
- Don't put paragraphs inside drawing boxes, or more than three lines under a box heading.
- Don't fill a sheet with two unrelated drawings, or leave a drawing with a hole larger than one box.
- Don't use a shadow anywhere except the sheet and the open sheet menu.
- Don't use em dashes or en dashes in copy. Use British spelling.
