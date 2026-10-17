---
version: alpha
name: Sociotype
description: A white-paper gallery system where huge display type is the subject, the interface whispers in small tracked labels, corners stay square and one full-bleed photograph is the only colour.
colors:
  primary: "{colors.ink}"
  paper: "#FFFFFF"
  ink: "#000000"
  body: "#1A1818"
  muted: "#737373"
  list-rule: "#9D9D9D"
  rule: "#D6D6D6"
  paper-dark: "#0B0B0B"
  ink-dark: "#F5F5F5"
  body-dark: "#E3E1E1"
  muted-dark: "#9A9A9A"
  list-rule-dark: "#5A5A5A"
  rule-dark: "#2E2E2E"
typography:
  specimen:
    fontFamily: Instrument Serif
    fontSize: 251px
    fontWeight: 400
    lineHeight: 1.25
    letterSpacing: 0.001em
  headline-lg:
    fontFamily: Inter Variable
    fontSize: 40px
    fontWeight: 400
    lineHeight: 1
    letterSpacing: 0.015em
  headline-md:
    fontFamily: Inter Variable
    fontSize: 26px
    fontWeight: 400
    lineHeight: 1.13
    letterSpacing: 0.015em
  headline-sm:
    fontFamily: Inter Variable
    fontSize: 18px
    fontWeight: 400
    lineHeight: 1.19
    letterSpacing: 0.025em
  body-lg:
    fontFamily: Inter Variable
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.22
    letterSpacing: 0.015em
  body:
    fontFamily: Inter Variable
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.29
    letterSpacing: 0.015em
  nav:
    fontFamily: Inter Variable
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.33
    letterSpacing: 0.025em
  wordmark:
    fontFamily: Inter Variable
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1
    letterSpacing: 0.08em
  meta:
    fontFamily: Inter Variable
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.33
    letterSpacing: 0.08em
  caption:
    fontFamily: Inter Variable
    fontSize: 11px
    fontWeight: 400
    lineHeight: 1.38
    letterSpacing: 0.08em
  count:
    fontFamily: Inter Variable
    fontSize: 11px
    fontWeight: 400
    lineHeight: 1.38
    letterSpacing: 0.05em
rounded:
  none: 0px
spacing:
  page-max: 1200px
  gutter: 24px
  gutter-phone: 16px
  tight: 6px
  xs: 8px
  list-y: 9px
  sm: 12px
  md: 24px
  paragraph-after: 30px
  nav-gap: 50px
  section: 120px
  section-lg: 140px
  rail: 120px
  measure: 540px
  glyph: 12px
components:
  page:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
  page-dark:
    backgroundColor: "{colors.paper-dark}"
    textColor: "{colors.ink-dark}"
    typography: "{typography.body}"
  nav-link:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.nav}"
  wordmark:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.wordmark}"
  hero-title:
    textColor: "{colors.paper}"
    typography: "{typography.body-lg}"
  hero-text:
    textColor: "{colors.paper}"
    typography: "{typography.nav}"
  hero-counter:
    textColor: "{colors.paper}"
    typography: "{typography.body-lg}"
  hero-specimen:
    textColor: "{colors.paper}"
    typography: "{typography.specimen}"
  specimen:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.specimen}"
  specimen-dark:
    backgroundColor: "{colors.paper-dark}"
    textColor: "{colors.ink-dark}"
    typography: "{typography.specimen}"
  specimen-meta:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.meta}"
  specimen-meta-dark:
    backgroundColor: "{colors.paper-dark}"
    textColor: "{colors.ink-dark}"
    typography: "{typography.meta}"
  size-control:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.muted}"
    typography: "{typography.meta}"
  size-control-dark:
    backgroundColor: "{colors.paper-dark}"
    textColor: "{colors.muted-dark}"
    typography: "{typography.meta}"
  section-rule:
    backgroundColor: "{colors.rule}"
    height: 1px
  section-rule-dark:
    backgroundColor: "{colors.rule-dark}"
    height: 1px
  heading:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.headline-lg}"
  section-heading:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.headline-md}"
  sub-heading:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.headline-sm}"
  category-rail:
    width: "{spacing.rail}"
  category-name:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
  category-count:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.muted}"
    typography: "{typography.count}"
  category-count-dark:
    backgroundColor: "{colors.paper-dark}"
    textColor: "{colors.muted-dark}"
    typography: "{typography.count}"
  list-rule:
    backgroundColor: "{colors.list-rule}"
    height: 1px
  list-rule-dark:
    backgroundColor: "{colors.list-rule-dark}"
    height: 1px
  description:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.body}"
    typography: "{typography.body-lg}"
    width: "{spacing.measure}"
  description-dark:
    backgroundColor: "{colors.paper-dark}"
    textColor: "{colors.body-dark}"
    typography: "{typography.body-lg}"
    width: "{spacing.measure}"
  arrow-link:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.body-lg}"
  caption:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.muted}"
    typography: "{typography.caption}"
  glyph:
    textColor: "{colors.muted}"
    size: "{spacing.glyph}"
  focus-ring:
    rounded: "{rounded.none}"
