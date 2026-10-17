---
version: alpha
name: Parchment Dossier
description: A warm, near-monochrome system for technical product sites that read like an engineering field report, with line schematics, one dark band per page and tracked capital tags.
colors:
  primary: "{colors.ink}"
  paper: "#F3F1ED"
  surface: "#FFFFFF"
  ink: "#181011"
  body: "#222222"
  muted: "#666666"
  quiet: "#AAAAAA"
  line: "#D8D4D4"
  band: "#302023"
  on-band: "#FFFFFF"
  band-rule: "#291B1E"
  paper-dark: "#120C0D"
  surface-dark: "#1E1719"
  ink-dark: "#F3F1ED"
  body-dark: "#D8D4D4"
  muted-dark: "#AAAAAA"
  line-dark: "#3A3033"
typography:
  display:
    fontFamily: Inter Variable
    fontSize: 48px
    fontWeight: 400
    lineHeight: 1.1
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter Variable
    fontSize: 40px
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter Variable
    fontSize: 32px
    fontWeight: 400
    lineHeight: 1.3
    letterSpacing: -0.02em
  headline-sm:
    fontFamily: Inter Variable
    fontSize: 28px
    fontWeight: 400
    lineHeight: 1.3
    letterSpacing: -0.02em
  title:
    fontFamily: Inter Variable
    fontSize: 20px
    fontWeight: 700
    lineHeight: 1.4
  body-lg:
    fontFamily: Inter Variable
    fontSize: 17px
    fontWeight: 400
    lineHeight: 1.5
  body-md:
    fontFamily: Inter Variable
    fontSize: 15px
    fontWeight: 400
    lineHeight: 1.5
  body-sm:
    fontFamily: Inter Variable
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
  emphasis-sm:
    fontFamily: Inter Variable
    fontSize: 14px
    fontWeight: 700
    lineHeight: 1.4
  button:
    fontFamily: Inter Variable
    fontSize: 15px
    fontWeight: 400
    lineHeight: 20px
  label:
    fontFamily: Inter Variable
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: 0.1em
  caption:
    fontFamily: Inter Variable
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.4
rounded:
  sm: 4px
  md: 8px
  pill: 100px
spacing:
  page-max: 1200px
  gutter: 32px
  gutter-phone: 16px
  xs: 8px
  sm: 16px
  md: 24px
  lg: 32px
  xl: 48px
  2xl: 64px
  3xl: 80px
  4xl: 96px
  5xl: 112px
  6xl: 160px
  nav-height: 64px
  badge-y: 2px
  badge-x: 8px
  button-y: 8px
  button-x: 20px
  button-sm-y: 4px
  button-sm-x: 16px
  inset: 16px
  marker-column: 48px
  alert-max: 280px
components:
  page:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
  page-dark:
    backgroundColor: "{colors.paper-dark}"
    textColor: "{colors.ink-dark}"
    typography: "{typography.body-md}"
  nav:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
    height: "{spacing.nav-height}"
  nav-rule:
    backgroundColor: "{colors.line}"
    height: 1px
  nav-rule-dark:
    backgroundColor: "{colors.line-dark}"
    height: 1px
  wordmark:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
  display:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.display}"
  lead-in:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.muted}"
    typography: "{typography.headline-sm}"
  lead-in-dark:
    backgroundColor: "{colors.paper-dark}"
    textColor: "{colors.muted-dark}"
    typography: "{typography.headline-sm}"
  section-title:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.headline-md}"
  body-text:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.body}"
    typography: "{typography.body-lg}"
  body-text-dark:
    backgroundColor: "{colors.paper-dark}"
    textColor: "{colors.body-dark}"
    typography: "{typography.body-lg}"
  meta:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.muted}"
    typography: "{typography.caption}"
  button-pill:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    height: 36px
  button-pill-hover:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
  button-pill-dark:
    backgroundColor: "{colors.paper-dark}"
    textColor: "{colors.ink-dark}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
  button-square:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.sm}"
    height: 30px
  section-label:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
  section-label-dark:
    backgroundColor: "{colors.surface-dark}"
    textColor: "{colors.ink-dark}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.sm}"
    padding: "{spacing.md}"
  card-dark:
    backgroundColor: "{colors.surface-dark}"
    textColor: "{colors.ink-dark}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.sm}"
    padding: "{spacing.md}"
  alert-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.emphasis-sm}"
    rounded: "{rounded.sm}"
    padding: "{spacing.inset}"
    width: "{spacing.alert-max}"
  alert-body:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.muted}"
    typography: "{typography.caption}"
  glass-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: "{spacing.inset}"
  diagram-panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
  band:
    backgroundColor: "{colors.band}"
    textColor: "{colors.on-band}"
    typography: "{typography.headline-lg}"
    padding: "{spacing.3xl}"
  band-item-title:
    backgroundColor: "{colors.band}"
    textColor: "{colors.on-band}"
    typography: "{typography.title}"
  band-item-body:
    backgroundColor: "{colors.band}"
    textColor: "{colors.quiet}"
    typography: "{typography.body-md}"
  band-rule:
    backgroundColor: "{colors.band-rule}"
    height: 1px
  marker:
    backgroundColor: "{colors.quiet}"
    size: 8px
  marker-column:
    width: "{spacing.marker-column}"
  focus-ring:
    rounded: "{rounded.sm}"
