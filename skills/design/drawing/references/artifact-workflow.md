# Artifact workflow

## Design stack

Apply the project's base design foundation, then the selected style, then any
subject guidance, and finally the brief's own direction and references. A later
layer refines an earlier one; it never silently replaces it.

## The bundle

Each artifact keeps, beside its rendered output:

- a manifest naming the required capabilities, their versions and the output
  formats;
- the medium-neutral drawing spec;
- a parameter schema for the exposed controls;
- the recipe source that renders the spec;
- mounted assets and source material, when the drawing uses them;
- previews;
- a provenance record: brief, references, seed, capability versions, asset
  origins and preview hashes.

Create a folder only when the artifact actually uses it. Keep the bundle free of
application state, credentials and mutable network code, so it renders the same
anywhere the capabilities are installed.

## The drawing spec

Keep canvas, seed, composition, style, subject, layers and metadata
medium-neutral, with subject-specific values below the subject's own
parameters. For time-based work also record the primary narrative move, the
secondary systems, the ambient activity, duration, loop policy, camera states
and the resolved static state. Expose only the timing controls that materially
change the reading.

## Refinement

1. Render the current artifact.
2. Identify the smallest high-leverage visual changes.
3. Map them to exposed parameters where possible.
4. Change focused recipe source only when parameters cannot express the
   improvement.
5. Rerender with the same brief, references, dimensions and seed.
6. Keep both the evidence and the selected source.
7. For motion, inspect the opening, the midpoint, the transition peaks, the loop
   seam and the resolved state, not one screenshot.

## Preview integrity

A preview's file name or requested format is not proof of its encoded type.
Before a preview enters a gallery or review set:

1. Check the file signature and decode the intrinsic pixel dimensions.
2. Require them to match the spec's canvas exactly.
3. If the capture returns another format, keep the raw capture and transcode it
   without cropping or resizing.
4. Record the raw and selected preview hashes, the conversion tool and version,
   and any format mismatch in provenance.
5. Keep the first-pass preview unchanged when a refined preview replaces it as
   the selected result.

Inspect the decoded pixels for render failures, including a parser-error page
inside a correctly encoded PNG. Before presenting the drawing as ready, complete
the [post-drawing design check](post-drawing.md) in its consuming surface.

Reject only the invalid preview, not the recipe or the capability that made it.
Time, source size and cache behaviour are observations, never quality signals.
