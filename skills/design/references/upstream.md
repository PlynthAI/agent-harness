# Third-party design sources

How this router keeps the third-party design sources it carries. Each one was
checked against its official repository - not a summary of it - pinned at the
commit it was taken from, and recorded with the licence that repository declares.
Provenance is established once per source. An upstream update is reviewed as a
source change; it is never installed on its own.

The source pins and required terms are in the harness root
[third-party notices](../../../THIRD_PARTY_NOTICES.md). A tracked package with a
mechanical departure also ships the script that reapplies it and a check against
a throwaway copy. Owned prose can credit a source in the method it adapts.

## Carried in this library

| Source | Official repository and pin | Licence | Carried as |
| --- | --- | --- | --- |
| `impeccable` | pbakaus/impeccable, skill 4.3.1 on engine 0.1.5, https://github.com/pbakaus/impeccable | root notice | `design/impeccable`, the one package this library tracks against an upstream; a reapplication script lives under `config/port-adaptations`, and `config/deploy.ps1` fetches the pinned engine against the hashes in `config/install-map.json` |
| `modern-screenshot` | qq15725/modern-screenshot, vendored within Impeccable 4.3.1; bundled hash in root notice | MIT, root notice | design/impeccable/scripts/modern-screenshot.umd.js, screenshot capture library |
| `shadcn` | shadcn/ui, https://ui.shadcn.com | root notice | `design/shadcn`, a method for projects that build on that library, subordinate to the project authority and to the shared component method |
| `better-colors` | jakubkrehel/skills at `267330e1adfc66a718fb65fa6918c1f06d0a689e` | MIT, root notice | `design/colour`, the colour entrypoint every surface routes to |
| `better-typography` | jakubkrehel/skills at `267330e1adfc66a718fb65fa6918c1f06d0a689e` | MIT, root notice | the `design/app-ui` typography reference |
| `typeui-fundamentals` | bergside/typeui, its fundamentals method, at `2a977f1f6616ae8a5ea84a478ca35601c67f4322` | MIT, root notice | the same `design/app-ui` typography reference, which combines this method's hierarchy and accessibility guidance with the typography method above |
| `better-ui` | jakubkrehel/skills at `267330e1adfc66a718fb65fa6918c1f06d0a689e` | MIT, root notice | the `design/app-ui` polish reference, for control-level detail |
| `better-layout` | jakubkrehel/skills at `267330e1adfc66a718fb65fa6918c1f06d0a689e` | MIT, root notice | `design/layout`, its own method |
| `pick-ui-library` | emilkowalski/skills at `85e8e2363b713506e1d5b6e07a0eb2da66be1bc3` | MIT, root notice | `design/sourcing`, reading the design library's sources catalogue |
| `prototype` | emilkowalski/skills at `85e8e2363b713506e1d5b6e07a0eb2da66be1bc3` and mattpocock/skills at `c55ee46073ed923f86ce59a5eb3b6d895095d1b7` | both MIT, root notice | `design/prototype`, one entrypoint over visual and logic modes |
| `mobile-native` | emilkowalski/skills at `85e8e2363b713506e1d5b6e07a0eb2da66be1bc3` | MIT, root notice | `design/mobile-native`, the mobile-web platform layer |
| `emil-design-eng` | emilkowalski/skills at `85e8e2363b713506e1d5b6e07a0eb2da66be1bc3` | MIT, root notice | the `design/motion` craft reference |
| `review-animations` | emilkowalski/skills at `85e8e2363b713506e1d5b6e07a0eb2da66be1bc3` | MIT, root notice | the `design/motion` review reference |
| `improve-animations` | emilkowalski/skills at `85e8e2363b713506e1d5b6e07a0eb2da66be1bc3` | MIT, root notice | the `design/motion` audit reference, loaded for that audit only |
| `animation-vocabulary` | emilkowalski/skills at `85e8e2363b713506e1d5b6e07a0eb2da66be1bc3` | MIT, root notice | the `design/motion` vocabulary reference |
| `apple-design` | emilkowalski/skills at `85e8e2363b713506e1d5b6e07a0eb2da66be1bc3` | MIT, root notice | the `design/motion` gesture reference |
| `taste-skill`, selected methods and helpers | Leonxlnx/taste-skill at `a60a36dc2bb3bb77ccf17f2f62041f5ca8a458b9`, https://github.com/Leonxlnx/taste-skill | MIT, root notice | locally maintained subject-evidence, rendered-comparison, image-provider/credit and composition-lookup adaptations under the existing workflow, ideation, review and sourcing owners; scope below |

## Selected Taste port

This selective port is separate from the historical `3c7017d` assessment below.
It carries no whole Taste package or new entrypoint. The source units are pinned
to `a60a36dc2bb3bb77ccf17f2f62041f5ca8a458b9`:

