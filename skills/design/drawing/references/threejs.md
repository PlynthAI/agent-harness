# Three.js

Use Three.js when real geometry, projection, depth, occlusion, lighting, camera
choreography, shaders, particles or mesh-backed linework materially improve the
drawing. Inspect the installed revision, its example modules, renderer type,
WebGL or WebGPU support, loaders, post-processing passes and line libraries
before assuming any of them; availability is runtime data. Do not reduce the API
to a primitive allowlist.

## Build for drawing quality

- Choose orthographic, perspective, isometric, elevation, section or a custom
  projection from the brief: orthographic for elevations, sections, diagrams and
  controlled axonometrics; perspective when drama, foreshortening or inhabitation
  is the subject.
- Settle composition, silhouette, framing and depth hierarchy before detail.
- Separate geometry, visible silhouettes, selected feature edges, construction
  lines, tone, shadow, texture and annotations into layers, so line hierarchy is
  controllable. Do not outline every triangle.
- Prefer screen-consistent line techniques when output scale changes. WebGL
  ignores line width on most platforms, so a line hierarchy needs ribbons: a
  quad per segment whose half-width is the target pixels times world units per
  pixel from the camera. Fix the camera before building the inks.
- Use light and ambient occlusion to describe depth, not to chase generic
  photorealism; use clipped hatching, tonal planes or surface-following shader
  patterns for tone.
- Lower detail density in shadow, background and secondary regions when the
  hierarchy needs it.
- Expose camera, massing, repetition, material, light, line-weight, hatch and
  atmosphere parameters.
- Settle coordinate, layer, palette and export conventions before handing
  geometry to SVG or brush composition.

## Motion

- Drive animation from an explicit timeline or elapsed time, never frame-count
  side effects, so capture, seeking and rerendering stay deterministic. Seed
  every procedural system.
- Author three tiers: one unmistakable primary narrative move; two or three
  coordinated secondary systems; restrained ambient activity. They may overlap
  but must not peak together, and the primary move always wins.
- Give the sequence a readable arc - establish, search, select, transform,
  resolve - and test strong stills at the start, midpoint and resolved state.
- Separate camera, subject, environment and annotation state. Vary easing by
  layer to show mass and intent.
- Use instancing, buffer attributes, render targets and shaders for dense
  repeated motion rather than thousands of managed objects.
- Keep the presentation frame quiet and reserve its dimensions and label bounds
  before the first moving frame.
- Pause offscreen and on hidden documents, recover from context loss, and record
  camera keyframes, states, duration, loop points and renderer settings.
- Avoid generic technology imagery - glowing orbs, neon grids, purple fog,
  anonymous particles, uncontrolled bloom, a perpetual orbit. Particles or glow
  must stand for a defined process or evidence state.

## Foreground semantics

Render meshes and atmosphere first, then selected outlines, then labels. Keep
names, values, leaders and dimensions in a projected HTML or SVG layer unless
they must live in world space; recompute positions after camera moves and
resolve collisions at the final size. Let the scene carry the finding; a caption
confirms it. Anything revealed on hover or raycast needs keyboard access too.
