# Post-drawing design check

Run this check after rendering or revising a drawing and before presenting it
as ready. It applies to Drawing Tools output, authored SVG and inline figures
generated with the project's own code. A hook reminder starts the check; it
does not certify the result.

1. Read the project's design authority, latest user feedback and the selected
   renderer's requirements.
   State the intended use: an explanatory figure in a page, a hero, a standalone
   plate, a slide or print. Use the renderer's own validation and export commands.
2. Check output integrity. Decode the image, confirm its dimensions against the
   spec, and inspect its pixels. For SVG, check XML when exported as XML, loaded
   fonts, glyph bounds and connectors through the drawing method's SVG reference.
   A valid PNG can show a parser-error page; signatures and dimensions alone do
   not establish a valid drawing. Keep automated findings separate from visual
   judgment.
3. Render the actual consuming surface at its intended viewport or output size.
   For a page, keep the adjacent heading, prose and caption visible. Record both
   intrinsic/export dimensions and displayed dimensions, including viewBox/CSS
   scaling. Compare figure type with surrounding prose, the content hierarchy,
   panel density and empty space. Inspect the project's relevant narrow layout
   as well as desktop. For a standalone plate, slide or print, inspect that whole
   output in its intended viewing conditions.
4. If the drawing overwhelms its page, compact or recompose panels and remove
   unnecessary padding while keeping labels readable. Filling the column is not
   a sizing requirement. Avoid shrinking all text to make an oversized canvas
   fit. Deliberate large graphics remain valid when the brief and project call
   for them; there is no shared maximum width or figure-to-body-type ratio.
5. Rerender after repairs. Retain the source identity, viewport/output size,
   measurements, whole-surface capture and a short visual judgment with the
   artifact's existing evidence. The independent reviewer inspects the drawing
   in that same consuming surface. Report automated checks, contextual review
   and any remaining acceptance separately. Keep a rejected composition unresolved
   while the stated concern remains, even when model review is favourable.
   Model review does not establish user aesthetic acceptance. If the consuming
   surface is not available, retain that gap with its owner rather than claiming
   page fit.
