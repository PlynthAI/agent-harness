# Map chrome composition

Use this for layer trees, toolbars, drawing controls, legends, floating overlays
and responsive coexistence.

## Layer panel

- Keep one coordinate system across the tree: section chevrons and row controls
  occupy the control gutter; labels begin at one measured text gutter; counts and
  actions align to stable trailing columns.
- Group by user task or map meaning, not by implementation module.
- Use collapsible sections with active counts, so a closed group still
  communicates state.
- Prefer an accessible title, tooltip or disclosure over a visible caption in a
  dense row. A caption is allowed only when it changes the user's decision and
  cannot be recovered elsewhere.
- Preserve selected, loading, unavailable, error and zoom-limited states. A
  disabled control explains why, and how the thing becomes available.

## Toolbar and drawing tools

- Place the primary drawing group on a stable map edge or a bottom-centre anchor.
  Do not let it chase transient popups or reflow when a count appears.
- Group mutually exclusive modes together and expose the active mode with a
  persistent shape or fill plus a pressed state. Keep pan and select distinct from
  draw creation when that reduces mode errors.
- Separate destructive actions with spacing or a divider and label them
  explicitly. Never place clear-all where a mode mis-click is likely.
- Icon buttons keep accessible names and visible focus. A shortcut supplements a
  label; it does not replace one.
- Meet the project's target-size floor even when the visible icon stays compact.
  Do not scale a toolbar until its hit areas fall below that floor.

## Legends and state coupling

- Derive legend entries from enabled layer state, and remove an entry when its
  layer is hidden.
- Keep symbols adjacent to complete labels, and include units, range endpoints,
  categories and missing or suppressed meaning where relevant.
- Route geographic colour scales, class breaks, comparison integrity and the
  accessible ranked alternative to `design/data-visualization`.
- Position the legend near its owning layer controls without covering the
  geography in focus. On a narrow map, collapse or dock it before allowing
  overlap.

## Overlay placement and coexistence

Map chrome competes with the feature in focus, attribution, navigation controls,
selection panels and neighbouring panes. Plan the collisions before adding
another floating surface:

1. Mark the selected feature and the active drawing handles as protected.
2. Reserve map-edge zones for navigation, layers, attribution and the primary
   toolbar.
3. Stack transient information by workflow priority rather than by z-index.
4. Reflow, dock or collapse the lower-priority overlays as the safe map area
   shrinks; never cover the protected target.
5. Verify the project's supported widths and keyboard and touch modes, plus the
   empty, dense, loading, error and theme states.

## Verification

- Confirm each tool has a stable hit area, an accessible name, a focus state and a
  redundant active state.
- Confirm the legend matches the visible layers and the grain of the data.
- Confirm pan, zoom, hover, drag, draw and layer toggling stay responsive under
  the project's performance gate.
- Record which of these were actually observed and which were not.
