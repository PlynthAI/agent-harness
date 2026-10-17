---
name: map-gis-interface
description: Refine the chrome around an interactive map - layer panels, toolbars, drawing tools, legends, overlays and responsive coexistence - under the project's mapping, performance and design contracts. Use for map controls and affordances; spatial encoding belongs to design/data-visualization.
---

# Map interface

Own map chrome and affordances, not map data, colour semantics or rendering
architecture. Geographic encoding, class breaks and analytical legends route to
`design/data-visualization`. The engine, its data pipeline and the performance budget
belong to the project.

## Bind the authority

- Read the nearest `AGENTS.md` and the project's mapping rules. Performance
  constraints are authoritative and are not negotiable at the chrome layer.
- Read the design authority for surfaces, elevation and the map-specific roles.
- Read the production chrome - layer panel, toolbar, legend and overlay - and
  treat it as evidence and a reuse anchor, not as permission to copy a local
  literal or preserve a visual bug.
- Resolve the map library and the spatial-contract owner from project guidance.
  Do not assume a stack, a basemap or a data region.

## Decisions

| Concern | Decision to make |
| --- | --- |
| Layer panel | A grouped, collapsible tree with active counts at the owning group. Reveal hierarchy through indentation, not nested card chrome. |
| Density | Controls stay compact and scan-first: short labels, icon plus accessible name, and no persistent explanatory captions where a tooltip or detail panel can carry them. |
| Toolbars | Group navigation, drawing modes and destructive actions by task, with restrained separators, stable dimensions, accessible names and adequate hit areas. |
| Active tool | Show the active mode through a non-colour channel as well as colour - pressed state, shape, label - and keep persistent geography on the cartographic roles rather than the toolbar accent. |
| Placement | Pin chrome to consistent map edges and safe gutters, and keep groups clear of attribution, navigation controls, selection popups and each other at every supported size. |
| Legends | Derive legend entries from enabled layer state, and show loading, partial, stale and unavailable states rather than a legend for a hidden layer. Quantitative, categorical and geographic encoding routes to `design/data-visualization`. |
| Overlay chrome | Use the project's approved scrim and elevation tokens only where a floating surface needs map legibility, and never obscure the feature in focus. |
| Coexistence | Keep the map spatial while denser textual panes stay dense. Chrome may support selection and workflow without competing with the geography through saturated fills or excess framing. |
| Basemap | Keep basemap choice, opacity and state legible as one control family, and do not tint persistent cartography with an action colour. |
| Performance | Chrome adds no expensive hover or move work, no request storm, no duplicated layers and no remount during pan, zoom, drag or draw. A visual polish pass is not complete if interaction became heavier. |

## References

- [references/composition.md](references/composition.md) - layer tree, toolbar,
  legend, overlay placement, collision plan and verification.