| Borrowed source unit under `skills/taste-skill/` | Local use and departure |
| --- | --- |
| `SKILL.md`: [inventory and claim/proof, lines 50-60 and 64-67](https://github.com/Leonxlnx/taste-skill/blob/a60a36dc2bb3bb77ccf17f2f62041f5ca8a458b9/skills/taste-skill/SKILL.md#L50-L67); [subject-derived idea, lines 123-145](https://github.com/Leonxlnx/taste-skill/blob/a60a36dc2bb3bb77ccf17f2f62041f5ca8a458b9/skills/taste-skill/SKILL.md#L123-L145) | [The existing brief](workflow.md#develop-the-brief) keeps concrete inventory categories, claim/proof relationships and a subject-derived idea. It separates facts, supplied claims and assumptions, drops the inventory quota and automatic section deletion, and supports application tasks and diagrams. `ideate` links the same brief. |
| [`references/critique.md`](https://github.com/Leonxlnx/taste-skill/blob/a60a36dc2bb3bb77ccf17f2f62041f5ca8a458b9/skills/taste-skill/references/critique.md) | Rendered assessment informs review evidence and calibration. Existing lenses and concern dispositions remain the owners; house-style bans, image/motion quotas, weighted scores and inspector fail caps are omitted. |
| [`evals/evals.json`, `how_to_run` and `evals[]` case fields](https://github.com/Leonxlnx/taste-skill/blob/a60a36dc2bb3bb77ccf17f2f62041f5ca8a458b9/skills/taste-skill/evals/evals.json) | The bounded comparison keeps fresh baseline/candidate contexts and blind rendered judgment. It replaces the public-site briefs with three fixed scenarios in each of Codex and Claude, retains common inputs and separate identity mapping, and uses existing rendering and repair routes. |
| [`scripts/assets.mjs`, selected constants, normalization, image dimensions, four provider adapters and credit projection](https://github.com/Leonxlnx/taste-skill/blob/a60a36dc2bb3bb77ccf17f2f62041f5ca8a458b9/skills/taste-skill/scripts/assets.mjs) | `scripts/assets.mjs` retains Openverse, Commons, Art Institute and Met image metadata with explicit selected terms and credits. Local orchestration adds injectable I/O, metadata-only inspection, an explicit working directory, strict ledger validation, SHA256 repeat handling, an owner lock and staged image/ledger writes. It requires positive Art Institute public-domain metadata and its returned IIIF route, bounds Met enrichment to 40 records, exposes provider/enrichment errors, verifies raster MIME/signatures and prints escaped full-title credits. No video, bulk acquisition or upstream runtime is carried. |
| [`scripts/draw.mjs`: `imageryMode`, `directionPool`, `dealHero`, `sectionPool`, `dealReferences`, `siteCard`](https://github.com/Leonxlnx/taste-skill/blob/a60a36dc2bb3bb77ccf17f2f62041f5ca8a458b9/skills/taste-skill/scripts/draw.mjs#L207-L415) | `scripts/compositions.mjs` adapts feasibility comparisons and summary/source projection against the library's generated references. Explicit surface, assets, content and exclusions are hard prerequisites; deterministic fit facts and ID ordering replace random dealing, assumed photography, score thresholds, pool widening and home history. Current source review remains separate from reference assessment and item qualification. Full note retrieval is selected and hash-checked; lookup writes nothing. |

The root notice records the exact helper units and local departures and retains
the complete MIT terms. This is locally maintained selective borrowing, not a
tracked whole package. The terms cover borrowed repository material, not rights
in third-party site screenshots or downloaded imagery.
The evaluation definition establishes no completed comparison, source approval
or broader adoption.

The imagery port also replaces truncated credits with complete checked
attribution, preserves unknown licence versions, and keeps credential-bearing
request URLs out of output and credits. Search probes remain bounded header
checks. Full acquisition decodes pixels with the skill's pinned Sharp package;
a narrow GIF block check rejects incomplete containers that the decoder tolerates.
The dependency retains its own licence files and follows the setup in
[imagery.md](../sourcing/references/imagery.md).

## Reviewed and deliberately not carried

| Method | Where it was reviewed | Why it stays outside this library |
| --- | --- | --- |
| `web-motion` | the personal install, 1 file | A one-file restatement of the motion rules this library already states against the project's own motion tokens. The router reaches it as an input; it is not authority. |
| `design-taste-frontend`, historical assessment | Leonxlnx/taste-skill at `3c7017d` (v2, reviewed 27 September 2026; MIT) | That assessed version was a second marketing authority of about 1,200 lines, defaulted to Tailwind and its own fonts, overrode project authority, and instructed invented figures, names and customer logos. No whole-package install or route followed. Its checkable page budget and copy self-audit were rewritten, credited, into the `design/marketing` page playbook. This is historical evidence, not an assessment of the separately selected port above. |
| `imagegen-frontend-web` | the personal install, 2 files (no longer present, 27 September 2026) | Frontend image direction for a page that leads with imagery. It produces reference imagery rather than interface, so it stays outside the design library; no row routes to it. |

## Update availability

Each row above names the repository and the commit this library's copy was taken
from, so a later comparison starts from a pin rather than a guess. The shared
notice accompanies installed skills.

Establishing provenance is a one-time step per source, not compulsory ongoing
sync. Following an upstream is a deliberate status: the design/impeccable
package is tracked; the other design methods are locally maintained.

## Rules

- A source is pinned before it is adapted or ported, and required terms are
  retained in the harness root notice shipped with installed skills.
- An upstream update is not installed, and owned prose is not replaced, until
  that particular update has been reviewed and approved by the owner.
- Owned-prose maintenance stays separate from package upgrades. A package may move
  without rewriting the method, and the method may be edited without touching a
  package.
- A source with no maintained upstream is owned prose from then on.
- A port that changes a mechanical part to work from the shared install - a path
  form, a command runner, the entrypoint's own name - ships the script that
  reapplies it when the package is tracked, so comparison remains repeatable.
- A rename is the invocation name only. A package's own CLI, module names and
  recorded source path stay as upstream writes them.