---

# Parchment Dossier

## Overview

Parchment Dossier is a system for technical product and infrastructure sites that should read like an engineering field report rather than a sales page. A page runs: a quiet top bar, a split hero (statement on the left, a dot-mapped photograph on the right), sections on warm parchment that pair a line schematic with text, and one full-bleed dark band in the middle that states the problem.

The feel is measured, scientific and confident. The palette is warm neutrals only: parchment ground, white panels, a warm near-black ink and greys. Contrast comes from turning a whole section dark, never from a colour accent. One typeface carries everything in two weights, with tight tracking on large type and wide tracking on small capital tags that read like field classifications.

Key characteristics:

- Parchment ground, white panels one step above it, warm near-black ink.
- No accent hue. The single dark band, once per page, is the loudest move.
- One family, weights 400 and 700. Hierarchy comes from size; 700 is for short emphatic lines only.
- Small capital tags with 0.1em tracking, on white chips with 4px corners.
- Thin 1px line drawings for illustration; one dot-mapped photograph in the hero.
- Flat: hairlines and tone steps, with one soft shadow allowed on glass cards over the photograph.

Provenance: direction reference captured from the Pravah website, 3 October 2026. The capture is light only; the dark set below is derived for this starter.

## Colors

All neutrals, slightly warm. Each role that changes in dark carries a `-dark` token; the band and its text stay the same in both themes.

