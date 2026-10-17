# Routing by surface

Pick the row that matches what is actually changing. The capability is what the
task needs. Each row names a method that is present in this environment today and,
separately, the shared leaf that covers that surface.

The [staged workflow](workflow.md) orders light-brief development, composition
and typography, refinement and independent review. This table selects craft
methods within those passes. Identify relevant rows early, then load their
detail when needed; constraints that affect composition are read before building.

The shared leaves `design/app-ui`, `design/marketing`, `design/components`,
`design/data-visualization`, `design/ai-chat-interface`, `design/map-gis-interface`,
`design/motion`, `design/review`, `design/colour`, `design/prototype`,
`design/mobile-native`, `design/drawing`, `design/video`, `design/ideate`, `design/audit`
and `design/ux-research` all ship beside this router.
Every method is nested in the design skill: `design/<name>` is the design skill's
`<name>/METHOD.md`, so a session's skill list shows only `design` and this table
is the way in. A method resolves only when its folder is installed, and a missing
method is never a failure: the method present today - or the project's own
equivalent - is the method, and the unavailable method is reported rather than
invented. A project names its own leaves in its router.

`design/prototype` also handles logic/state experiments through its logic
reference. Such a question can invoke it directly without entering this visual
router or loading visual guidance.

| Surface changing | Reach for | Shared leaf | If none is available |
| --- | --- | --- | --- |
| page or route composition, hierarchy, responsive layout, accessibility | `design/layout` for grouping, alignment, spacing and adaptive structure; the `design/app-ui` typography reference for font, scale and wrap; the `design/app-ui` polish reference for control-level detail | [design/app-ui](../app-ui/METHOD.md) | the project design authority and its existing tokens |
| marketing pages, landing pages, editorial or campaign surfaces | `design/marketing` and its page playbook for the argument and section order; `design/layout` and the `design/app-ui` typography reference for composition; `design/sourcing` for relevant approved references; `design/drawing` when the page carries figures. Direction follows the staged workflow; explicit Impeccable commands keep their own contract | [design/marketing](../marketing/METHOD.md) | the project design authority and its existing page patterns |
| choosing, composing or adapting a component | the project's component catalogue and its own leaf; `design/sourcing` when a library, block or effect has to be chosen or retrieved from the design library's sources catalogue; `design/shadcn` where the project builds on that library; the `design/app-ui` polish reference for control-level detail | [design/components](../components/METHOD.md) | the closest existing production component |
| visual alternatives for a component or page | `design/prototype` with its visual reference when comparing directions; `design/ideate` first when the directions should be quick pictures before any code; skip when implementing an accepted direction | [design/prototype](../prototype/METHOD.md) | project guidance and a minimal local comparison; report the unavailable method |
| visual directions, concepts or remixes for a screen, feature or product idea, generated as images before anything is built | `design/ideate`, then the rows the chosen direction touches; `design/prototype` when the directions must be compared as working code | [design/ideate](../ideate/METHOD.md) | written directions and quick HTML or SVG comps through the project's prototype route or an artifact; report that no image tool was available |
| mobile-web viewport, keyboard, touch and browser behaviour | `design/mobile-native`, selecting the browser concerns this change touches; native-app frameworks use their own project methods | [design/mobile-native](../mobile-native/METHOD.md) | the project's mobile-browser guidance and honest device evidence |
| charts, numeric tables, uncertainty, data-shaped visuals | the project's data-visualisation contract; `design/colour` when a categorical or sequential ramp has to be chosen or checked | [design/data-visualization](../data-visualization/METHOD.md) | the project chart contract and its design authority |
| chat, streaming or composer surfaces | the project's chat leaf | [design/ai-chat-interface](../ai-chat-interface/METHOD.md) | the project chat contract and the real API capabilities |
| interactive maps, layers, selection, drawing | the project's map leaf; `design/colour` when map roles or legend ramps have to be chosen or checked | [design/map-gis-interface](../map-gis-interface/METHOD.md) | the project mapping contract |
| transitions, gestures, reveals, motion review | the `design/motion` craft, gesture and review references, disclosed one at a time | [design/motion](../motion/METHOD.md) | the project motion tokens |
| type scale, wrapping, optical alignment | the `design/app-ui` typography reference | none planned | the project type tokens |
| palette, contrast, gamut | `design/colour`, on any surface | [design/colour](../colour/METHOD.md) | the project palette and its semantic roles |
| whole-surface polish or a design critique | `design/impeccable` for a full critique, polish pass or live visual iteration; the `design/marketing` checks for marketing and editorial surfaces; the `design/app-ui` polish reference for control-level detail | none planned | the project design authority |
| an unfamiliar effect that needs a name | the `design/motion` vocabulary reference | none planned | describe the effect in plain words |
| a fixed interface diff under review | `design/review` with any project supplement; also use it for the early representative checkpoint and final artifact review | [design/review](../review/METHOD.md) | the project's review rules and available contextual renders; report missing visual coverage |
| an audit of a live product flow: onboarding, checkout, settings, a journey or any multi-step path | `design/audit`, with `browser-verification` supplying the captures and the `design/review` lenses and `design/impeccable` critique reference supplying the judgement | [design/audit](../audit/METHOD.md) | captures from whatever browser route exists, judged against the project's review rules; a flow that cannot be reached is reported, not audited |
| what users complain about or report about a named product: reviews, forums, support threads, issue trackers | `design/ux-research`, with the shared `research` skill's retrieval method | [design/ux-research](../ux-research/METHOD.md) | the `research` skill's method with a source log; report the unavailable method |
| a whole-site motion audit | the `design/motion` audit reference, for that audit only | none planned | if such an audit is required without the method, scope it with the project authority and say the method was unavailable |
| illustration, technical drawings, diagrams and generative artwork | `design/drawing`, with the project's drawing style and its renderer (the drawing tool and tag the project pins, listed in the library's `DESIGN_SYSTEM.md`), disclosing only the medium references the drawing uses; `design/colour` for the palette | [design/drawing](../drawing/METHOD.md) | the project's drawing guidance and its existing renderer; report the unavailable method |
| launch, product, demo, concept and explainer videos, motion graphics and social cuts | `design/video`, and the renderer package's own skills where the design library's `DESIGN_SYSTEM.md` stores them; `design/drawing` instead when the film is drawn | [design/video](../video/METHOD.md) | the project's brand rules and an honest storyboard; report the unavailable method |
| 3D models, scenes, materials and renders | the project's own 3D guidance and scene tooling; a shared 3D method only once a second project shows what is shared | none planned | the project's 3D guidance, originals kept untouched and honest render evidence |
| taste and aesthetic judgement: why a design works, or why it feels generic or derivative | the design library's taste knowledge through its own agent guide, concepts first and readings only when an argument matters | none planned | reason from the project authority and the work itself, and say what is judgement rather than evidence |