---

# Sociotype

## Overview

Sociotype is a system for sites whose product is something to look at closely: a type foundry, a print shop, a catalogue of objects or artworks. The page behaves like a specimen book in a browser. One word set very large is the subject; everything around it is small, tracked and quiet, like the label beside a museum piece.

The ground is white paper, the lines are black or grey hairlines, corners are square and there are no shadows. The interface has no colour at all. Colour arrives once per page, in a full-bleed atmospheric photograph at the top that rotates through a few featured items, and that photograph is the only saturated thing on the site.

Key characteristics:

- White paper, black ink, a near-black for reading text and three greys.
- No accent and no tinted surfaces. The hero photograph carries all the colour.
- One UI family at weight 400 only, tracked between 0.015em and 0.08em.
- A display face at specimen size (up to 251px) as the subject of each page.
- 0px corners on everything.
- Hairline rules, 1px, in two greys. Arrows on text links instead of buttons.

Provenance: direction reference captured from the Sociotype type foundry website, 3 October 2026. The source has no dark mode; the dark set below is derived for this starter and is optional.

## Colors

- **Paper (#FFFFFF):** The page, every section and every card. There are no fills. Also the colour of text laid over the hero photograph. Dark: `paper-dark` (#0B0B0B).
- **Ink (#000000):** Specimens, headings, nav, links, the wordmark, specimen meta. Dark: `ink-dark` (#F5F5F5).
- **Body (#1A1818):** Paragraphs and descriptions, a touch softer than pure black for long reading. Dark: `body-dark` (#E3E1E1).
- **Muted (#737373):** Captions, style counts, the size control, outlined glyphs, secondary metadata. Dark: `muted-dark` (#9A9A9A).
- **List rule (#9D9D9D):** Hairlines between entries in the category rail. Dark: `list-rule-dark` (#5A5A5A).
- **Rule (#D6D6D6):** Section dividers and the line under the specimen meta row. Dark: `rule-dark` (#2E2E2E).

`primary` aliases Ink. There is no action colour.

Accessibility correction to the capture. The capture's muted grey, #818181, measures 3.9:1 on white, below AA for the 11 to 12px text it sets. This starter darkens it to #737373 (4.7:1), which keeps the grey read.

Measured contrast (WCAG): ink on paper 21.0, body on paper 17.7, muted on paper 4.7. Dark: ink 18.0, body 15.1, muted 7.0. List rule and Rule are hairline colours and never carry text. White text over the hero photograph has no fixed ratio: choose and crop images so the areas under text stay dark (see Imagery and assets).

Theme mechanics, if dark is used: dark applies under `prefers-color-scheme: dark` unless the root carries `data-theme="light"`; `data-theme="dark"` forces it. Set `color-scheme: dark`. The hero photograph does not change.

## Typography

Two roles, two families: a display face for the specimen and a UI face for everything else (see Fonts). Both at weight 400 only. Size alone carries hierarchy: 11, 12, 14, 16, 18, 26, 40, then the specimen.

- **Specimen** (`specimen`): one word set very large, the subject of the page. Up to 251px, line height 1.25, tracking 0.001em (effectively none). Fluid: `clamp(72px, 18vw, 251px)`. Turn on standard ligatures (`liga`) for faces that use them.
- **Headline large** (`headline-lg`): page titles. 40px, line height 1, tracking 0.015em.
- **Headline** (`headline-md`): section titles. 26px, line height 1.13, tracking 0.015em.
- **Headline small** (`headline-sm`): sub-titles. 18px, line height 1.19, tracking 0.025em.
- **Body large** (`body-lg`): descriptions, arrow links, the hero title and the hero counter. 16px, line height 1.22, tracking 0.015em.
- **Body** (`body`): the page default and rail entries. 14px, line height 1.29, tracking 0.015em. The smallest size for anything read as prose.
- **Nav** (`nav`): top bar links and the hero description. 12px, line height 1.33, tracking 0.025em.
- **Wordmark** (`wordmark`): the centred name in the top bar. 14px, tracking 0.08em, capitals through `text-transform`.
- **Meta** (`meta`): specimen meta row and the size control. 12px, tracking 0.08em.
- **Caption** (`caption`): the smallest labels. 11px, line height 1.38, tracking 0.08em.
- **Count** (`count`): style counts under rail entries ("12 styles"). 11px, tracking 0.05em.

Rules: tracking widens as size drops, from 0.015em at 14px and up, to 0.025em at 12px links, to 0.05 to 0.08em at 11 to 12px labels; the specimen alone is untracked. Never bold. Sentence case for everything except the wordmark.

## Fonts

Both faces come from the design skill's `references/fonts.md` and load with the load line given there.

- **Onsite** (the source's own commercial neo-grotesque UI face, extracted under two names, "Onsite" and "Main Onsite"). The closest face in the catalogue: **Inter Variable** (SIL Open Font License), a neo-grotesque that keeps one calm voice at weight 400 and stays legible tracked at 11 and 12px; load `{ "type": "npm", "package": "@fontsource-variable/inter" }`, stack `"Inter Variable", ui-sans-serif, sans-serif`. The quiet UI voice does not depend on Onsite itself.
- **Avec Sharp, Ceno, Meso, Gestura and Rework** (the source's commercial retail faces, shown as specimens). They are the products on sale, not a house face. The closest face in the catalogue for the specimen role: **Instrument Serif** (SIL Open Font License), an editorial display serif drawn for large sizes at weight 400; load `{ "type": "npm", "package": "@fontsource/instrument-serif" }`, stack `"Instrument Serif", serif`. A project that sells or showcases its own faces sets each specimen in that face instead.

## Layout

A centred column 1200px wide (`page-max`) with 24px gutters, 16px on a phone (both chosen for this starter; the capture gives none). The hero is full bleed outside the column. Section rhythm is generous: 120px between sections (`section`), 140px before a major break.

1. **Top bar.** Transparent, over the hero. Left: one or two links. Centre: the wordmark. Right: four links, 50px apart. No fill, no border, no shadow. It stays at the top while scrolling.
2. **Hero.** A full-viewport photograph. Top left: the featured item's title and a one-paragraph description at half the hero's width, 6px apart. Top right: the counter ("1/5"). Bottom left: the featured name set at specimen size in white.
3. **Specimen page.** A meta row (family and style name on the left; size readout, size control and full-screen glyph on the right), a 1px Rule under it, then the specimen flush to the column edges with no padding. Below: a two-column block, a 120px category rail on the left and a description up to 540px wide on the right, 30px above an arrow link.
4. Nothing else. No sidebar, no breadcrumbs, no footer chrome, no card grids, no pricing tables. Every page is one long specimen wall separated by hairlines.

On a phone (below 800px, chosen for this starter) the specimen follows its `clamp`, the rail sits above the description at full width, the wordmark moves left and the right-hand links fold behind a text "Menu" link. The hero keeps its full-viewport photograph.

## Elevation & Depth

None. Separation comes from three things only: whitespace, 1px Rule lines between sections and 1px List rule lines between rail entries. The specimen floats on white because nothing else competes with it.

**The Flat Rule.** No shadow, gradient, blur, tint or fill anywhere, including over the hero photograph.

## Shapes

Every corner is 0px (`none`): buttons, inputs, tags, images, the hero and the focus ring. Lines are 1px, never thicker, never doubled. The only drawn shapes are the 12px outlined glyphs (full screen, close, menu) at a 1px stroke in Muted.

## Components

- **Top bar.** Nav links in Nav type, Ink (Paper over the hero photograph). Wordmark centred. Links change only by an underline on hover (not in the capture, derived): 1px at a 3px offset.
- **Hero.** Photograph full bleed, no tint, no overlay, 0px corners. Title in Body large and description in Nav type, both Paper, top left. Counter in Body large, Paper, top right; it is also the control (see Motion). Featured name at specimen size, Paper, bottom left.
- **Specimen.** One word, set in the face it shows, at the Specimen role in Ink on Paper, flush to the column edges.
- **Specimen meta row.** Left: family and style in Meta, Ink, with a wide gap between them ("Display    Regular"). Right: the current size ("96px") in Meta, Muted, a size control and a 12px full-screen glyph. A 1px Rule under the row, no padding above or below it.
- **Size control.** A text-only control in Meta, Muted: no border, no fill. Opens a short list of sizes. The full-screen toggle beside it is a 12px outlined square glyph.
- **Category rail.** A 120px column listing sub-families ("Text", "Display", "Mono"). Each entry: name in Body, Ink; style count beneath in Count, Muted; 9px vertical padding; a 1px List rule between entries.
- **Description.** One paragraph in Body large, Body colour, up to 540px, 30px of space below.
- **Arrow link.** Text in Body large, Ink, followed by a space and a right arrow ("Details →"). No underline, no border, no colour change: the arrow is the affordance. Hover (derived): the arrow moves 3px right.
- **Focus.** Not in the capture; added: a 1px Ink outline offset 3px, square, on `:focus-visible`; Paper over the hero photograph.

### Motion

- **Hero rotation.** The hero cycles through its featured items; the counter shows the position. The capture gives no timing, so this starter sets: a 600ms crossfade with `ease`, advancing every 7 seconds, paused while the hero is hovered or holds focus and while the tab is hidden. Clicking the counter or pressing the arrow keys while it has focus advances by one.
- **Arrow nudge.** 3px over 160ms `ease-out` on hover.

**The Reduced Motion Rule.** Under `prefers-reduced-motion: reduce`, the hero does not advance on its own, changes cut without a fade, and the arrow does not move.

## Imagery and assets

- **Drawn by code.** Everything except the hero photographs. Specimens are live text in a web font, never images of text. Rules, the arrow (a text character), the counter and the size control are text and CSS. The 12px outlined glyphs (full screen, close, menu) are inline SVG with a 1px stroke in `currentColor`. The rotation is a small script.
- **Needs source photography.** One full-bleed photograph per featured item; the capture shows five. Each is an atmospheric close-up of refracted light: water droplets on glass, light through a prism or a glass block, caustics on a surface, with saturated green, yellow, blue or red. Real, licensed, shot at least 2560 by 1440 and cropped for both landscape and portrait viewports. No people, no products, no text in the image. The top-left, top-right and bottom-left areas sit under white type, so they must stay dark or deep in tone; reject any image where white 12px text would not read.
- **Would be generated.** Without photography, generate the same brief: a macro photograph of water droplets on dark glass refracting prismatic green and yellow light, shallow depth of field, dark lower-left third, no text. Generate one per featured item with a different dominant colour each, then check white text over the three type areas in a browser before shipping. Specimens and glyphs are never generated.

The site carries no other imagery: no product shots, no lifestyle images, no decorative icons.

## Do's and Don'ts

- Do keep every corner at 0px.
- Do set all interface text at weight 400 and let size carry hierarchy.
- Do track small text: 0.025em to 0.08em under 16px, and leave the specimen untracked.
- Do keep surfaces white with black text; separate with a 1px Rule or List rule, never a fill.
- Do end text links with a space and a right arrow instead of styling them as buttons.
- Do let one photograph per hero slide be the only colour on the page.
- Do set specimens as live text in the face they show.
- Don't add an accent colour, a tint or a coloured icon.
- Don't use shadows, gradients, blur or overlays, including on the hero photograph.
- Don't use bold anywhere.
- Don't round a corner, even by 4px.
- Don't fill cards or the top bar.
- Don't set reading text below 14px; 11 and 12px are for labels and meta only.
- Don't add card grids, pricing tables or multi-column feature blocks.
