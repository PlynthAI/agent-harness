---
version: "2026.09"
name: __PROJECT_NAME__
description: "This project's design authority: the design library's Kit profile, applied by the harness project copier. The design library's own portable foundation. A monochrome, type-led starting point for new projects, with colour kept for status."
colors:
  primary: "{colors.ink}"
  ink: "#0A0A0A"
  ink-2: "#585858"
  ink-3: "#737373"
  background: "#FAFAFA"
  surface: "#FFFFFF"
  surface-2: "#F4F4F4"
  line: "#E5E5E5"
  line-strong: "#D4D4D4"
  line-bold: "#737373"
  accent: "#0A0A0A"
  on-accent: "#FFFFFF"
  danger: "#DD2D34"
  danger-ink: "#B31321"
  danger-soft: "#FFF4F3"
  warning: "#D38A00"
  warning-ink: "#845500"
  warning-soft: "#FFF5E9"
  success: "#049544"
  success-ink: "#007433"
  success-soft: "#EAFDED"
  info: "#2477E9"
  info-ink: "#0F5BBF"
  info-soft: "#F2F7FF"
typography:
  display-xl:
    fontFamily: Mona Sans
    fontSize: 64px
    fontWeight: 560
    lineHeight: 1
    letterSpacing: -0.04em
  display-lg:
    fontFamily: Mona Sans
    fontSize: 48px
    fontWeight: 560
    lineHeight: 1.04
    letterSpacing: -0.035em
  display-md:
    fontFamily: Mona Sans
    fontSize: 38px
    fontWeight: 560
    lineHeight: 1.08
    letterSpacing: -0.03em
  heading-lg:
    fontFamily: Mona Sans
    fontSize: 30px
    fontWeight: 560
    lineHeight: 1.15
    letterSpacing: -0.025em
  heading-md:
    fontFamily: Mona Sans
    fontSize: 24px
    fontWeight: 560
    lineHeight: 1.2
    letterSpacing: -0.02em
  heading-sm:
    fontFamily: Mona Sans
    fontSize: 20px
    fontWeight: 560
    lineHeight: 1.3
    letterSpacing: -0.015em
  title:
    fontFamily: Mona Sans
    fontSize: 17px
    fontWeight: 560
    lineHeight: 1.4
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Mona Sans
    fontSize: 17px
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: -0.005em
  body-md:
    fontFamily: Mona Sans
    fontSize: 15px
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: 0em
  body-sm:
    fontFamily: Mona Sans
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0em
  label-md:
    fontFamily: Mona Sans
    fontSize: 13px
    fontWeight: 520
    lineHeight: 1.25
    letterSpacing: 0em
  label-sm:
    fontFamily: Mona Sans
    fontSize: 12px
    fontWeight: 520
    lineHeight: 1.25
    letterSpacing: 0.005em
  caption:
    fontFamily: Mona Sans
    fontSize: 11px
    fontWeight: 450
    lineHeight: 1.25
    letterSpacing: 0.01em
  numeral-lg:
    fontFamily: Mona Sans
    fontSize: 48px
    fontWeight: 500
    lineHeight: 1
    letterSpacing: -0.045em
    fontVariantNumeric: tabular-nums
  numeral-md:
    fontFamily: Mona Sans
    fontSize: 30px
    fontWeight: 500
    lineHeight: 1
    letterSpacing: -0.03em
    fontVariantNumeric: tabular-nums
  mono-md:
    fontFamily: Geist Mono
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0em
    fontVariantNumeric: tabular-nums slashed-zero
  mono-sm:
    fontFamily: Geist Mono
    fontSize: 11px
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: 0em
    fontVariantNumeric: tabular-nums slashed-zero
  pixel:
    fontFamily: Geist Pixel
    fontSize: 48px
    fontWeight: 400
    lineHeight: 1
    letterSpacing: 0em
rounded:
  xs: 4px
  sm: 6px
  md: 8px
  lg: 12px
  xl: 16px
  2xl: 24px
  pill: 999px
spacing:
  "1": 4px
  "2": 8px
  "3": 12px
  "4": 16px
  "5": 20px
  "6": 24px
  "8": 32px
  "10": 40px
  "12": 48px
  "16": 64px
  "20": 80px
  "24": 96px
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.md}"
  button-danger:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.surface}"
    rounded: "{rounded.md}"
  input:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.md}"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.xl}"
  list-item-hover:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.ink}"
  text-on-surface:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
  secondary-text-on-surface:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-2}"
  tertiary-text-on-background:
    backgroundColor: "{colors.background}"
    textColor: "{colors.ink-3}"
  badge-success:
    backgroundColor: "{colors.success-soft}"
    textColor: "{colors.success-ink}"
  badge-warning:
    backgroundColor: "{colors.warning-soft}"
    textColor: "{colors.warning-ink}"
  badge-danger:
    backgroundColor: "{colors.danger-soft}"
    textColor: "{colors.danger-ink}"
  badge-info:
    backgroundColor: "{colors.info-soft}"
    textColor: "{colors.info-ink}"