Rules that keep the table from becoming a stack:

- Methods follow the surfaces the change actually touches. A reader-page spacing
  fix may open one method and nothing else; a dashboard that introduces a chart,
  a type scale, a palette shift and a reveal shows four surfaces, so four
  methods cover it. The examples show the shape of the choice rather than a
  required count, and there is no catalogue to open.
- Colour is the one method every surface shares. A chart, a map, a marketing page
  and an application screen all resolve their palette, token and contrast
  questions through `design/colour`, and a second colour method beside it would
  be the duplicate this table exists to prevent.
- The project outranks the method. Where a method and the project authority
  disagree, the project wins, and the disagreement is recorded where the project
  keeps decisions.
- Third-party examples and deep dives are inputs, not authority. They may suggest
  a pattern; they do not override project identity or an approved design.
- A missing method is reported, never filled by inventing a path or installing
  something. Adding a dependency or a skill is separate, approved work.
- Visual work receives independent design review within the existing review
  route, including when no project-specific lens exists. It does not repeat a
  full code review or require an Impeccable critique at every stage.
- Selection is not completion. The stages hold whatever the task loads - enter
  through the project's own router, implement with the methods the real change
  needs, verify in the surface that changed and review the fixed candidate
  before the slice is accepted. The table chooses methods; it replaces neither a
  check nor a review.
