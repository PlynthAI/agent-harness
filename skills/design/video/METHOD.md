---
name: video
description: Make launch, product, feature, demo, concept and explainer videos and motion graphics as code - brief, references, storyboards, scene stills, render and director's notes. Use for any video or film request except hand-drawn drawing films, which belong to design/drawing.
---

# Video design

A good first render comes from context, not from the prompt. Everyone has the
same model; without a reference, a brand and a picked direction it falls back to
its default look - centred text on a gradient, everything fading in - and the
film could belong to anyone. This method gathers that context, fixes the story
while it is still cheap to change, and only then moves anything.

It applies to launch and product films, feature reveals, demos of an MVP or an
unbuilt concept, explainers, social cuts and short motion graphics. Pen-drawn
sheets and their films belong to `design/drawing` and the drawing tool.
Transitions inside a live interface belong to `design/motion`.

## Packages and their own skills

When a film is made with a package or tool (HyperFrames, Remotion or another
renderer), use that package's own skills. They are stored, not installed: the
design library's map, `DESIGN_SYSTEM.md`, says where. Open the package's entry
skill and only the parts the film needs. The package's skill decides how the
package works; this method and the project's design authority decide the story,
the look and the review.

The renderer is chosen per film until the owner settles on one. Record the
choice and the reason in the brief: an HTML, CSS and animation-library stack for
a film built like a web page, React components for a film built from a React
product. One film, one renderer.

## Workflow

1. **Brief.** Fill [the brief](references/brief.md): message, audience, length,
   formats, sound, the product material, the renderer and what is out of bounds.
2. **References.** Name one or two real films whose pacing, type and transitions
   this one should follow, and say what is taken from each and what is not.
   Naming a style works far better than describing one. Find them through the
   design library's sources catalogue; references are for looking, never for
   downloading or reusing footage.
3. **Context pack.** The project's design authority and soul, its library
   profile, its brand rules, the logo and lockup, the fonts, and the product
   material. Showing the real product is the normal path: captured screens and
   recorded flows. An MVP, a concept or an unbuilt feature is shown as a
   designed interface made from the project's tokens and components; the brief
   says it is a design, and the film never presents it as shipped. Never invent
   a claim, a metric, a customer or a logo.
4. **Three storyboards.** Three directions that differ in structure, not only
   in colour, in the form set out in [storyboards and stills](references/storyboard.md).
   The owner picks one; do not merge them unasked.
5. **Stills.** One frame per scene at the final size, before anything moves.
   Fix the story here: a still takes seconds to change, a render does not.
6. **Build and render.** Follow the package's skill. Preview small and fast;
   render the master only when the stills and timing are agreed.
7. **Notes.** Take and give notes as a director does, in camera and edit terms
   from [directing](references/directing.md). "Make it better" produces random
   change; "hold the product shot a beat longer, then a hard cut" produces the
   change wanted. One round of notes, one render.
8. **Review and deliver.** Check the film against the brief, the design
   authority and the brand rules; legibility at phone size; safe areas for each
   platform; a poster frame; captions or a transcript where there is speech;
   alt text and post copy. Silent masters stay silent unless the brief says
   otherwise.

## Where the work goes

The film's source lives in the project that owns it, never in the design
library or the harness. Inputs, working files and exports follow the design
assets root named in `DESIGN_SYSTEM.md`, with exports in a dated release folder.
A part that a second film needs (an end card, a device frame, a caption style)
may then become a library candidate, approved by the owner like any other.