---

# Kit

## Overview

The design library's own foundation, and the starting point for any new project. It is deliberately plain: a grey scale, one type family, a mono for figures and code, and colour kept back for status. A project makes it its own by changing three things (the sans face, the accent and the radius), not by adding more.

Quiet, exact and generous. Structure comes from alignment, space and a hairline, not from colour or boxes. Every surface should look finished with no accent at all.

Character, voice, references and the reasons behind them live in the Kit's `SOUL.md`, beside this file in the design library (`foundations/kit/SOUL.md`). This file holds the rules and the declared token contract the library checks.

Source of truth for values: `tokens.css` (variables, light and dark) and `type.css` (type roles). This file records intent and the declared contract. A new project takes the Kit by applying the library's `kit` profile, which copies this file (with the project's name), both CSS files and the generated role bridge (`profiles/kit/role-bridge.css`); the project imports the CSS files rather than pasting them into its global CSS.

## Colors

Two layers. Primitives are fixed scales: a 14-step pure grey and six hues (red, amber, green, teal, blue, violet) at nine steps. Every hue has the same OKLCH lightness at the same step, so `green-600` and `red-600` carry equal visual weight and swap cleanly. Components never use primitives directly; they paint with the semantic layer, and dark mode redefines only that layer.

- **Primary (#0A0A0A):** An alias of Ink, declared because the DESIGN.md format expects a primary. The Kit's primary colour is ink, not the accent.
- **Ink (#0A0A0A):** Primary text, icons, primary actions and the subject series of a chart.
- **Ink 2 (#585858):** Secondary text and body copy under a heading. 7:1 on surface.
- **Ink 3 (#737373):** Tertiary text: captions, axis labels, metadata. The lightest grey allowed for text (4.7:1 on surface).
- **Background (#FAFAFA):** The page.
- **Surface (#FFFFFF):** Cards, panels, menus and inputs.
- **Surface 2 (#F4F4F4):** Wells, hover fills and chart tracks.
- **Line (#E5E5E5):** Hairlines between and around things. 1.3:1 on surface and 1.2:1 on background; dark (#2E2E2E) 1.4:1 and 1.5:1.
- **Line strong (#D4D4D4):** Input borders and dividers that must read at a glance. 1.5:1 on surface and 1.4:1 on background; dark (#404040) 1.8:1 and 1.9:1.
- **Line bold (#737373):** A line that carries meaning or state: a selected edge, a strong divider, a reference line. The one line that clears the 3:1 non-text minimum in both modes: 4.7:1 on surface and 4.5:1 on background; dark (#737373, the same step) 3.9:1 and 4.2:1.
- **Accent (#0A0A0A):** The accent is ink until a project chooses one hue. Point `--accent` at a single primitive step; never introduce a second accent.
- **Danger (#DD2D34):** Destructive actions and errors. Paired with danger ink for text and danger soft for backgrounds.
- **Warning (#D38A00):** Caution and degraded states.
- **Success (#049544):** Completion and healthy states.
- **Info (#2477E9):** Neutral system information.

Rules:

- Colour always means something. A hue that does not signal status or the project accent is decoration and is removed.
- Status is never colour alone: pair it with an icon, a word or a position.
- Text greys stop at Ink 3. Anything lighter is for disabled states and decoration.
- Lines come in three weights. Line is the hairline and stays the default for structure. Line strong is for edges that should read at a glance but carry no meaning on their own. Line bold is for a line someone has to see to understand the page, such as a selected edge, a strong divider or a reference line; Line and Line strong never carry state alone.
- Status text uses the ink step and status backgrounds the soft step. The solid step is for marks and fills; warning in particular is too light for text on a surface.

## Typography

- **Sans: Mona Sans** (GitHub, OFL-1.1). A variable grotesk with a width axis, so one family covers interface text and wider display settings. Chosen over Inter and Geist to stay distinct from the most common product faces.
- **Mono: Geist Mono** (Vercel, OFL-1.1). Figures, code, identifiers and tabular data, with slashed zero.
- **Pixel: Geist Pixel** (Vercel, OFL-1.1). An accent for a mark, a wordmark or one hero figure. Never for reading.

The roles in the front matter map one to one to the classes in `type.css` (`t-display-xl` to `t-pixel`). Use the role, not a size, so a project can retune the scale in one place. `fontVariantNumeric` records the numeric features `type.css` sets on the numeral and mono roles.

Rules:

- Sentence case everywhere. No role sets capitals; small text is tracked slightly open instead.
- Two weights do most of the work: 400 for reading and 560 for headings and labels.
- Numbers in tables, metrics and charts use tabular figures.
- Headlines balance their lines; paragraphs avoid orphans (`text-wrap: balance` and `pretty`).

## Layout

Space comes from one scale on a 4px base: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80 and 96 (`--space-1` to `--space-24`; the token name is the multiple of four). The steps widen as they grow, and there is nothing in between. The lower steps space the parts of a component; the upper steps separate groups and sections.

Density is generous by default: reading text is 15px at a 1.6 line height, and space rather than boxes shows what belongs together. A project that needs a denser surface moves down the same scale; it does not add off-scale values.

The Kit sets no column grid, content width or breakpoints. Those belong to the project that adopts it.

## Elevation & Depth

Depth is quiet. Layers are told apart by tone first: the page is Background, content sits on Surface, and wells sit in Surface 2. Panels are separated by a hairline first and a shadow second.

Shadows are soft and low, in four steps (`--shadow-xs` to `--shadow-lg` in `tokens.css`). Use the smallest step that separates the layer. Dark mode adds a faint top light instead of a darker shadow, because shadows barely read on dark.

## Shapes

Radii run 4, 6, 8, 12, 16, 24 and pill (`rounded.xs` to `rounded.pill`). Controls use 8, cards 16. A project that changes the radius changes both together, so the relationship between controls and cards holds.

## Motion

Short and settled: 120ms for hover and press, 200ms for most transitions, 360ms for panels and sheets, easing out. Everything honours reduced motion.

Values live in `tokens.css` (`--duration-fast`, `--duration-base`, `--duration-slow` and the `--ease-*` curves). The DESIGN.md format has no motion tokens or section, so this is kept as an extra section beside the other foundations.

## Components

- **Buttons:** The primary button fills with the accent and sets its label in On accent. The danger button fills with Danger. Both use the control radius (8).
- **Inputs:** Surface fill, a Line strong border and the control radius. WCAG 1.4.11 asks 3:1 only for a boundary needed to identify the control; every field has a visible label, so the Line strong border (about 1.5:1 in light, 1.8:1 in dark) is a deliberate exception for a quiet look. The owner decided this on 11 October 2026.
- **Cards and panels:** Surface fill, a Line hairline and the card radius (16). Use a card for a repeated item, not to wrap a section.
- **Lists:** A row on hover fills with Surface 2; its text stays Ink.
- **Badges:** One per status, set in the status ink on the status soft background, always with a word.
- **Focus:** Keyboard focus shows one flag, never two. A control with its own border (a field, an outline button, a card, a choice card) shows focus by turning that border Ink, with its fill unchanged. A switch track counts as a bordered control, so its focus is its edge turning Ink, drawn inside the track, while its fill keeps saying on or off; the owner decided this on 11 October 2026. An unbordered control shows focus as a solid fill, never an outline: the focused element takes a tint of the accent over its surface. Where that fill is too faint to find on its surface (a dense, flat surface such as a strip of figures), a 2px ink rule along one edge replaces the fill: focus is the fill or the rule, never both. Whichever it is, it must be visible against both hover and selected states. The one exception is forced-colours mode (Windows High Contrast), which repaints every fill in system colours: there keyboard focus is a 2px outline in CanvasText, set once for every entry by each profile's generated CSS (its role bridge in a project, its tokens CSS in Storybook).
- **Metrics:** A big number in the middle and small text under it. The figure is `numeral-lg` or `numeral-md` with tabular figures; the label beneath is a small role in Ink 2 or Ink 3.
- **Charts:** Monochrome first. Series 1 is always ink and is the subject; comparison series step back through the grey ramp (`--chart-2` to `--chart-5`) and are told apart by position, a direct label or a dash, not by hue. A single highlight may use `--chart-highlight`, which follows the accent. Status hues appear in a chart only when the data is itself a status. Bars share one style across a product, drawn over `--chart-track` where a track is shown.

## Do's and Don'ts

- Do make every surface look finished with no accent at all, then add the accent only where it means something.
- Do separate with alignment and space first, a hairline second and a shadow last.
- Do use the semantic tokens; never paint a component with a primitive.
- Do pair every status colour with an icon, a word or a position.
- Do use tabular figures wherever numbers line up.
- Do show focus as one flag: on a bordered control (a switch track counts as one), its border turning Ink with the fill unchanged; elsewhere, a solid tinted fill that differs from hover and selected, or, where a fill is too faint to find on its surface, a 2px ink rule in its place.
- Do honour reduced motion.
- Don't use capitals for emphasis or labels; sentence case everywhere.
- Don't draw an outline or ring for focus, a rule over a fill, or a fill inside a bordered control whose border shows focus, except in forced-colours mode, where each profile's generated CSS draws one (its role bridge in a project, its tokens CSS in Storybook).
- Don't introduce a second accent or a decorative hue.
- Don't set text lighter than Ink 3, or in a solid status hue.
- Don't set reading text in Geist Pixel.
- Don't add values between the steps of the spacing or radius scales.
- Don't leave empty cells in a grid or table. Reflow the grid, or say why a value is missing.
- Don't mix bar styles in one product.
