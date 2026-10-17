---
version: alpha
name: <Project name>
description: <One sentence on the product and the feel of its interface.>
# omitted lists token groups the project has no need of, so the linter does not
# warn about them. Delete a group below and name it here instead:
# omitted:
#   - section: rounded
#     reason: <Why the project has no rounded corners.>
colors:
  # primary is required; the linter always warns without it. Use token names
  # the project already ships, and values from its CSS, theme or token file.
  primary: "<#RRGGBB>"
  on-primary: "<#RRGGBB>"
  surface: "<#RRGGBB>"
  on-surface: "<#RRGGBB>"
typography:
  headline-lg:
    fontFamily: <Font family>
    fontSize: <px or rem>
    fontWeight: <number>
    lineHeight: <unitless or px>
  body-md:
    fontFamily: <Font family>
    fontSize: <px or rem>
    fontWeight: <number>
    lineHeight: <unitless or px>
rounded:
  sm: <px>
  md: <px>
spacing:
  sm: <px>
  md: <px>
  lg: <px>
components:
  # A component maps properties to literal values or {group.token} references.
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.md}"
    padding: "{spacing.md}"
---

<!--
The project's design authority, in the Google DESIGN.md format (version alpha):
https://github.com/google-labs-code/design.md/blob/main/docs/spec.md
One complete file at the repository root. Front matter must stay the first thing
in the file. Values come from what the project ships or has approved; never
invent one to fill a slot.
Pointers to a library profile, drawing theme, component index, Figma file or
token file belong in PROJECT.md's design row, not here. Motion, shadows and
breakpoints go in prose or the Impeccable sidecar, never as top-level keys.
Do not add fenced yaml blocks to the body: the linter merges them as tokens.
A token group the project lacks goes under omitted rather than staying empty.
Check with: npx designmd lint DESIGN.md
Delete this comment and the placeholder comments once the file is filled.
-->

# <Project name>

## Overview

<Who uses the product, which surfaces this file covers and the feel the
interface should have: calm or lively, dense or spacious.>

## Colors

<Each colour token by role: what it is for and where it must not be used.
Name the palette in words; the front matter holds the values.>

## Typography

<The families and levels in use, what each level is for and any casing or
numeral rules.>

## Layout

<The grid or layout model, content widths, the spacing scale and how it is
applied. Breakpoints are described here in prose.>

## Elevation & Depth

<How hierarchy is shown: shadows, tonal layers, borders or contrast. Shadow
values are described here in prose, not as tokens.>

## Shapes

<The corner and shape language and where each rounded token applies.>

## Components

<The core components, their variants and states, and which tokens they use.
Motion and interaction timing are described here or in the Impeccable sidecar.>

## Do's and Don'ts

<Practical guardrails, one line each, starting with Do or Don't.>