- **Paper (#F3F1ED):** The page ground everywhere except the band. Dark: `paper-dark` (#120C0D).
- **Surface (#FFFFFF):** Cards, tag chips, alert cards, diagram panels and the glass card fill. One step above paper; replaces shadows. Dark: `surface-dark` (#1E1719).
- **Ink (#181011):** Headings, nav, button outlines and text, diagram strokes, structural borders. Dark: `ink-dark` (#F3F1ED).
- **Body (#222222):** Running text in sections, a shade softer than ink. Dark: `body-dark` (#D8D4D4).
- **Muted (#666666):** The hero lead-in line, captions, timestamps, alert explanations, metadata. Dark: `muted-dark` (#AAAAAA).
- **Quiet (#AAAAAA):** Body text inside the dark band and the diamond markers. Never text on paper or surface.
- **Line (#D8D4D4):** Hairlines: the nav rule, alert card borders, light dividers. Dark: `line-dark` (#3A3033).
- **Band (#302023):** A warm aubergine near-black for the one full-bleed inversion band. The only tone with any hue in it. Same in both themes; in dark it sits as a lifted block above the darker page.
- **On band (#FFFFFF):** Headings and item titles inside the band.
- **Band rule (#291B1E):** Dividers between items in the band: ink at 30% over the band, flattened to a solid value. Deliberately faint.

`primary` aliases Ink. There is no action colour: buttons are outlined in ink.

Accessibility corrections to the capture. The capture sets the hero lead-in and alert explanations in #AAAAAA, which measures 2.1:1 on paper and 2.3:1 on white. This starter uses Muted for both (5.1:1 on paper, 5.7:1 on white) and keeps Quiet for the band, where it reaches 6.7:1.

Measured contrast (WCAG): ink on paper 16.6, body on paper 14.1, muted on paper 5.1, muted on surface 5.7, on band (white) on band 15.5, quiet on band 6.7. Dark: ink on paper 17.2, body 13.2, muted 8.3, muted on surface 7.6. Line and band rule are hairline colours and never carry text.

Theme mechanics: dark applies under `prefers-color-scheme: dark` unless the root carries `data-theme="light"`; `data-theme="dark"` forces it. Set `color-scheme: dark` in dark.

## Typography

One family, Inter Variable (see Fonts), weights 400 and 700 only. Large type is set tight; small tags are set wide and in capitals.

- **Display** (`display`): the hero statement. 48px, 400, line height 1.1, tracking -0.02em. Stays at 400; size makes it the headline.
- **Headline large** (`headline-lg`): the band heading. 40px, 400, line height 1.2, tracking -0.02em.
- **Headline** (`headline-md`): section titles. 32px, 400, line height 1.3, tracking -0.02em.
- **Headline small** (`headline-sm`): the hero lead-in line above the display, in Muted. 28px, 400, line height 1.3, tracking -0.02em.
- **Title** (`title`): item headings in the band and other short emphatic lines. 20px, 700, line height 1.4.
- **Body large** (`body-lg`): section paragraphs. 17px, 400, line height 1.5.
- **Body** (`body-md`): the page default and band item text. 15px, 400, line height 1.5.
- **Body small** (`body-sm`): nav links, card text, glass card text, the square button. 14px, 400, line height 1.5.
- **Emphasis small** (`emphasis-sm`): alert and glass card titles. 14px, 700, line height 1.4.
- **Button** (`button`): pill button text. 15px, 400.
- **Label** (`label`): section tags and status tags. 12px, 400, tracking 0.1em, uppercase through `text-transform`, never typed in capitals.
- **Caption** (`caption`): alert explanations, timestamps, metadata. 12px, 400, line height 1.4, sentence case.

Rules: every size 28px and above takes -0.02em; every capital tag at 12px takes 0.1em; nothing else is tracked. Weight 700 never sets a paragraph. Headings balance (`text-wrap: balance`), paragraphs avoid orphans (`text-wrap: pretty`). Sentence case everywhere except the label role.

## Fonts

The face comes from the design skill's `references/fonts.md` and loads with the load line given there.

- **ABC Favorit** (Dinamo, commercial), captured as "ABCfavorit Book" with stylistic sets `ss04` and `ss11` on. The closest face in the catalogue: **Inter Variable** (SIL Open Font License), the nearest grotesque construction, with open apertures, both weights the system uses (400 and 700) and tabular figures; load `{ "type": "npm", "package": "@fontsource-variable/inter" }`, stack `"Inter Variable", ui-sans-serif, sans-serif`. Do not carry `ss04` and `ss11` to Inter Variable: they are Favorit's alternates and select unrelated glyphs in another face. Where a project wants more of Favorit's quirks than its structure, **Space Grotesk Variable** from the same catalogue is the other close face.
- The look rests on this one family doing all the expressive work, so the exact result needs ABC Favorit from Dinamo, to licence. A project that licenses it swaps the `fontFamily` values and turns the two sets back on.

## Layout

Content sits in a centred column 1200px wide (`page-max`) with 32px gutters (`gutter`), 16px on a phone. Spacing runs on an 8px unit: 8, 16, 24, 32, 48, 64, 80, 96, 112 and 160.

1. **Top bar.** 64px tall, no fill, a 1px Line rule along the bottom. Wordmark on the left, three or four text links in the middle 12 to 16px apart, the pill button on the right. Not sticky.
2. **Hero.** Two columns: text 45%, image 55%. Left: the lead-in line in Muted, the display statement in Ink below it, then the pill button. Right: the dot-mapped photograph, full height of the hero and bleeding to the right edge, with one or two glass cards floating on it.
3. **Sections.** 64 to 80px of vertical padding (`2xl` to `3xl`). Two patterns: a square diagram panel on the left with text on the right, or two equal columns of items. Each section opens with a tag chip, then a headline.
4. **The band.** One per page, full bleed, at the midpoint: it marks the turn from introduction to problem. 80px vertical padding. A tag chip, a Headline large in On band, then two equal columns of band items.
5. Back to parchment for the remaining sections. The rhythm is unhurried: generous space between sections, no dense tables, a clear left-to-right read.

The capture is desktop only. Below 900px (chosen for this starter) the hero stacks text above image, two-column sections become one column with the diagram first, band items stack, and section padding drops to 48px.

## Elevation & Depth

Depth comes from tone, not shadow:

- **Paper** is level 0, **Surface** level 1 (cards, chips, panels), and **the band** is the inversion that resets the page's temperature.
- **Hairlines.** 1px Line for the nav rule and alert borders; Band rule between band items.
- **One exception.** The glass card over the hero photograph takes `box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15)` and `backdrop-filter: blur(8px)` on a white fill at 80% opacity (the capture gives no opacity; 80% keeps 14px ink text legible over a dark image). Nowhere else casts a shadow.

**The Flat Rule.** Off the photograph, separate layers with a tone step or a 1px line, never a shadow or blur.

## Shapes

- **4px** (`sm`): cards, tag chips, inputs, alert cards, diagram panels, the square button and the focus ring. The default.
- **8px** (`md`): the glass card only. The ceiling for any container.
- **Pill** (`pill`, 100px): the primary button only.
- **Diamonds.** Markers are squares rotated 45 degrees, 8px across.

Borders are 1px. Ink for buttons and structural outlines, Line for quiet edges. No border is thicker than 1px.

## Components

- **Wordmark.** A small diamond mark (8px) then the product name in Body, 15px, 400, Ink.
- **Pill button.** The primary action, used once in the top bar and once in the hero. Transparent fill, 1px Ink border, Ink text, Button type, padding 8px 20px, fully round. Hover (not in the capture, derived): fills Ink with Paper text over 160ms `ease-out`. In dark: Ink dark border and text, hover fills Ink dark with Paper dark text.
- **Square button.** A secondary action in dense places, where a pill would feel too soft. 1px Ink border, 4px corners, padding 4px 16px, Body small.
- **Tag chip.** White fill, 4px corners, padding 2px 8px, Label type in Ink. Marks a section ("Overview", "Method") or a status ("Critical"). Stays white inside the band. On the dark page it takes Surface dark with Ink dark text.
- **Hero text block.** Lead-in sentence in Headline small, Muted; statement in Display, Ink; 24px between them; 32px to the button. Both lines stay at 400.
- **Diagram panel.** A square or near-square panel on Surface or Paper holding a line schematic (see Imagery and assets), 4px corners, no border. Often carries one alert card overlaid near a corner.
- **Alert card.** A small white card, max 280px, 1px Line border, 4px corners, 16px padding. A tag chip, then a title in Emphasis small, then one line in Caption, Muted ("Load above threshold on line 4"). Reads as a machine status message inside the schematic.
- **Glass card.** The alert card's variant for the hero photograph: translucent white, blur and the one soft shadow (see Elevation & Depth), 8px corners, 12 to 16px padding. Title in Emphasis small, text in Body small.
- **Band item.** A two-column row: a 48px marker column holding a diamond grid, then a Title in On band over Body text in Quiet. 24px vertical padding, a 1px Band rule between items and none after the last.
- **Diamond grid.** A 3 by 3 or 4 by 4 grid of 8px diamonds, filled or outlined in Quiet (or white inside the band). A small legend-like mark for list items, echoing the dot-mapped photograph.
- **Section item (light).** The same row on parchment: Title in Ink, Body in Body colour, 1px Line rule between items.
- **Focus.** Not in the capture; added: a 2px Ink outline offset 2px with 4px corners on `:focus-visible`, On band inside the band, Ink dark in dark.

The capture records no motion. The only transition is the pill button hover above; remove it under `prefers-reduced-motion: reduce`.

## Imagery and assets

Three image types, each with a clear owner:

- **Drawn by code.** Every line schematic is inline SVG: isometric grids, utility poles and towers in outline, flow diagrams between components, drawn with 1px Ink strokes (`vector-effect: non-scaling-stroke`), no fills, no gradients, on Surface or Paper. The diamond grids, the wordmark diamond and the alert and glass cards are code too. Strokes use CSS variables so the drawings follow the theme.
- **Needs source photography.** The hero image: one real photograph of physical infrastructure (a lattice transmission tower, substation hardware, cable runs), shot or licensed dark and moody, deep purple to black. It is then dot-mapped: sampled into a grid of white dots on Band or near-black, dot size following brightness. The dot-mapping is a build or canvas script; the photograph underneath must be real and licensed. No people, no lifestyle shots, no decorative stock.
- **Would be generated.** Without a suitable photograph, generate the source image only, then dot-map it as above: a lattice transmission tower against a dark violet night sky, low angle, no text, no people, at least 2000px on the long edge. Never ship a generated image without the dot-mapping step; the pattern is what makes it read as data.

Placement: the photograph lives in the right half of the hero only. Schematics sit in square panels in feature sections. The band carries diamond grids, no images.

## Do's and Don'ts

- Do keep the palette warm-neutral: Paper, Surface, Ink, the greys and the one Band.
- Do use the band once per page, full bleed, for the problem statement.
- Do set nearly everything at 400 and keep 700 for short emphatic lines and card titles.
- Do track 28px-and-up type at -0.02em and capital tags at 0.1em.
- Do use 4px corners everywhere except the pill button (round) and the glass card (8px).
- Do separate band items with the faint Band rule, not extra space.
- Do draw schematics in 1px Ink line art with no fills.
- Don't add an accent hue. Blue, green or red breaks the field-report tone.
- Don't use shadows off the photograph, or gradients anywhere.
- Don't use a second typeface.
- Don't set paragraphs in 700.
- Don't put Band behind a component, chip or card; it is a full-bleed section colour only.
- Don't set Quiet text on Paper or Surface.
- Don't round any container beyond 8px.
