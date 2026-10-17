# Hybrid composition

Combine media only when each has a clear role - geometry and light, precise
vector line and type, expressive texture and wash, or final compositing. Do not
add a medium to demonstrate complexity.

## Shared contract

- One canonical pixel or normalised coordinate system; record the transform
  whenever a medium works in world, `viewBox` or device coordinates.
- One colour system with explicit colour-space and background assumptions.
- One layer order, named by visual role rather than implementation.
- One seed and one export contract, with deterministic output resolution and
  pixel ratio.
- Decide straight or premultiplied alpha before compositing.
- Expose parameters at the composition boundary so a change propagates
  coherently through every medium.
- Record every capability version and asset in the final artifact.

## Common sequence

1. Establish geometry, perspective and broad light.
2. Export depth, masks, edges or projected paths.
3. Refine contours, type, patterns and annotations in vectors.
4. Add brush texture, wash, atmosphere or controlled imperfection.
5. Composite while keeping the useful source layers when the target format
   supports editability.
6. Inspect registration at edges, masks and high-contrast junctions, and check
   alignment, clipping, transparency, colour conversion and scale at full
   resolution.
